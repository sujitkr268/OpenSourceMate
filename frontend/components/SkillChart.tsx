"use client";

import React, { useState, useId } from "react";

export type SkillItem = {
  name: string;
  repository_count: number;
  percentage: number;
};

export interface SkillChartProps {
  skills: SkillItem[];
  totalRepositories?: number;
  theme?: "dark" | "light";
  topN?: number;
  initialType?: "donut" | "bar";
  className?: string;
}

// Harmonious, high-contrast, accessible color palette
const CHART_PALETTE = [
  { fill: "#8b5cf6", stroke: "#7c3aed", name: "Purple", text: "#c4b5fd" }, // Purple
  { fill: "#3b82f6", stroke: "#2563eb", name: "Blue", text: "#93c5fd" }, // Blue
  { fill: "#10b981", stroke: "#059669", name: "Emerald", text: "#6ee7b7" }, // Emerald
  { fill: "#f59e0b", stroke: "#d97706", name: "Amber", text: "#fcd34d" }, // Amber
  { fill: "#ec4899", stroke: "#db2777", name: "Pink", text: "#f472b6" }, // Pink
  { fill: "#06b6d4", stroke: "#0891b2", name: "Cyan", text: "#67e8f9" }, // Cyan
  { fill: "#6366f1", stroke: "#4f46e5", name: "Indigo", text: "#a5b4fc" }, // Indigo
  { fill: "#14b8a6", stroke: "#0d9488", name: "Teal", text: "#5eead4" }, // Teal
];

