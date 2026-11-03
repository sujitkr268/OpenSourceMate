/**
 * Username sanitization and GitHub validation utility.
 * Adheres strictly to official GitHub username rules:
 * - May only contain alphanumeric characters and single hyphens.
 * - Cannot begin or end with a hyphen.
 * - Maximum of 39 characters.
 * - Cannot contain multiple consecutive hyphens.
 */

export interface ValidationResult {
  isValid: boolean;
  cleanUsername: string;
  error: string | null;
  errorCode:
    | "EMPTY"
    | "TOO_LONG"
    | "STARTS_WITH_HYPHEN"
    | "ENDS_WITH_HYPHEN"
    | "CONSECUTIVE_HYPHENS"
    | "INVALID_CHARACTERS"
    | null;
}

/**
 * Clean and normalize a raw username input by trimming outer whitespace
 * and stripping any leading '@' symbols.
 */
export function sanitizeUsername(rawInput: string): string {
  if (!rawInput) return "";
  return rawInput.trim().replace(/^@+/, "");
}

/**
 * Validate a GitHub username against official formatting rules,
 * returning a specific human-readable error message and code.
 */
export function validateGitHubUsername(rawInput: string): ValidationResult {
  const cleanUsername = sanitizeUsername(rawInput);

  if (!cleanUsername) {
    return {
      isValid: false,
      cleanUsername: "",
      error: "Please enter a GitHub username.",
      errorCode: "EMPTY",
    };
  }

  if (cleanUsername.length > 39) {
    return {
      isValid: false,
      cleanUsername,
      error: `GitHub username is too long (${cleanUsername.length} characters). Maximum allowed is 39 characters.`,
      errorCode: "TOO_LONG",
    };
  }

  if (cleanUsername.startsWith("-")) {
    return {
      isValid: false,
      cleanUsername,
      error: "GitHub username cannot begin with a hyphen ('-').",
      errorCode: "STARTS_WITH_HYPHEN",
    };
  }

  if (cleanUsername.endsWith("-")) {
    return {
      isValid: false,
      cleanUsername,
      error: "GitHub username cannot end with a hyphen ('-').",
      errorCode: "ENDS_WITH_HYPHEN",
    };
  }

  if (cleanUsername.includes("--")) {
    return {
      isValid: false,
      cleanUsername,
      error: "GitHub username cannot contain multiple consecutive hyphens ('--').",
      errorCode: "CONSECUTIVE_HYPHENS",
    };
  }

  // Check for invalid characters (only alphanumeric and single internal hyphen permitted)
  const validPattern = /^[a-zA-Z0-9-]+$/;
  if (!validPattern.test(cleanUsername)) {
    return {
      isValid: false,
      cleanUsername,
      error:
        "GitHub username can only contain alphanumeric characters (letters and numbers) and single hyphens.",
      errorCode: "INVALID_CHARACTERS",
    };
  }

  return {
    isValid: true,
    cleanUsername,
    error: null,
    errorCode: null,
  };
}

/**
 * Maps HTTP response statuses or exceptions to distinct, readable user messages.
 */
export function resolveAnalyzerErrorMessage(
  statusOrError: number | Error | unknown,
  customDetails?: { username?: string; resetAt?: string }
): string {
  const userPrefix = customDetails?.username
    ? `GitHub user '${customDetails.username}'`
    : "GitHub user";

  if (typeof statusOrError === "number") {
    switch (statusOrError) {
      case 404:
        return `${userPrefix} could not be found. Please check the spelling and try again.`;
      case 429:
        if (customDetails?.resetAt) {
          try {
            const time = new Date(customDetails.resetAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            });
            return `GitHub API rate limit reached. Please try again at ${time}.`;
          } catch {
            // Fall through to generic message
          }
        }
        return "GitHub API rate limit reached. Please try again in a few minutes.";
      case 502:
      case 503:
        return "GitHub API is temporarily unavailable. Please try again in a few moments.";
      case 500:
        return "An internal server error occurred while analyzing the profile. Please try again.";
      default:
        return `Unable to retrieve profile data (HTTP ${statusOrError}). Please try again.`;
    }
  }

  if (statusOrError instanceof TypeError) {
    return "Unable to connect to the server. Please check your network connection and ensure the backend is running.";
  }

  if (statusOrError instanceof Error) {
    return statusOrError.message || "Something went wrong. Please try again.";
  }

  return "An unexpected error occurred. Please try again.";
}
