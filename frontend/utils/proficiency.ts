/**
 * Skill proficiency level estimation utility (Issue #131).
 *
 * Provides client-side fallback computation, theme styles,
 * and explanation formatting for skill proficiency badges.
 */

import { ProficiencyLevel } from "../types/api";

export interface ProficiencyEstimate {
  level: ProficiencyLevel;
  score: number;
  reason: string;
}

export interface ProficiencyThemeConfig {
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotColor: string;
  tooltipBg: string;
  tooltipText: string;
}

/**
 * Computes an estimated proficiency level (Learning, Comfortable, Strong)
 * based on repository count (breadth), code share percentage (depth), and activity recency.
 */
export function computeSkillProficiency(
  repositoryCount: number,
  percentage: number,
  latestUpdatedAt?: string | null,
  now: Date = new Date()
): ProficiencyEstimate {
  if (repositoryCount <= 0 || percentage <= 0) {
    return {
      level: "Learning",
      score: 3.3,
      reason: "Estimated as Learning: early stage exploration with limited repositories.",
    };
  }

  // 1. Breadth: Repository Count (1.0 to 3.0 pts)
  let breadthPts = 1.0;
  if (repositoryCount >= 5) {
    breadthPts = 3.0;
  } else if (repositoryCount >= 2) {
    breadthPts = 2.0;
  }

  // 2. Depth: Code Share Percentage (1.0 to 3.0 pts)
  let depthPts = 1.0;
  if (percentage >= 40.0) {
    depthPts = 3.0;
  } else if (percentage >= 15.0) {
    depthPts = 2.0;
  }

  // 3. Recency: Activity (1.0 to 3.0 pts)
  let recencyPts = 1.5;
  let daysAgo: number | null = null;

  if (latestUpdatedAt) {
    try {
      const dt = new Date(latestUpdatedAt);
      if (!isNaN(dt.getTime())) {
        const diffMs = now.getTime() - dt.getTime();
        daysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        if (daysAgo <= 90) {
          recencyPts = 3.0;
        } else if (daysAgo <= 365) {
          recencyPts = 2.0;
        } else {
          recencyPts = 1.0;
        }
      }
    } catch {
      recencyPts = 1.5;
    }
  }

  const totalPoints = breadthPts + depthPts + recencyPts;
  const score = Math.round((totalPoints / 9.0) * 100) / 10;

  let level: ProficiencyLevel = "Learning";
  if (totalPoints >= 7.0) {
    level = "Strong";
  } else if (totalPoints >= 5.0) {
    level = "Comfortable";
  }

  const repoWord = repositoryCount === 1 ? "repository" : "repositories";
  let activityPhrase = "";
  if (daysAgo !== null) {
    if (daysAgo <= 90) {
      activityPhrase = `, active recently (${daysAgo} days ago)`;
    } else if (daysAgo <= 365) {
      activityPhrase = ", active within the past year";
    } else {
      const months = Math.max(1, Math.floor(daysAgo / 30));
      activityPhrase = `, last updated ${months} months ago`;
    }
  }

  const reason =
    `Estimated as ${level}: used in ${repositoryCount} ${repoWord} ` +
    `(${percentage}% code share)${activityPhrase}. ` +
    `Note: This is an automated estimate based on public GitHub repository activity.`;

  return { level, score, reason };
}

/**
 * Returns Tailwind color classes tailored for dark/light themes.
 */
export function getProficiencyTheme(
  level: ProficiencyLevel = "Learning",
  theme: "dark" | "light" = "dark"
): ProficiencyThemeConfig {
  const isDark = theme === "dark";

  switch (level) {
    case "Strong":
      return {
        badgeBg: isDark ? "bg-emerald-500/15" : "bg-emerald-50",
        badgeBorder: isDark ? "border-emerald-500/30" : "border-emerald-200",
        badgeText: isDark ? "text-emerald-300" : "text-emerald-800",
        dotColor: isDark ? "bg-emerald-400" : "bg-emerald-600",
        tooltipBg: isDark ? "bg-emerald-950/90" : "bg-white",
        tooltipText: isDark ? "text-emerald-200" : "text-emerald-900",
      };
    case "Comfortable":
      return {
        badgeBg: isDark ? "bg-blue-500/15" : "bg-blue-50",
        badgeBorder: isDark ? "border-blue-500/30" : "border-blue-200",
        badgeText: isDark ? "text-blue-300" : "text-blue-800",
        dotColor: isDark ? "bg-blue-400" : "bg-blue-600",
        tooltipBg: isDark ? "bg-blue-950/90" : "bg-white",
        tooltipText: isDark ? "text-blue-200" : "text-blue-900",
      };
    case "Learning":
    default:
      return {
        badgeBg: isDark ? "bg-amber-500/15" : "bg-amber-50",
        badgeBorder: isDark ? "border-amber-500/30" : "border-amber-200",
        badgeText: isDark ? "text-amber-300" : "text-amber-800",
        dotColor: isDark ? "bg-amber-400" : "bg-amber-600",
        tooltipBg: isDark ? "bg-amber-950/90" : "bg-white",
        tooltipText: isDark ? "text-amber-200" : "text-amber-900",
      };
  }
}

