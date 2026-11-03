"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Optionally log error in client telemetry / dev reporting
    // console.error("Segment Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#05070d] text-white px-4 sm:px-6 py-16">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-red-500/10 blur-[130px]" />
        <div className="absolute right-[-100px] bottom-1/4 h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-[100px]" />
      </div>

      <div className="mx-auto w-full max-w-lg text-center">
        {/* Warning Icon Badge */}
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-2xl text-red-400">
          ⚠️
        </div>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-1.5 text-xs font-semibold text-red-300">
          APPLICATION ERROR
        </div>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
          Something went wrong
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-400 sm:text-base">
          An unexpected error occurred while processing this page. You can try reloading the
          component or navigate back to the home page.
        </p>

        {/* Primary Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            ↻ Try Again
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            Return to Home
          </Link>

          <Link
            href="/#analyzer"
            className="w-full sm:w-auto rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            Go to Analyzer
          </Link>
        </div>

        {/* Developer Diagnostics Accordion */}
        <div className="mt-8 border-t border-white/10 pt-6 text-left">
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded px-2 py-1"
            aria-expanded={showDetails}
            aria-controls="error-details-container"
          >
            <span>{showDetails ? "▼ Hide" : "▶ Show"}</span>
            <span>Technical details (for developers)</span>
          </button>

          {showDetails && (
            <div
              id="error-details-container"
              className="mt-3 rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs text-red-300 break-words space-y-2"
            >
              <div>
                <span className="font-semibold text-gray-400">Message: </span>
                <span>{error.message || "Unknown client error"}</span>
              </div>
              {error.digest && (
                <div>
                  <span className="font-semibold text-gray-400">Digest: </span>
                  <span className="text-gray-400">{error.digest}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="mt-10 text-xs text-gray-600">OpenSourceMate • Error Recovery</p>
      </div>
    </div>
  );
}
