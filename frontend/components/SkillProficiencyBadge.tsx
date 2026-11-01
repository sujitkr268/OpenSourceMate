"use client";

import React, { useState, useId } from "react";
import { ProficiencyLevel } from "../types/api";
import {
  computeSkillProficiency,
  getProficiencyTheme,
} from "../utils/proficiency";

export interface SkillProficiencyBadgeProps {
  /** Optional pre-computed proficiency level from backend */
  level?: ProficiencyLevel;
  /** Optional pre-computed proficiency score (0.0 to 10.0) */
  score?: number;
  /** Optional pre-computed calculation reason */
  reason?: string;
  /** Number of repositories using this skill */
  repositoryCount?: number;
  /** Percentage share of code/repositories */
  percentage?: number;
  /** ISO timestamp of most recent activity featuring this skill */
  latestUpdatedAt?: string | null;
  /** Theme: dark or light */
  theme?: "dark" | "light";
  /** Optional custom CSS class */
  className?: string;
}

/**
 * SkillProficiencyBadge
 *
 * Displays a small badge next to a skill indicating an estimated proficiency level
 * (Learning / Comfortable / Strong) with an accessible interactive tooltip explaining
 * the underlying calculation (Issue #131).
 */
export default function SkillProficiencyBadge({
  level: initialLevel,
  score: initialScore,
  reason: initialReason,
  repositoryCount = 1,
  percentage = 10,
  latestUpdatedAt,
  theme = "dark",
  className = "",
}: SkillProficiencyBadgeProps) {
  const tooltipId = useId();
  const [showTooltip, setShowTooltip] = useState(false);

  // If backend didn't provide proficiency, compute deterministic client estimate
  const computed = React.useMemo(() => {
    if (initialLevel && initialReason) {
      return {
        level: initialLevel,
        score: initialScore ?? 5.0,
        reason: initialReason,
      };
    }
    return computeSkillProficiency(repositoryCount, percentage, latestUpdatedAt);
  }, [initialLevel, initialScore, initialReason, repositoryCount, percentage, latestUpdatedAt]);

  const level = initialLevel || computed.level;
  const reason = initialReason || computed.reason;
  const score = initialScore ?? computed.score;

  const colors = getProficiencyTheme(level, theme);
  const isDark = theme === "dark";

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      <button
        type="button"
        aria-describedby={showTooltip ? tooltipId : undefined}
        aria-label={`Proficiency estimate: ${level}. ${reason}`}
        className={`group inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-tight transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${colors.badgeBg} ${colors.badgeBorder} ${colors.badgeText}`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${colors.dotColor}`}
          aria-hidden="true"
        />
        <span>{level}</span>

        {/* Small info icon hint */}
        <svg
          className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Accessible Tooltip Popover */}
      {showTooltip && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-xl border p-3 text-xs shadow-xl backdrop-blur-md transition-all duration-200 ${
            isDark
              ? "border-white/10 bg-[#0d1117]/95 text-gray-200 shadow-black/40"
              : "border-gray-200 bg-white/95 text-gray-800 shadow-gray-300/40"
          }`}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-purple-400">
              Estimated Proficiency
            </span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono">
              Score: {score}/10
            </span>
          </div>

          <p className="mt-1.5 leading-relaxed text-[11px] opacity-90">
            {reason}
          </p>

          <div className="mt-2 text-[10px] italic text-gray-400">
            ℹ️ Calculated from repository breadth, code share, and commit recency.
          </div>

          {/* Tooltip downward caret arrow */}
          <div
            className={`absolute top-full left-1/2 -mt-1 h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b ${
              isDark
                ? "border-white/10 bg-[#0d1117]"
                : "border-gray-200 bg-white"
            }`}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}

