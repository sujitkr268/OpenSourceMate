import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found | OpenSourceMate",
  description: "The page you are looking for does not exist on OpenSourceMate.",
};

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#05070d] text-white px-4 sm:px-6 py-16">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-purple-500/10 blur-[130px]" />
        <div className="absolute right-[-100px] bottom-1/4 h-[400px] w-[400px] rounded-full bg-blue-500/10 blur-[100px]" />
      </div>

      <div className="mx-auto w-full max-w-xl text-center">
        {/* Top Tag */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-xs font-semibold text-purple-300">
          <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" aria-hidden="true" />
          ERROR 404 • ROUTE NOT FOUND
        </div>

        {/* 404 Big Glowing Display */}
        <h1 className="text-7xl font-extrabold tracking-tight sm:text-8xl md:text-9xl">
          <span className="bg-gradient-to-b from-white via-gray-200 to-gray-600 bg-clip-text text-transparent">
            404
          </span>
        </h1>

        <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl text-gray-100">
          Looks like you&apos;ve wandered into unmapped territory.
        </h2>

        <p className="mt-3 text-sm leading-6 text-gray-400 sm:text-base">
          The page or route you were looking for doesn&apos;t exist, has been removed, or has moved
          to a new URL. Don&apos;t worry—your open-source journey isn&apos;t lost!
        </p>

        {/* Interactive Action Cards & Links */}
        <div className="mt-10 grid gap-3 sm:grid-cols-2 text-left">
          <Link
            href="/"
            className="group rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition-all duration-200 hover:border-purple-400/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            <div className="flex items-center justify-between">
              <span className="text-xl" aria-hidden="true">
                🏠
              </span>
              <span className="text-xs text-purple-400 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-white">Home Page</h3>
            <p className="mt-1 text-xs text-gray-400">Return to the landing page and overview.</p>
          </Link>

          <Link
            href="/#analyzer"
            className="group rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition-all duration-200 hover:border-purple-400/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            <div className="flex items-center justify-between">
              <span className="text-xl" aria-hidden="true">
                🔍
              </span>
              <span className="text-xs text-purple-400 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-white">Profile Analyzer</h3>
            <p className="mt-1 text-xs text-gray-400">
              Analyze your GitHub profile and discover issues.
            </p>
          </Link>
        </div>

        {/* Primary Action Button */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            ← Return to Home
          </Link>
          <Link
            href="/#analyzer"
            className="w-full sm:w-auto rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            Open Analyzer ↗
          </Link>
        </div>

        {/* Footer Note */}
        <p className="mt-12 text-xs text-gray-600">
          OpenSourceMate • Find open-source opportunities that match your skills.
        </p>
      </div>
    </div>
  );
}
