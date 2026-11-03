"use client";

import React, { useMemo } from "react";
import { SkillItem } from "../types/api";
import { getSkillsToLearn, SkillSuggestion, SkillsMapping } from "../utils/skillsToLearn";

export interface SkillsToLearnProps {
  /** Array of user's detected skills (either SkillItem objects from API or plain string names) */
  skills?: (SkillItem | string)[] | null;
  /** Active UI theme ('dark' or 'light') */
  theme?: "dark" | "light";
  /** Optional custom container CSS classes */
  className?: string;
  /** Maximum number of suggestions to display (default: 5) */
  maxSuggestions?: number;
  /** Optional custom mapping for testing or extensibility */
  customMapping?: SkillsMapping;
}

/**
 * SkillsToLearn Component
 *
 * Displays up to 5 suggested technologies to learn next based on the user's
 * detected skills from a static mapping, strictly excluding skills the user already has.
 *
 * Acceptance Criteria:
 * - Shows up to 5 suggestions based on detected skills.
 * - Excludes skills the user already has.
 * - Empty or unknown skills show nothing (renders null) instead of an error.
 * - Mapping is easily extensible via JSON.
 */
export default function SkillsToLearn({
  skills,
  theme = "dark",
  className = "",
  maxSuggestions = 5,
  customMapping,
}: SkillsToLearnProps) {
  const suggestions: SkillSuggestion[] = useMemo(() => {
    try {
      return getSkillsToLearn(skills, customMapping, maxSuggestions);
    } catch {
      // Safe fallback: never throw or crash the UI
      return [];
    }
  }, [skills, customMapping, maxSuggestions]);

  // If there are no suggestions (e.g. empty skills, unknown skills, or all suggested skills already owned),
  // show nothing instead of an error.
  if (suggestions.length === 0) {
    return null;
  }

  const isDark = theme === "dark";

  return (
    <section
      aria-label="Skills to learn next"
      className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 ${
        isDark
          ? "border-purple-500/20 bg-white/[0.025]"
          : "border-purple-200/80 bg-purple-50/40 shadow-sm"
      } ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/25 bg-purple-400/10 px-2.5 py-0.5 text-xs font-semibold tracking-wider text-purple-400 uppercase">
            <span aria-hidden="true">💡</span> LEARNING PATHS
          </div>

          <h4
            className={`mt-2 text-lg font-bold tracking-tight sm:text-xl ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Skills to learn next
          </h4>

          <p
            className={`mt-1 text-xs sm:text-sm ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Recommended companion technologies to broaden your open-source opportunities.
          </p>
        </div>

        <span
          className={`self-start sm:self-auto rounded-full px-2.5 py-1 text-xs font-medium ${
            isDark
              ? "bg-purple-950/40 text-purple-300 border border-purple-800/40"
              : "bg-purple-100 text-purple-800 border border-purple-200"
          }`}
        >
          {suggestions.length} {suggestions.length === 1 ? "suggestion" : "suggestions"}
        </span>
      </div>

      {/* Suggested Skills Grid */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.name}
            className={`group relative flex flex-col justify-between rounded-xl border p-3.5 transition-all duration-200 hover:-translate-y-0.5 ${
              isDark
                ? "border-white/10 bg-white/[0.02] hover:border-purple-400/40 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-purple-900/10"
                : "border-gray-200 bg-white hover:border-purple-300 hover:shadow-md hover:shadow-purple-100"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`text-sm font-bold tracking-tight ${
                    isDark ? "text-gray-100 group-hover:text-purple-300" : "text-gray-900 group-hover:text-purple-700"
                  } transition-colors`}
                >
                  {suggestion.name}
                </span>

                <span
                  aria-hidden="true"
                  className="text-xs opacity-60 transition-transform duration-200 group-hover:scale-110 group-hover:opacity-100"
                >
                  ✨
                </span>
              </div>

              <p
                className={`mt-1 text-[11px] leading-tight ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Pairs with <span className="font-medium text-purple-400">{suggestion.recommendedFrom}</span>
              </p>
            </div>

            <div className="mt-3 flex items-center gap-1">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  isDark ? "bg-purple-400" : "bg-purple-600"
                }`}
              />
              <span
                className={`text-[10px] font-medium tracking-wide uppercase ${
                  isDark ? "text-gray-500" : "text-gray-500"
                }`}
              >
                Recommended
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
