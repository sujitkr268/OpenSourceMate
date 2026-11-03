"use client";

import { useSyncExternalStore } from "react";

export type BookmarkedIssue = {
  id: number;
  title: string;
  repository: string;
  url: string;
  language?: string;
  labels?: string[];
  comments?: number;
  match_score?: number;
  savedAt?: string;
};

const STORAGE_KEY = "opensourcemate_saved_issues";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener("storage", callback);
  window.addEventListener("osm_bookmarks_updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("osm_bookmarks_updated", callback);
  };
}

function getSnapshot(): string {
  if (typeof window === "undefined") {
    return "[]";
  }
  try {
    return localStorage.getItem(STORAGE_KEY) || "[]";
  } catch {
    return "[]";
  }
}

function getServerSnapshot(): string {
  return "[]";
}

export function useBookmarkedIssues() {
  const rawBookmarks = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  let bookmarks: BookmarkedIssue[] = [];
  try {
    const parsed = JSON.parse(rawBookmarks);
    if (Array.isArray(parsed)) {
      bookmarks = parsed;
    }
  } catch {
    bookmarks = [];
  }

  const saveBookmarks = (items: BookmarkedIssue[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new Event("osm_bookmarks_updated"));
    } catch {
      // Ignore localStorage write errors
    }
  };

  const isBookmarked = (id: number) => {
    return bookmarks.some((item) => item.id === id);
  };

  const toggleBookmark = (issue: BookmarkedIssue) => {
    if (isBookmarked(issue.id)) {
      saveBookmarks(bookmarks.filter((item) => item.id !== issue.id));
    } else {
      const newItem: BookmarkedIssue = {
        ...issue,
        savedAt: new Date().toISOString(),
      };
      saveBookmarks([newItem, ...bookmarks]);
    }
  };

  const removeBookmark = (id: number) => {
    saveBookmarks(bookmarks.filter((item) => item.id !== id));
  };

  const clearBookmarks = () => {
    saveBookmarks([]);
  };

  return {
    bookmarks,
    isBookmarked,
    toggleBookmark,
    removeBookmark,
    clearBookmarks,
  };
}
