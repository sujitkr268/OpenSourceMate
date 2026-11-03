import {
  getRecentSearches,
  saveRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  RECENT_SEARCHES_STORAGE_KEY,
  MAX_RECENT_SEARCHES,
} from "../utils/recentSearches";

describe("Recent Searches Storage Utilities", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  describe("getRecentSearches", () => {
    it("returns empty array when nothing is stored", () => {
      expect(getRecentSearches()).toEqual([]);
    });

    it("returns stored list of usernames", () => {
      localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(["torvalds", "gaearon"]));
      expect(getRecentSearches()).toEqual(["torvalds", "gaearon"]);
    });

    it("filters out invalid, empty, or non-string items", () => {
      localStorage.setItem(
        RECENT_SEARCHES_STORAGE_KEY,
        JSON.stringify(["torvalds", null, 123, "", "   ", "gaearon"])
      );
      expect(getRecentSearches()).toEqual(["torvalds", "gaearon"]);
    });

    it("caps retrieved results at MAX_RECENT_SEARCHES (5)", () => {
      const sevenUsers = ["u1", "u2", "u3", "u4", "u5", "u6", "u7"];
      localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(sevenUsers));
      expect(getRecentSearches().length).toBe(MAX_RECENT_SEARCHES);
      expect(getRecentSearches()).toEqual(["u1", "u2", "u3", "u4", "u5"]);
    });

    it("handles JSON syntax error safely without throwing", () => {
      localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, "invalid-json{");
      expect(getRecentSearches()).toEqual([]);
    });

    it("handles localStorage access exceptions (e.g. SecurityError / private mode)", () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new DOMException("Access denied", "SecurityError");
      });

      expect(() => getRecentSearches()).not.toThrow();
      expect(getRecentSearches()).toEqual([]);
    });
  });

  describe("saveRecentSearch", () => {
    it("saves a new username to empty storage", () => {
      const result = saveRecentSearch("torvalds");
      expect(result).toEqual(["torvalds"]);
      expect(getRecentSearches()).toEqual(["torvalds"]);
    });

    it("trims whitespace and removes leading @", () => {
      const result = saveRecentSearch("   @octocat   ");
      expect(result).toEqual(["octocat"]);
      expect(getRecentSearches()).toEqual(["octocat"]);
    });

    it("deduplicates by moving existing user to front", () => {
      saveRecentSearch("user1");
      saveRecentSearch("user2");
      saveRecentSearch("user3");
      expect(getRecentSearches()).toEqual(["user3", "user2", "user1"]);

      // Re-saving user2 should bump user2 to the front
      const updated = saveRecentSearch("user2");
      expect(updated).toEqual(["user2", "user3", "user1"]);
      expect(getRecentSearches()).toEqual(["user2", "user3", "user1"]);
    });

    it("deduplicates case-insensitively while preserving latest casing", () => {
      saveRecentSearch("octocat");
      const updated = saveRecentSearch("OctoCat");
      expect(updated).toEqual(["OctoCat"]);
      expect(getRecentSearches()).toEqual(["OctoCat"]);
    });

    it("caps total stored usernames at 5, dropping oldest entries", () => {
      ["u1", "u2", "u3", "u4", "u5", "u6"].forEach((u) => saveRecentSearch(u));

      const searches = getRecentSearches();
      expect(searches.length).toBe(5);
      expect(searches).toEqual(["u6", "u5", "u4", "u3", "u2"]);
      expect(searches).not.toContain("u1");
    });

    it("gracefully catches quota exceeded exceptions when saving", () => {
      jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      });

      expect(() => saveRecentSearch("heavyuser")).not.toThrow();
    });
  });

  describe("removeRecentSearch", () => {
    it("removes a specific username while preserving others", () => {
      saveRecentSearch("user1");
      saveRecentSearch("user2");
      saveRecentSearch("user3");

      const remaining = removeRecentSearch("user2");
      expect(remaining).toEqual(["user3", "user1"]);
      expect(getRecentSearches()).toEqual(["user3", "user1"]);
    });

    it("is case-insensitive when removing", () => {
      saveRecentSearch("OctoCat");
      const remaining = removeRecentSearch("octocat");
      expect(remaining).toEqual([]);
      expect(getRecentSearches()).toEqual([]);
    });

    it("safely handles storage exceptions during removal", () => {
      jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("Storage blocked");
      });

      expect(() => removeRecentSearch("user1")).not.toThrow();
    });
  });

  describe("clearRecentSearches", () => {
    it("clears all stored searches", () => {
      saveRecentSearch("user1");
      saveRecentSearch("user2");
      expect(getRecentSearches().length).toBe(2);

      clearRecentSearches();
      expect(getRecentSearches()).toEqual([]);
    });

    it("safely handles storage exceptions during clear", () => {
      jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("Storage blocked");
      });

      expect(() => clearRecentSearches()).not.toThrow();
    });
  });
});
