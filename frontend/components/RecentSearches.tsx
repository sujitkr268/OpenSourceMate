"use client";

import React from "react";

export interface RecentSearchesProps {
  searches: string[];
  onSelect: (username: string) => void;
  onRemove: (username: string) => void;
  onClear: () => void;
  theme?: "dark" | "light";
  className?: string;
}

export default function RecentSearches({
  searches,
  onSelect,
  onRemove,
  onClear,
  theme = "dark",
  className = "",
}: RecentSearchesProps) {
  if (!searches || searches.length === 0) {
    return null;
  }

  return (
    <div
      className={`mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 ${className}`}
      role="region"
      aria-label="Recent profile searches"
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mr-1">
        <span aria-hidden="true">🕒</span>
        <span>Recent:</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 flex-1">
        {searches.map((username) => (
          <div
            key={username}
            className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
              theme === "dark"
                ? "border-white/10 bg-white/5 text-gray-300 hover:border-purple-400/40 hover:bg-white/10 hover:text-white"
                : "border-gray-200 bg-gray-100 text-gray-700 hover:border-purple-300 hover:bg-gray-200 hover:text-black"
            }`}
          >
            {/* Clickable username chip */}
            <button
              type="button"
              onClick={() => onSelect(username)}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-full"
              aria-label={`Re-run analysis for GitHub user @${username}`}
            >
              @{username}
            </button>

            {/* Remove individual search */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(username);
              }}
              className="text-gray-500 hover:text-red-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400 rounded-full p-0.5 ml-0.5"
              aria-label={`Remove @${username} from recent searches`}
              title={`Remove @${username}`}
            >
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Clear all recent searches button */}
      <button
        type="button"
        onClick={onClear}
        className={`text-xs underline transition-colors px-2 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
          theme === "dark"
            ? "text-gray-500 hover:text-gray-300"
            : "text-gray-500 hover:text-gray-700"
        }`}
        aria-label="Clear all recent searches"
      >
        Clear all
      </button>
    </div>
  );
}
