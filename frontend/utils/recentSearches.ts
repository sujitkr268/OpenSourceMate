/**
 * Utility for persisting and managing recent successfully analyzed GitHub usernames
 * in browser localStorage with robust error handling for restricted or blocked storage.
 */

export const RECENT_SEARCHES_STORAGE_KEY = "osm_recent_searches";
export const MAX_RECENT_SEARCHES = 5;

/**
 * Safely retrieve the list of recent searches from localStorage.
 * Returns an empty array if storage is disabled, blocked, or corrupt.
 */
export function getRecentSearches(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Filter valid non-empty string usernames
    return parsed
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    // Gracefully handle SecurityError, QuotaExceededError, or JSON parsing error
    return [];
  }
}

/**
 * Safely save a successfully analyzed username into recent searches.
 * Deduplicates by moving existing entry to the front, and caps list to MAX_RECENT_SEARCHES.
 */
export function saveRecentSearch(rawUsername: string): string[] {
  if (typeof window === "undefined" || !rawUsername) {
    return [];
  }

  const clean = rawUsername.trim().replace(/^@+/, "");
  if (!clean) return getRecentSearches();

  try {
    const existing = getRecentSearches();

    // Deduplicate case-insensitively while preserving latest casing
    const filtered = existing.filter((item) => item.toLowerCase() !== clean.toLowerCase());

    const updated = [clean, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    // If localStorage quota is exceeded or storage is blocked, return in-memory state
    return [clean];
  }
}

/**
 * Safely remove a single username from recent searches.
 */
export function removeRecentSearch(usernameToRemove: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const existing = getRecentSearches();
    const updated = existing.filter(
      (item) => item.toLowerCase() !== usernameToRemove.toLowerCase().trim()
    );

    window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Safely clear all recent searches from localStorage.
 */
export function clearRecentSearches(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
  } catch {
    // Ignore errors in blocked environments
  }
}
