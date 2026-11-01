"use client";

import React, { useState } from "react";

export interface Profile {
  username: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  public_repositories: number;
  followers: number;
  following: number;
  profile_url: string;
  location?: string | null;
  company?: string | null;
  blog?: string | null;
  twitter_username?: string | null;
  created_at?: string | null;
  public_gists?: number | null;
}

export interface ProfileCardProps {
  profile: Profile;
  onExport?: (format: "markdown" | "json") => void;
  className?: string;
}

/**
 * Normalizes an arbitrary blog or website URL so it always has https:// scheme
 */
export function normalizeWebsiteUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Formats a display label for the website URL (e.g. cleans https:// and trailing slashes)
 */
export function formatWebsiteDisplay(url?: string | null): string {
  if (!url) return "";
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

/**
 * Formats ISO created_at date into "Joined Month Year"
 */
export function formatMemberSince(isoDate?: string | null): string | null {
  if (!isoDate || typeof isoDate !== "string") return null;
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return null;
    return `Joined ${date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })}`;
  } catch {
    return null;
  }
}

/**
 * Parses company string: if starts with @, provides a link to GitHub org
 */
export function parseCompany(company?: string | null): { text: string; url?: string } | null {
  if (!company || typeof company !== "string") return null;
  const trimmed = company.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("@")) {
    const org = trimmed.slice(1).trim();
    if (org) {
      return { text: trimmed, url: `https://github.com/${org}` };
    }
  }
  return { text: trimmed };
}

export default function ProfileCard({ profile, onExport, className = "" }: ProfileCardProps) {
  const [imgError, setImgError] = useState(false);

  const displayName = profile.name && profile.name.trim().length > 0 ? profile.name.trim() : profile.username;
  const hasBio = Boolean(profile.bio && profile.bio.trim().length > 0);
  const memberSince = formatMemberSince(profile.created_at);
  const websiteUrl = normalizeWebsiteUrl(profile.blog);
  const companyInfo = parseCompany(profile.company);
  const hasLocation = Boolean(profile.location && profile.location.trim().length > 0);
  const hasTwitter = Boolean(profile.twitter_username && profile.twitter_username.trim().length > 0);
  const gistsCount = profile.public_gists ?? 0;

  const hasAnyMetadata = Boolean(
    hasLocation || companyInfo || websiteUrl || hasTwitter || memberSince
  );

  return (
    <article
      aria-label={`${displayName}'s GitHub Profile`}
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] shadow-xl backdrop-blur-md transition-all duration-300 hover:border-white/20 ${className}`}
    >
      {/* Top subtle ambient highlight */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-purple-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative p-5 sm:p-7 md:p-8">
        {/* Header: Avatar, Name, Handle, Quick Action */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
            {/* Avatar with fallback */}
            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-white/10 bg-white/5 sm:h-24 sm:w-24">
              {!imgError && profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={`${displayName}'s avatar`}
                  onError={() => setImgError(true)}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-600/30 to-indigo-600/30 text-2xl font-bold text-purple-200"
                  aria-label="Avatar placeholder"
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Name & Handle */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold tracking-tight text-white sm:text-2xl md:text-3xl">
                  {displayName}
                </h3>
                <span className="inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-300">
                  GitHub Dev
                </span>
              </div>

              <div className="mt-1 flex items-center gap-2">
                <p className="text-sm font-medium text-gray-400">@{profile.username}</p>
                {memberSince && (
                  <span className="hidden text-xs text-gray-500 sm:inline">• {memberSince}</span>
                )}
              </div>

              {/* Bio: Shows bio or graceful fallback */}
              <div className="mt-3">
                {hasBio ? (
                  <p className="max-w-2xl text-sm leading-relaxed text-gray-300 sm:text-base">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="text-sm italic text-gray-500">
                    No bio provided
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action Button: View on GitHub */}
          <div className="flex w-full flex-shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <a
              href={profile.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View ${profile.username}'s profile on GitHub (opens in new tab)`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-200 shadow-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 sm:w-auto"
            >
              <span>View GitHub</span>
              <svg
                className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>

            {/* Optional Export Buttons if onExport callback passed */}
            {onExport && (
              <div className="flex gap-2 sm:flex-col">
                <button
                  type="button"
                  onClick={() => onExport("markdown")}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 sm:flex-initial"
                  title="Export analysis as Markdown"
                >
                  Export MD
                </button>
                <button
                  type="button"
                  onClick={() => onExport("json")}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 sm:flex-initial"
                  title="Export analysis as JSON"
                >
                  Export JSON
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Extended Metadata Pills: Location, Company, Website, Twitter, Member Since */}
        {hasAnyMetadata && (
          <div
            className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-white/10 pt-5 text-xs text-gray-400 sm:text-sm"
            data-testid="profile-metadata-container"
          >
            {/* Location */}
            {hasLocation && (
              <div
                className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5"
                title={`Location: ${profile.location}`}
              >
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>{profile.location}</span>
              </div>
            )}

            {/* Company */}
            {companyInfo && (
              <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                {companyInfo.url ? (
                  <a
                    href={companyInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-300 hover:text-purple-200 hover:underline"
                  >
                    {companyInfo.text}
                  </a>
                ) : (
                  <span>{companyInfo.text}</span>
                )}
              </div>
            )}

            {/* Website / Blog */}
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-blue-400 transition hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-300"
                title={`Visit website: ${websiteUrl}`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                <span className="max-w-[180px] truncate">{formatWebsiteDisplay(profile.blog)}</span>
              </a>
            )}

            {/* Twitter / X */}
            {hasTwitter && (
              <a
                href={`https://x.com/${profile.twitter_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-sky-400 transition hover:border-sky-500/30 hover:bg-sky-500/10 hover:text-sky-300"
                title={`Twitter/X: @${profile.twitter_username}`}
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>@{profile.twitter_username}</span>
              </a>
            )}

            {/* Member Since (mobile visible if hidden in header) */}
            {memberSince && (
              <div
                className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 sm:hidden"
                title={memberSince}
              >
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>{memberSince}</span>
              </div>
            )}
          </div>
        )}

        {/* Stats Grid: Repositories, Followers, Following, Gists */}
        <div
          className={`mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 ${
            gistsCount > 0 ? "lg:grid-cols-4" : "md:grid-cols-3"
          }`}
        >
          {/* Repositories */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.04]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Repositories
              </span>
              <svg
                className="h-4 w-4 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {profile.public_repositories.toLocaleString()}
            </p>
          </div>

          {/* Followers */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.04]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Followers
              </span>
              <svg
                className="h-4 w-4 text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {profile.followers.toLocaleString()}
            </p>
          </div>

          {/* Following */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.04]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Following
              </span>
              <svg
                className="h-4 w-4 text-pink-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {profile.following.toLocaleString()}
            </p>
          </div>

          {/* Gists (shown if present) */}
          {gistsCount > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.04]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Public Gists
                </span>
                <svg
                  className="h-4 w-4 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {gistsCount.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
