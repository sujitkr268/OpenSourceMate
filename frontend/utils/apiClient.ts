/**
 * Typed API Client for OpenSourceMate.
 * Provides timeout control, request cancellation (aborting in-flight searches),
 * and automatic one-time retry for transient server and network errors.
 */

import {
  type GitHubUserProfile,
  type UserSkillsResponse,
  type MatchedIssuesResponse,
  type HealthResponse,
  type ApiErrorResponse,
  type CompleteAnalysisResult,
} from "../types/api";

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  signal?: AbortSignal;
}

export interface SearchOptions {
  includeForks?: boolean;
  timeoutMs?: number;
  fetchIssues?: boolean;
}

/**
 * Custom error thrown for API client errors with status codes,
 * backend error codes, and rate limit reset headers.
 */
export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly resetAt?: string;
  readonly details?: unknown;

  constructor(
    message: string,
    status: number,
    code = "API_ERROR",
    resetAt?: string,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.resetAt = resetAt;
    this.details = details;
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
}

/**
 * Thrown when an API request exceeds the configured timeout threshold.
 */
export class ApiTimeoutError extends ApiClientError {
  constructor(timeoutMs: number, url?: string) {
    super(
      `Request timed out after ${timeoutMs}ms${url ? ` (${url})` : ""}`,
      408,
      "TIMEOUT_ERROR"
    );
    this.name = "ApiTimeoutError";
    Object.setPrototypeOf(this, ApiTimeoutError.prototype);
  }
}

/**
 * Returns the base URL for the backend API based on environment configuration,
 * adhering to the convention established in Issue #1.
 */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
}

/**
 * Determines whether an error was caused by an aborted/cancelled request.
 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }
  if (error instanceof Error && (error.name === "AbortError" || error.message.includes("abort"))) {
    return true;
  }
  return false;
}

/**
 * Checks if an HTTP status code or error represents a transient failure eligible for retry.
 */
export function isTransientFailure(statusOrError: number | unknown): boolean {
  if (typeof statusOrError === "number") {
    return [408, 502, 503, 504].includes(statusOrError);
  }
  if (statusOrError instanceof TypeError) {
    // Network failures in Fetch API manifest as TypeError ("Failed to fetch" / "fetch failed")
    return true;
  }
  return false;
}

// In-flight search cancellation controller singleton
let activeSearchAbortController: AbortController | null = null;

/**
 * Cancels any currently pending profile analysis or search requests.
 */
export function cancelPendingSearch(): void {
  if (activeSearchAbortController) {
    activeSearchAbortController.abort();
    activeSearchAbortController = null;
  }
}

/**
 * Cancels any active search and creates a fresh AbortSignal for a new search.
 */
export function createSearchSignal(): AbortSignal {
  cancelPendingSearch();
  activeSearchAbortController = new AbortController();
  return activeSearchAbortController.signal;
}

/**
 * Executes a typed HTTP request with timeout, abort signal chaining,
 * and retry logic for transient errors.
 */
