"use client";

import type { BookmarkedIssue } from "../hooks/useBookmarkedIssues";

interface SavedIssuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: BookmarkedIssue[];
  onRemove: (id: number) => void;
  onClear: () => void;
}

export default function SavedIssuesModal({
  isOpen,
  onClose,
  bookmarks,
  onRemove,
  onClear,
}: SavedIssuesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl border border-white/10 bg-[#0b0e17] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">★</span>
            <h3 className="text-lg font-semibold tracking-tight text-white">Saved Issues</h3>
            <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-semibold text-purple-300">
              {bookmarks.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {bookmarks.length > 0 && (
              <button
                onClick={onClear}
                className="text-xs text-gray-500 transition hover:text-red-400"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 transition hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {bookmarks.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-4xl">🔖</p>
              <h4 className="mt-4 text-base font-semibold text-gray-200">No saved issues yet</h4>
              <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
                Bookmark issues you want to contribute to and they will be saved here for easy
                access across sessions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookmarks.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition hover:border-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-purple-300">{issue.repository}</span>
                        {issue.language && (
                          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-300">
                            {issue.language}
                          </span>
                        )}
                      </div>

                      <h5 className="mt-1.5 text-sm font-semibold text-white">
                        <a
                          href={issue.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition hover:text-purple-300"
                        >
                          {issue.title}
                        </a>
                      </h5>

                      {issue.labels && issue.labels.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {issue.labels.slice(0, 4).map((label, idx) => (
                            <span
                              key={idx}
                              className="rounded-full border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] text-gray-400"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <a
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 transition hover:bg-white hover:text-black"
                      >
                        Open ↗
                      </a>
                      <button
                        onClick={() => onRemove(issue.id)}
                        className="text-xs text-gray-500 transition hover:text-red-400"
                        title="Remove bookmark"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
