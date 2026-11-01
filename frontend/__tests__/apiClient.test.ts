import {
  getApiBaseUrl,
  isAbortError,
  isTransientFailure,
  cancelPendingSearch,
  createSearchSignal,
  typedRequest,
  fetchUserProfile,
  fetchUserSkills,
  fetchMatchedIssues,
  fetchHealth,
  searchUser,
  ApiClientError,
  ApiTimeoutError,
} from "../utils/apiClient";

describe("Typed API Client", () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    global.fetch = jest.fn();
    cancelPendingSearch();
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    cancelPendingSearch();
    jest.restoreAllMocks();
  });

  describe("getApiBaseUrl", () => {
    it("returns NEXT_PUBLIC_API_URL when environment variable is defined", () => {
      process.env.NEXT_PUBLIC_API_URL = "https://api.opensourcemate.com";
      expect(getApiBaseUrl()).toBe("https://api.opensourcemate.com");
    });

    it("falls back to http://localhost:8000 when environment variable is missing", () => {
      delete process.env.NEXT_PUBLIC_API_URL;
      expect(getApiBaseUrl()).toBe("http://localhost:8000");
    });
  });

  describe("isAbortError & isTransientFailure", () => {
    it("identifies DOMException AbortError correctly", () => {
      expect(isAbortError(new DOMException("The operation was aborted", "AbortError"))).toBe(true);
      expect(isAbortError(new Error("Request aborted"))).toBe(true);
      expect(isAbortError(new Error("Regular failure"))).toBe(false);
      expect(isAbortError(null)).toBe(false);
    });

    it("identifies transient HTTP statuses eligible for retry", () => {
      expect(isTransientFailure(502)).toBe(true);
      expect(isTransientFailure(503)).toBe(true);
      expect(isTransientFailure(504)).toBe(true);
      expect(isTransientFailure(408)).toBe(true);
      expect(isTransientFailure(404)).toBe(false);
      expect(isTransientFailure(429)).toBe(false);
      expect(isTransientFailure(400)).toBe(false);
    });

    it("identifies network TypeErrors as transient", () => {
      expect(isTransientFailure(new TypeError("Failed to fetch"))).toBe(true);
      expect(isTransientFailure(new Error("Generic error"))).toBe(false);
    });
  });

  describe("typedRequest", () => {
    it("successfully parses and returns JSON data for 200 responses", async () => {
      const mockData = { status: "healthy", service: "OpenSourceMate", version: "0.1.0" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await typedRequest<typeof mockData>("/api/health");
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/health",
        expect.objectContaining({ signal: expect.any(Object) })
      );
    });

    it("throws ApiClientError with code and status for 404 response", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers(),
        json: async () => ({ detail: "User not found" }),
      });

      await expect(typedRequest("/api/github/users/unknown")).rejects.toThrow(
        ApiClientError
      );

      try {
        await typedRequest("/api/github/users/unknown");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiClientError);
        const apiErr = err as ApiClientError;
        expect(apiErr.status).toBe(404);
        expect(apiErr.code).toBe("NOT_FOUND");
      }
    });

    it("extracts rate limit reset time on 429 response", async () => {
      const resetTime = "2026-10-30T15:00:00Z";
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ "X-RateLimit-Reset": resetTime }),
        json: async () => ({ detail: "Rate limit reached", reset_at: resetTime }),
      });

      try {
        await typedRequest("/api/github/users/heavyuser");
        fail("Should have thrown ApiClientError");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiClientError);
        const apiErr = err as ApiClientError;
        expect(apiErr.status).toBe(429);
        expect(apiErr.code).toBe("RATE_LIMIT_EXCEEDED");
        expect(apiErr.resetAt).toBe(resetTime);
      }
    });

    it("retries once and succeeds on transient 503 error", async () => {
      const mockData = { success: true };
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          headers: new Headers(),
          json: async () => ({ detail: "Service unavailable" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockData,
        });

      const result = await typedRequest<typeof mockData>("/api/test", {
        retries: 1,
        retryDelayMs: 10,
      });

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("retries once and succeeds on transient network TypeError", async () => {
      const mockData = { recovered: true };
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new TypeError("Failed to fetch"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockData,
        });

      const result = await typedRequest<typeof mockData>("/api/test", {
        retries: 1,
        retryDelayMs: 10,
      });

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("does not retry client errors such as 404", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers(),
        json: async () => ({ detail: "Not found" }),
      });

      await expect(
        typedRequest("/api/test", { retries: 1, retryDelayMs: 10 })
      ).rejects.toThrow(ApiClientError);

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("handles timeout correctly and throws ApiTimeoutError", async () => {
      (global.fetch as jest.Mock).mockImplementation(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            if (options?.signal) {
              options.signal.addEventListener("abort", () => {
                reject(options.signal.reason);
              });
            }
          })
      );

      await expect(
        typedRequest("/api/slow", { timeoutMs: 30, retries: 0 })
      ).rejects.toThrow(ApiTimeoutError);
    });
  });

  describe("Request Cancellation & Search Signal", () => {
    it("cancels previous search signal when createSearchSignal is called", () => {
      const signal1 = createSearchSignal();
      expect(signal1.aborted).toBe(false);

      const signal2 = createSearchSignal();
      expect(signal1.aborted).toBe(true);
      expect(signal2.aborted).toBe(false);
    });

    it("cancels pending search via cancelPendingSearch", () => {
      const signal = createSearchSignal();
      expect(signal.aborted).toBe(false);

      cancelPendingSearch();
      expect(signal.aborted).toBe(true);
    });
  });

  describe("API Endpoint Helpers", () => {
    it("fetchUserProfile encodes username and calls /api/github/users/:username", async () => {
      const profile = { username: "torvalds", name: "Linus Torvalds" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => profile,
      });

      const result = await fetchUserProfile("torvalds");
      expect(result).toEqual(profile);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/github/users/torvalds",
        expect.any(Object)
      );
    });

    it("fetchUserSkills appends include_forks query parameter when specified", async () => {
      const skills = { username: "octocat", skills: [], total_repositories_analyzed: 0 };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => skills,
      });

      await fetchUserSkills("octocat", { includeForks: true });
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/github/users/octocat/skills?include_forks=true",
        expect.any(Object)
      );
    });

    it("fetchMatchedIssues queries /api/matching/users/:username/issues", async () => {
      const issues = { username: "octocat", recommendations: [] };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => issues,
      });

      const result = await fetchMatchedIssues("octocat");
      expect(result).toEqual(issues);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/matching/users/octocat/issues",
        expect.any(Object)
      );
    });

    it("fetchHealth queries /api/health", async () => {
      const health = { status: "healthy", service: "OpenSourceMate API", version: "0.1.0" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => health,
      });

      const result = await fetchHealth();
      expect(result).toEqual(health);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/health",
        expect.any(Object)
      );
    });
  });

  describe("searchUser coordinated helper", () => {
    it("coordinates profile, skills, and issues retrieval concurrently", async () => {
      const profile = { username: "octocat", name: "The Octocat" };
      const skills = { username: "octocat", skills: [], total_repositories_analyzed: 2 };
      const issues = { username: "octocat", recommendations: [] };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => profile,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => skills,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => issues,
        });

      const result = await searchUser("octocat");
      expect(result.profile).toEqual(profile);
      expect(result.skills).toEqual(skills);
      expect(result.issues).toEqual(issues);
    });

    it("degrades gracefully if issues matching fails without blocking profile", async () => {
      const profile = { username: "octocat", name: "The Octocat" };
      const skills = { username: "octocat", skills: [], total_repositories_analyzed: 2 };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => profile,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => skills,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          headers: new Headers(),
          json: async () => ({ detail: "Matching service error" }),
        });

      const result = await searchUser("octocat");
      expect(result.profile).toEqual(profile);
      expect(result.skills).toEqual(skills);
      expect(result.issues).toBeUndefined();
    });
  });
});
