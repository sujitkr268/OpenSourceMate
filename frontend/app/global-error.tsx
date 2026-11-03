"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#05070d] text-white antialiased">
        <main
          role="main"
          className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-16 text-center"
        >
          <div className="mx-auto w-full max-w-md">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-2xl text-red-400">
              🚨
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Critical System Error</h1>

            <p className="mt-3 text-sm text-gray-400 leading-6">
              A critical layout error occurred in OpenSourceMate. We apologize for the
              inconvenience.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="w-full sm:w-auto rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
              >
                ↻ Refresh Page
              </button>

              <Link
                href="/"
                className="w-full sm:w-auto rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-gray-300 transition hover:bg-white/10 hover:text-white"
              >
                Go to Home
              </Link>
            </div>

            {error.digest && (
              <p className="mt-8 font-mono text-[11px] text-gray-600">Digest: {error.digest}</p>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