export async function typedRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    timeoutMs = 10000,
    retries = 1,
    retryDelayMs = 300,
    signal: userSignal,
    ...fetchOptions
  } = options;

  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith("http://") || endpoint.startsWith("https://")
    ? endpoint
    : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  let attemptsLeft = retries;

  while (true) {
    // Combine user signal and timeout signal
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      timeoutController.abort(new ApiTimeoutError(timeoutMs, url));
    }, timeoutMs);

    // Chain signals
    const internalController = new AbortController();
    const onUserAbort = () => internalController.abort(userSignal?.reason);
    const onTimeoutAbort = () => internalController.abort(timeoutController.signal.reason);

    if (userSignal) {
      if (userSignal.aborted) {
        clearTimeout(timeoutId);
        throw userSignal.reason || new DOMException("The user aborted a request.", "AbortError");
      }
      userSignal.addEventListener("abort", onUserAbort, { once: true });
    }
    timeoutController.signal.addEventListener("abort", onTimeoutAbort, { once: true });

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: internalController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Parse error response if available
        let errorData: ApiErrorResponse | null = null;
        try {
          errorData = (await response.json()) as ApiErrorResponse;
        } catch {
          // Response body was not JSON
        }

        const resetAt =
          errorData?.reset_at ||
          response.headers?.get?.("X-RateLimit-Reset") ||
          undefined;

        const errorCode =
          errorData?.error?.code ||
          (response.status === 404
            ? "NOT_FOUND"
            : response.status === 429
            ? "RATE_LIMIT_EXCEEDED"
            : "HTTP_ERROR");

        const errorMessage =
          errorData?.error?.message ||
          errorData?.detail ||
          `Request failed with status ${response.status}`;

        // Check if retryable
        if (attemptsLeft > 0 && isTransientFailure(response.status)) {
          attemptsLeft--;
          if (retryDelayMs > 0 && process.env.NODE_ENV !== "test") {
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          }
          continue;
        }

        throw new ApiClientError(
          errorMessage,
          response.status,
          errorCode,
          resetAt,
          errorData?.error?.details
        );
      }

      const data = (await response.json()) as T;
      return data;
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      // Check if it was an abort by timeout
      if (
        timeoutController.signal.aborted &&
        timeoutController.signal.reason instanceof ApiTimeoutError
      ) {
        throw timeoutController.signal.reason;
      }

      // If user aborted intentionally, do not retry
      if (userSignal?.aborted || isAbortError(err)) {
        throw err;
      }

      // Check if network error is retryable
      if (attemptsLeft > 0 && isTransientFailure(err)) {
        attemptsLeft--;
        if (retryDelayMs > 0 && process.env.NODE_ENV !== "test") {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
        continue;
      }

      if (err instanceof ApiClientError) {
        throw err;
      }

      const message = err instanceof Error ? err.message : "Network error occurred";
      throw new ApiClientError(message, 0, "NETWORK_ERROR");
    } finally {
      clearTimeout(timeoutId);
      if (userSignal) {
        userSignal.removeEventListener("abort", onUserAbort);
      }
      timeoutController.signal.removeEventListener("abort", onTimeoutAbort);
    }
  }
}

/**
 * Fetches the GitHub developer profile for a given username.
 */
export async function fetchUserProfile(
  username: string,
  options?: RequestOptions
): Promise<GitHubUserProfile> {
  const clean = encodeURIComponent(username.trim());
  return typedRequest<GitHubUserProfile>(`/api/github/users/${clean}`, options);
}

/**
 * Fetches the analyzed technical skills for a given username.
 */
export async function fetchUserSkills(
  username: string,
  options?: RequestOptions & { includeForks?: boolean }
): Promise<UserSkillsResponse> {
  const clean = encodeURIComponent(username.trim());
  const query = options?.includeForks ? "?include_forks=true" : "";
  return typedRequest<UserSkillsResponse>(
    `/api/github/users/${clean}/skills${query}`,
    options
  );
}

/**
 * Fetches open-source issue recommendations matching a user's skills.
 */
export async function fetchMatchedIssues(
  username: string,
  options?: RequestOptions
): Promise<MatchedIssuesResponse> {
  const clean = encodeURIComponent(username.trim());
  return typedRequest<MatchedIssuesResponse>(
    `/api/matching/users/${clean}/issues`,
    options
  );
}

/**
 * Fetches API health status and version information.
 */
export async function fetchHealth(options?: RequestOptions): Promise<HealthResponse> {
  return typedRequest<HealthResponse>("/api/health", options);
}

/**
 * Coordinated search helper that cancels in-flight searches, fetches profile and skills,
 * and optionally fetches recommendations without stale result races.
 */
export async function searchUser(
  username: string,
  options: SearchOptions = {}
): Promise<CompleteAnalysisResult> {
  const signal = createSearchSignal();
  const requestOptions: RequestOptions = {
    signal,
    timeoutMs: options.timeoutMs ?? 10000,
  };

  const [profile, skills] = await Promise.all([
    fetchUserProfile(username, requestOptions),
    fetchUserSkills(username, {
      ...requestOptions,
      includeForks: options.includeForks,
    }),
  ]);

  let issues: MatchedIssuesResponse | undefined;
  if (options.fetchIssues !== false) {
    try {
      issues = await fetchMatchedIssues(username, requestOptions);
    } catch (err) {
      if (isAbortError(err)) {
        throw err;
      }
      // Issue matching failures degrade gracefully without blocking profile
    }
  }

  return { profile, skills, issues };
}