export default function SkillChart({
  skills,
  totalRepositories = 0,
  theme = "dark",
  topN = 6,
  initialType = "donut",
  className = "",
}: SkillChartProps) {
  const chartId = useId();
  const [chartType, setChartType] = useState<"donut" | "bar">(initialType);
  const [activeSkill, setActiveSkill] = useState<SkillItem | null>(null);
  const [showTable, setShowTable] = useState(false);

  // Filter and sort top skills
  const sortedSkills = [...skills].sort((a, b) => b.repository_count - a.repository_count);
  const topSkills = sortedSkills.slice(0, topN);

  // If there are remaining skills, group them into "Other"
  const remainingSkills = sortedSkills.slice(topN);
  const otherRepoCount = remainingSkills.reduce((sum, s) => sum + s.repository_count, 0);
  const otherPercentage = Number(
    remainingSkills.reduce((sum, s) => sum + s.percentage, 0).toFixed(1)
  );

  const displaySkills: (SkillItem & { color: (typeof CHART_PALETTE)[0] })[] = [
    ...topSkills.map((skill, index) => ({
      ...skill,
      color: CHART_PALETTE[index % CHART_PALETTE.length],
    })),
  ];

  if (otherRepoCount > 0) {
    displaySkills.push({
      name: "Other Technologies",
      repository_count: otherRepoCount,
      percentage: otherPercentage,
      color: { fill: "#64748b", stroke: "#475569", name: "Slate", text: "#cbd5e1" },
    });
  }

  // Handle Empty State
  if (!skills || skills.length === 0) {
    return (
      <div
        className={`rounded-2xl border p-8 text-center ${
          theme === "dark"
            ? "border-white/10 bg-black/20 text-gray-400"
            : "border-gray-200 bg-gray-50 text-gray-600"
        } ${className}`}
        role="region"
        aria-label="Skill distribution chart empty state"
      >
        <div
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl"
          aria-hidden="true"
        >
          📊
        </div>
        <h4 className="text-base font-semibold text-gray-200">No Skill Data Available</h4>
        <p className="mt-1.5 text-xs text-gray-500">
          No public repository language data detected yet to generate a distribution chart.
        </p>
      </div>
    );
  }

  // Handle Single Skill Special Case
  const isSingleSkill = skills.length === 1;

  // Donut SVG Calculations
  const size = 300;
  const strokeWidth = 38;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate segment offsets
  let accumulatedPercent = 0;
  const donutSegments = displaySkills.map((skill) => {
    const strokeDasharray = `${(skill.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += skill.percentage;

    return {
      ...skill,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  // Bar Chart calculations
  const maxRepoCount = Math.max(...displaySkills.map((s) => s.repository_count), 1);

  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 transition-all ${
        theme === "dark" ? "border-white/10 bg-white/[0.02]" : "border-gray-200 bg-white shadow-sm"
      } ${className}`}
      role="region"
      aria-labelledby={`chart-title-${chartId}`}
    >
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4 border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg" aria-hidden="true">
              📊
            </span>
            <h4
              id={`chart-title-${chartId}`}
              className="text-base font-bold tracking-tight sm:text-lg"
            >
              Skill Distribution Chart
            </h4>
          </div>
          <p className={`mt-1 text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            Visual breakdown of technical languages across{" "}
            {totalRepositories > 0 ? `${totalRepositories} ` : ""}analyzed repositories.
          </p>
        </div>

        {/* View Switcher Tabs (Donut vs Bar) */}
        <div
          className={`inline-flex rounded-xl p-1 border text-xs font-semibold ${
            theme === "dark" ? "border-white/10 bg-black/40" : "border-gray-300 bg-gray-100"
          }`}
          role="tablist"
          aria-label="Chart representation modes"
        >
          <button
            type="button"
            role="tab"
            aria-selected={chartType === "donut"}
            onClick={() => setChartType("donut")}
            className={`rounded-lg px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
              chartType === "donut"
                ? "bg-purple-600 text-white shadow-sm"
                : theme === "dark"
                  ? "text-gray-400 hover:text-white"
                  : "text-gray-600 hover:text-black"
            }`}
          >
            Donut
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={chartType === "bar"}
            onClick={() => setChartType("bar")}
            className={`rounded-lg px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
              chartType === "bar"
                ? "bg-purple-600 text-white shadow-sm"
                : theme === "dark"
                  ? "text-gray-400 hover:text-white"
                  : "text-gray-600 hover:text-black"
            }`}
          >
            Horizontal Bar
          </button>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="mt-6 flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-around">
        {/* DONUT REPRESENTATION */}
        {chartType === "donut" && (
          <div className="relative flex shrink-0 items-center justify-center">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="transform -rotate-90"
              role="img"
              aria-label={`Donut chart of skills distribution showing ${displaySkills
                .map((s) => `${s.name} ${s.percentage}%`)
                .join(", ")}`}
            >
              <title id={`svg-title-${chartId}`}>Skill Distribution Donut Chart</title>
              <desc id={`svg-desc-${chartId}`}>
                Breakdown of top languages based on public repository usage.
              </desc>

              {/* Background circle track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "#e2e8f0"}
                strokeWidth={strokeWidth}
              />

              {/* Segments */}
              {donutSegments.map((segment) => {
                const isHovered = activeSkill?.name === segment.name;
                return (
                  <circle
                    key={segment.name}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={segment.color.fill}
                    strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                    strokeDasharray={segment.strokeDasharray}
                    strokeDashoffset={segment.strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-300 cursor-pointer focus:outline-none"
                    tabIndex={0}
                    role="graphics-symbol"
                    aria-label={`${segment.name}: ${segment.percentage}% (${segment.repository_count} repos)`}
                    onMouseEnter={() => setActiveSkill(segment)}
                    onMouseLeave={() => setActiveSkill(null)}
                    onFocus={() => setActiveSkill(segment)}
                    onBlur={() => setActiveSkill(null)}
                  />
                );
              })}
            </svg>

            {/* Center Callout Indicator */}
            <div
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4"
              aria-hidden="true"
            >
              {activeSkill ? (
                <>
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{
                      color:
                        activeSkill.name === "Other Technologies"
                          ? "#94a3b8"
                          : CHART_PALETTE[
                              displaySkills.findIndex((s) => s.name === activeSkill.name) %
                                CHART_PALETTE.length
                            ]?.text || "#c4b5fd",
                    }}
                  >
                    {activeSkill.name}
                  </span>
                  <span className="text-2xl font-extrabold sm:text-3xl tracking-tight">
                    {activeSkill.percentage}%
                  </span>
                  <span
                    className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {activeSkill.repository_count}{" "}
                    {activeSkill.repository_count === 1 ? "repo" : "repos"}
                  </span>
                </>
              ) : isSingleSkill ? (
                <>
                  <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                    Specialized
                  </span>
                  <span className="text-3xl font-extrabold tracking-tight">100%</span>
                  <span
                    className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {skills[0].name}
                  </span>
                </>
              ) : (
                <>
                  <span
                    className={`text-xs font-medium uppercase tracking-wider ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Total Analyzed
                  </span>
                  <span className="text-2xl font-extrabold sm:text-3xl tracking-tight">
                    {displaySkills.length}
                  </span>
                  <span
                    className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Languages
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* HORIZONTAL BAR REPRESENTATION */}
        {chartType === "bar" && (
          <div
            className="w-full flex-1 space-y-3.5"
            role="list"
            aria-label="Skill distribution bar breakdown"
          >
            {displaySkills.map((skill) => {
              const barWidth = Math.max((skill.repository_count / maxRepoCount) * 100, 4);
              const isHovered = activeSkill?.name === skill.name;

              return (
                <div
                  key={skill.name}
                  role="listitem"
                  tabIndex={0}
                  onMouseEnter={() => setActiveSkill(skill)}
                  onMouseLeave={() => setActiveSkill(null)}
                  onFocus={() => setActiveSkill(skill)}
                  onBlur={() => setActiveSkill(null)}
                  className={`group rounded-xl p-2.5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                    isHovered
                      ? theme === "dark"
                        ? "bg-white/10"
                        : "bg-gray-100"
                      : "hover:bg-white/5"
                  }`}
                  aria-label={`${skill.name}: ${skill.percentage}%, ${skill.repository_count} repositories`}
                >
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: skill.color.fill }}
                        aria-hidden="true"
                      />
                      <span className="font-semibold">{skill.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs ${
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {skill.repository_count} {skill.repository_count === 1 ? "repo" : "repos"}
                      </span>
                      <span className="font-mono font-bold text-xs">{skill.percentage}%</span>
                    </div>
                  </div>

                  {/* Progress track */}
                  <div
                    className={`mt-2 h-2.5 w-full overflow-hidden rounded-full ${
                      theme === "dark" ? "bg-white/10" : "bg-gray-200"
                    }`}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: skill.color.fill,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend Panel */}
        <div
          className="w-full lg:max-w-xs rounded-2xl border p-4 bg-black/20 border-white/5"
          role="region"
          aria-label="Skill chart legend"
        >
          <div className="flex items-center justify-between border-b pb-2 mb-3 border-white/5">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Skill Legend
            </span>
            <span className="text-xs text-gray-500">{displaySkills.length} items</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
            {displaySkills.map((skill) => {
              const isHovered = activeSkill?.name === skill.name;
              return (
                <button
                  key={skill.name}
                  type="button"
                  onClick={() => setActiveSkill(activeSkill?.name === skill.name ? null : skill)}
                  onMouseEnter={() => setActiveSkill(skill)}
                  onMouseLeave={() => setActiveSkill(null)}
                  className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                    isHovered ? "bg-white/10 ring-1 ring-white/20" : "hover:bg-white/5"
                  }`}
                  aria-pressed={isHovered}
                  aria-label={`Highlight ${skill.name} in chart`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: skill.color.fill }}
                      aria-hidden="true"
                    />
                    <span className="truncate font-medium">{skill.name}</span>
                  </div>

                  <span className="font-semibold text-gray-400 ml-2">{skill.percentage}%</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Accessible Table Fallback (WCAG 2.1 AA Compliance) */}
      <div className="mt-6 border-t pt-4 border-white/5">
        <button
          type="button"
          onClick={() => setShowTable((prev) => !prev)}
          className={`flex items-center gap-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-lg px-2 py-1 ${
            theme === "dark"
              ? "text-purple-300 hover:text-purple-200"
              : "text-purple-700 hover:text-purple-900"
          }`}
          aria-expanded={showTable}
          aria-controls={`accessible-table-${chartId}`}
        >
          <span>{showTable ? "▼ Hide" : "▶ Show"}</span>
          <span>Accessible Data Table Fallback (Screen Reader Friendly)</span>
        </button>

        {showTable && (
          <div
            id={`accessible-table-${chartId}`}
            className="mt-3 overflow-x-auto rounded-xl border border-white/10"
          >
            <table className="w-full text-left text-xs">
              <caption className="sr-only">
                Skill breakdown with repository counts and percentages
              </caption>
              <thead
                className={`border-b ${
                  theme === "dark"
                    ? "border-white/10 bg-white/5 text-gray-300"
                    : "border-gray-200 bg-gray-100 text-gray-700"
                }`}
              >
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Skill / Technology
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-right">
                    Repository Count
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-right">
                    Share Percentage
                  </th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${theme === "dark" ? "divide-white/5" : "divide-gray-200"}`}
              >
                {displaySkills.map((skill) => (
                  <tr
                    key={skill.name}
                    className={`transition-colors ${
                      activeSkill?.name === skill.name
                        ? "bg-purple-500/10"
                        : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="px-4 py-2 font-medium flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: skill.color.fill }}
                        aria-hidden="true"
                      />
                      {skill.name}
                    </td>
                    <td className="px-4 py-2 text-right">{skill.repository_count}</td>
                    <td className="px-4 py-2 text-right font-mono font-semibold">
                      {skill.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
