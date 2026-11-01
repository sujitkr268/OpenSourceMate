"use client";

import React, { useEffect, useRef, useState } from "react";
import { type ExportFormat } from "../utils/exportAnalysis";

export interface ExportMenuProps {
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
  className?: string;
}

interface FormatOption {
  format: ExportFormat;
  label: string;
  badge: string;
  description: string;
  icon: (props: { className?: string }) => React.ReactElement;
}

function JsonIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
      />
    </svg>
  );
}

function CsvIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h18M3 14h18m-9-4v8m-7 4h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function MarkdownIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    format: "json",
    label: "JSON Export",
    badge: ".json",
    description: "Structured raw data for automated scripts and API tools",
    icon: JsonIcon,
  },
  {
    format: "csv",
    label: "CSV Spreadsheet",
    badge: ".csv",
    description: "Tabular skills and metrics for Excel or Google Sheets",
    icon: CsvIcon,
  },
  {
    format: "markdown",
    label: "Markdown Report",
    badge: ".md",
    description: "Formatted document ideal for GitHub profiles or notes",
    icon: MarkdownIcon,
  },
];

export default function ExportMenu({
  onExport,
  disabled = false,
  className = "",
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard events inside the menu
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (
        event.key === "ArrowDown" ||
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        break;
      case "ArrowDown":
        event.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % FORMAT_OPTIONS.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setFocusedIndex((prev) =>
          prev <= 0 ? FORMAT_OPTIONS.length - 1 : prev - 1
        );
        break;
      case "Home":
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case "End":
        event.preventDefault();
        setFocusedIndex(FORMAT_OPTIONS.length - 1);
        break;
      case "Enter":
      case " ":
        if (focusedIndex >= 0 && focusedIndex < FORMAT_OPTIONS.length) {
          event.preventDefault();
          handleSelect(FORMAT_OPTIONS[focusedIndex].format);
        }
        break;
      case "Tab":
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  const handleSelect = (format: ExportFormat) => {
    onExport(format);
    setIsOpen(false);
    setFocusedIndex(-1);
    buttonRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Export analysis results as JSON, CSV or Markdown"
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 border shadow-xs ${
          disabled
            ? "opacity-50 cursor-not-allowed bg-slate-800 text-slate-400 border-slate-700"
            : isOpen
            ? "bg-slate-800 text-white border-blue-500/50 shadow-blue-500/10 ring-2 ring-blue-500/20"
            : "bg-slate-900/80 text-slate-200 border-slate-700/80 hover:bg-slate-800 hover:text-white hover:border-slate-600"
        }`}
      >
        <svg
          className="w-4 h-4 text-blue-400 transition-transform duration-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span>Export</span>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-400" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          aria-label="Export formats"
          className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-2 shadow-2xl shadow-black/50 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Download Analysis Report
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Select your preferred export format
            </p>
          </div>

          <div className="space-y-1">
            {FORMAT_OPTIONS.map((opt, index) => {
              const Icon = opt.icon;
              const isFocused = focusedIndex === index;
              return (
                <button
                  key={opt.format}
                  role="menuitem"
                  type="button"
                  onClick={() => handleSelect(opt.format)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-colors duration-150 ${
                    isFocused
                      ? "bg-blue-600/15 text-white border border-blue-500/30"
                      : "text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent"
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-blue-400 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-200">
                        {opt.label}
                      </span>
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/60">
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
