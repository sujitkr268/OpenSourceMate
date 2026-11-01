"use client";
import { useEffect, useMemo, useState } from "react";
import ExportMenu from "../components/ExportMenu";
import GitHubLink from "../components/GitHubLink";
import ProfileCard from "../components/ProfileCard";
import RecentSearches from "../components/RecentSearches";
import SkillChart from "../components/SkillChart";
import SkillProficiencyBadge from "../components/SkillProficiencyBadge";
import {
  type GitHubUserProfile as Profile,
  type SkillItem as Skill,
  type UserSkillsResponse as SkillsData,
  type IssueRecommendation as Recommendation,
} from "../types/api";
import {
  fetchUserProfile,
  fetchUserSkills,
  fetchMatchedIssues as apiFetchMatchedIssues,
  createSearchSignal,
  cancelPendingSearch,
  isAbortError,
  ApiClientError,
} from "../utils/apiClient";
import {
  exportAnalysisData,
  type ExportFormat,
  type ExportPayload,
} from "../utils/exportAnalysis";
import {
  getRecentSearches,
  saveRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from "../utils/recentSearches";
import {
  validateGitHubUsername,
  resolveAnalyzerErrorMessage,
} from "../utils/validation";

export default function Home() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const timer = setTimeout(() => {
      const savedTheme = localStorage.getItem("theme");

      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle keyboard navigation: close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<SkillsData | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingMatching, setLoadingMatching] = useState(false);
  const [matchingError, setMatchingError] = useState("");

  // Filters for recommended issues (Issue #47)
  const [languageFilter, setLanguageFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("all");
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");

  const [error, setError] = useState("");
  const [lastAnalyzed, setLastAnalyzed] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRecentSearches(getRecentSearches());
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleSelectRecent = (recentUser: string) => {
    setUsername(recentUser);
    analyzeProfile(recentUser);
  };

  const handleRemoveRecent = (recentUser: string) => {
    const updated = removeRecentSearch(recentUser);
    setRecentSearches(updated);
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  useEffect(() => {
    return () => {
      cancelPendingSearch();
    };
  }, []);

  const fetchMatchedIssues = async (targetUsername: string, signal?: AbortSignal) => {
    setLoadingMatching(true);
    setMatchingError("");

    try {
      const matchData = await apiFetchMatchedIssues(targetUsername, { signal });
      setRecommendations(matchData.recommendations || []);
    } catch (err: unknown) {
      if (isAbortError(err)) return;
      setMatchingError("Unable to load recommended issues. Please try again later.");
    } finally {
      setLoadingMatching(false);
    }
  };

  const handleExport = (format: ExportFormat) => {
    if (!profile) return;

    const payload: ExportPayload = {
      username: profile.username,
      name: profile.name,
      bio: profile.bio,
      profileUrl: profile.profile_url,
      repositoriesCount: profile.public_repositories,
      followers: profile.followers,
      following: profile.following,
      skills: skills?.skills || [],
      totalRepositoriesAnalyzed: skills?.total_repositories_analyzed || 0,
      exportedAt: new Date().toISOString().split("T")[0],
    };

    exportAnalysisData(payload, format);
  };

  // Dynamic language options extracted from recommendations
  const availableLanguages = useMemo(() => {
    const langs = new Set<string>();
    recommendations.forEach((rec) => {
      if (rec.language) langs.add(rec.language);
    });
    return Array.from(langs).sort();
  }, [recommendations]);

  // Client-side filtering logic (Issue #47)
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((rec) => {
      if (
        languageFilter !== "all" &&
        rec.language?.toLowerCase() !== languageFilter.toLowerCase()
      ) {
        return false;
      }

      if (labelFilter === "good-first-issue") {
        const hasGFI = rec.labels?.some((l) =>
          l.toLowerCase().includes("good first issue")
        );
        if (!hasGFI) return false;
      } else if (labelFilter === "help-wanted") {
        const hasHW = rec.labels?.some((l) =>
          l.toLowerCase().includes("help wanted")
        );
        if (!hasHW) return false;
      }

      const score = rec.match_score ?? rec.score ?? 0;
      if (score < minScoreFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = rec.title?.toLowerCase().includes(q);
        const matchesRepo = rec.repository?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesRepo) return false;
      }

      return true;
    });
  }, [
    recommendations,
    languageFilter,
    labelFilter,
    minScoreFilter,
    searchQuery,
  ]);

  const hasActiveFilters =
    languageFilter !== "all" ||
    labelFilter !== "all" ||
    minScoreFilter > 0 ||
    searchQuery.trim().length > 0;

  const resetFilters = () => {
    setLanguageFilter("all");
    setLabelFilter("all");
    setMinScoreFilter(0);
    setSearchQuery("");
  };

  const analyzeProfile = async (override?: string) => {
    const raw = override ?? username;
    const validation = validateGitHubUsername(raw);

    if (!validation.isValid) {
      setError(validation.error || "Please enter a valid GitHub username.");
      return;
    }

    const cleanUsername = validation.cleanUsername;

    if (loading) return;

    setUsername(cleanUsername);
    setLastAnalyzed(cleanUsername);
    setCanRetry(false);
    setLoading(true);
    setError("");

    // Only clear previous analysis if analyzing a different username
    if (cleanUsername.toLowerCase() !== profile?.username?.toLowerCase()) {
      setProfile(null);
      setSkills(null);
      setRecommendations([]);
    }

    const searchSignal = createSearchSignal();

    try {
      const profileData = await fetchUserProfile(cleanUsername, { signal: searchSignal });
      const skillsData = await fetchUserSkills(cleanUsername, { signal: searchSignal });

      setProfile(profileData);
      setSkills(skillsData);

      // Save to recent searches on successful analysis
      const updatedSearches = saveRecentSearch(cleanUsername);
      setRecentSearches(updatedSearches);

      fetchMatchedIssues(cleanUsername, searchSignal);
    } catch (err: unknown) {
      if (isAbortError(err)) {
        return; // Prior in-flight search was aborted by a new search
      }
      setCanRetry(true);
      if (err instanceof ApiClientError) {
        if (err.status === 404) {
          setError(resolveAnalyzerErrorMessage(404, { username: cleanUsername }));
          return;
        }
        if (err.status === 429) {
          setError(resolveAnalyzerErrorMessage(429, { resetAt: err.resetAt }));
          return;
        }
        if (err.status === 502 || err.status === 503 || err.status === 504) {
          setError(resolveAnalyzerErrorMessage(err.status));
          return;
        }
        if (err.code === "NETWORK_ERROR" || err.status === 0) {
          setError(resolveAnalyzerErrorMessage(new TypeError(err.message)));
          return;
        }
      }
      setError(resolveAnalyzerErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Skip to Main Content Link for Keyboard Accessibility (WCAG 2.1 AA) */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div
        className={`min-h-screen transition-colors duration-300 ${
          theme === "dark"
            ? "bg-[#05070d] text-white"
            : "bg-gray-50 text-gray-900"
        }`}
      >
        {/* Background decorative gradient */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute left-1/2 top-[-250px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-purple-500/10 blur-[120px]" />
          <div className="absolute right-[-200px] top-[400px] h-[400px] w-[400px] rounded-full bg-blue-500/5 blur-[100px]" />
        </div>

        {/* Header and Navigation */}
        <header
          role="banner"
          className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-colors duration-300 ${
            theme === "dark"
              ? "border-white/5 bg-[#05070d]/80"
              : "border-gray-200 bg-white/90"
          }`}
        >
          <nav
            aria-label="Main Navigation"
            className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg"
                aria-hidden="true"
              >
                ✦
              </div>

              <span className="text-lg font-semibold tracking-tight">
                OpenSourceMate
              </span>
            </div>

            {/* Desktop Navigation */}
            <div
              className={`hidden items-center gap-6 text-sm md:flex lg:gap-8 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}
            >
              <a
                href="#how-it-works"
                className="rounded-lg px-2 py-1 transition hover:text-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                How it works
              </a>

              <a
                href="#analyzer"
                className="rounded-lg px-2 py-1 transition hover:text-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                Analyzer
              </a>

              <GitHubLink className="rounded-lg px-2 py-1 transition hover:text-purple-400" />

              <button
                type="button"
                onClick={() =>
                  setTheme((current) => (current === "dark" ? "light" : "dark"))
                }
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                aria-pressed={theme === "light"}
                className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                  theme === "dark"
                    ? "border-white/10 bg-white/5 text-gray-200 hover:bg-white/10"
                    : "border-gray-300 bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                {theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode"}
              </button>
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={() =>
                  setTheme((current) => (current === "dark" ? "light" : "dark"))
                }
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-sm"
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-gray-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                {mobileMenuOpen ? (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </nav>

          {/* Mobile dropdown menu */}
          {mobileMenuOpen && (
            <div
              id="mobile-navigation"
              role="region"
              aria-label="Mobile Navigation Menu"
              className={`border-t px-6 py-4 shadow-2xl backdrop-blur-2xl md:hidden ${
                theme === "dark"
                  ? "border-white/5 bg-[#05070d]/95 text-gray-200"
                  : "border-gray-200 bg-white/95 text-gray-800"
              }`}
            >
              <div className="flex flex-col gap-3 text-sm">
                <a
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  How it works
                </a>

                <a
                  href="#analyzer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  Analyzer
                </a>

                <div
                  className="rounded-xl px-3 py-2 transition hover:bg-white/10"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <GitHubLink className="transition hover:text-purple-400" />
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Main Content Landmark */}
        <main id="main-content" tabIndex={-1} className="outline-none">
          {/* Hero Section */}
          <section
            aria-labelledby="hero-heading"
            className="px-4 pb-12 pt-16 sm:px-6 sm:pb-16 sm:pt-24 lg:pt-28"
          >
            <div className="mx-auto max-w-5xl text-center">
              <div
                className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs sm:text-sm font-medium ${
                  theme === "dark"
                    ? "border-white/10 bg-white/[0.04] text-gray-200"
                    : "border-gray-300 bg-white text-gray-800 shadow-sm"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                Open-source contribution discovery
              </div>

              <h1
                id="hero-heading"
                className="mx-auto max-w-4xl text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
              >
                Find the open-source issues
                <span
                  className={`block bg-clip-text text-transparent ${
                    theme === "dark"
                      ? "bg-gradient-to-r from-white via-gray-200 to-gray-400"
                      : "bg-gradient-to-r from-purple-700 via-indigo-800 to-blue-700"
                  }`}
                >
                  that fit your skills.
                </span>
              </h1>

              <p
                className={`mx-auto mt-6 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7 md:text-lg ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                OpenSourceMate analyzes your GitHub profile and technical
                experience to help you discover meaningful open-source
                contribution opportunities.
              </p>
            </div>
          </section>

          {/* Analyzer Section */}
          <section
            id="analyzer"
            aria-labelledby="analyzer-heading"
            className="px-4 pb-16 sm:px-6 sm:pb-20"
          >
            <div className="mx-auto max-w-3xl">
              <h2 id="analyzer-heading" className="sr-only">
                GitHub Profile Analyzer
              </h2>

              <div
                className={`rounded-3xl border p-3 shadow-2xl backdrop-blur-xl sm:p-4 ${
                  theme === "dark"
                    ? "border-white/10 bg-white/[0.035] shadow-black/30"
                    : "border-gray-200 bg-white shadow-gray-300/40"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div
                    className={`flex flex-1 items-center rounded-2xl border px-3 sm:px-5 ${
                      theme === "dark"
                        ? "border-white/10 bg-black/30 focus-within:border-purple-400/50"
                        : "border-gray-300 bg-white focus-within:border-purple-500"
                    }`}
                  >
                    <span className="mr-2 text-gray-500 sm:mr-3" aria-hidden="true">
                      @
                    </span>

                    <label htmlFor="github-username-input" className="sr-only">
                      GitHub username
                    </label>

                    <input
                      id="github-username-input"
                      type="text"
                      placeholder="Enter your GitHub username"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (error) setError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !loading) {
                          analyzeProfile();
                        }
                      }}
                      aria-label="GitHub username"
                      aria-required="true"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? "analyzer-error" : "username-hint"}
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className={`w-full bg-transparent py-3.5 text-sm outline-none sm:py-4 sm:text-base ${
                        theme === "dark"
                          ? "text-white placeholder:text-gray-500"
                          : "text-gray-900 placeholder:text-gray-500"
                      }`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => analyzeProfile()}
                    disabled={loading}
                    aria-busy={loading}
                    className="rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:px-7 sm:py-4 sm:text-base"
                  >
                    {loading ? "Analyzing..." : "Analyze Profile"}
                  </button>
                </div>

                <RecentSearches
                  searches={recentSearches}
                  onSelect={handleSelectRecent}
                  onRemove={handleRemoveRecent}
                  onClear={handleClearRecent}
                  theme={theme}
                />

                <span id="username-hint" className="sr-only">
                  Provide a public GitHub username to analyze technical skills and receive matched issues.
                </span>
              </div>

              {/* Accessible Error Alert (WCAG 2.1 AA: Assertive live region) */}
              {error && (
                <div
                  id="analyzer-error"
                  role="alert"
                  aria-live="assertive"
                  aria-atomic="true"
                  className="mt-4 flex flex-col items-center justify-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm font-medium text-red-300 sm:flex-row"
                >
                  <span>{error}</span>
                  {canRetry && lastAnalyzed && !loading && (
                    <button
                      type="button"
                      onClick={() => analyzeProfile(lastAnalyzed)}
                      className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              <p
                className={`mt-4 text-center text-xs ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              >
                No GitHub login required • Public profile data only
              </p>
            </div>
          </section>

          {/* Loading Skeleton */}
          {loading && (
            <section
              className="px-4 pb-24 sm:px-6"
              aria-busy="true"
              aria-label="Analyzing profile in progress"
            >
              <div className="mx-auto max-w-5xl">
                <ProfileSkeleton />
                <SkillsSkeleton />
              </div>
            </section>
          )}

          {/* Analysis Results (WCAG 2.1 AA: Polite live region) */}
          {(profile || skills) && (
            <section
              id="analysis-results"
              aria-live="polite"
              aria-atomic="false"
              className="px-4 pb-24 sm:px-6"
            >
              <div className="mx-auto max-w-5xl">
                {/* Section heading */}
                <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs font-semibold tracking-wider text-purple-400 uppercase sm:text-sm">
                      PROFILE ANALYSIS
                    </p>

                    <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                      Your developer profile
                    </h2>

                    <p
                      className={`mt-2 text-sm ${
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      Here&apos;s what OpenSourceMate discovered from your GitHub activity.
                    </p>
                  </div>

                  {profile && (
                    <ExportMenu onExport={handleExport} />
                  )}
                </div>

                {/* Profile card */}
                {profile && (
                  <ProfileCard
                    profile={profile}
                    onExport={(format) => handleExport(format)}
                    className="mb-8"
                  />
                )}

                {/* Skills Section */}
                {skills && (
                  <div
                    className={`mt-6 rounded-3xl border p-5 sm:p-8 ${
                      theme === "dark"
                        ? "border-white/10 bg-white/[0.035]"
                        : "border-gray-200 bg-white shadow-sm"
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                      <div>
                        <p className="text-xs font-semibold tracking-wider text-purple-400 uppercase sm:text-sm">
                          TECHNICAL PROFILE
                        </p>

                        <h3 className="mt-2 text-2xl font-bold">
                          Your technical skills
                        </h3>

                        <p
                          className={`mt-2 text-sm ${
                            theme === "dark" ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          Detected from your public GitHub repositories.
                        </p>
                      </div>

                      <div
                        className={`text-xs sm:text-sm ${
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {skills.total_repositories_analyzed} repositories analyzed
                      </div>
                    </div>

                    {skills.skills.length === 0 ? (
                      <div
                        className={`mt-8 rounded-2xl border border-dashed p-8 text-center ${
                          theme === "dark" ? "border-white/10" : "border-gray-300"
                        }`}
                      >
                        <p
                          className={
                            theme === "dark" ? "text-gray-300" : "text-gray-600"
                          }
                        >
                          No public repositories with a language were found for this
                          profile, so there are no skills to show yet.
                        </p>
                      </div>
                    ) : (
                      <>
                        <SkillChart
                          skills={skills.skills}
                          totalRepositories={skills.total_repositories_analyzed}
                          theme={theme}
                          className="mt-8"
                        />

                        <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5">
                          {skills.skills.map((skill) => (
                            <SkillCard
                              key={skill.name}
                              skill={skill}
                              theme={theme}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Recommended Issues Section */}
                <div
                  id="recommendations"
                  className={`mt-6 rounded-3xl border p-5 sm:p-8 ${
                    theme === "dark"
                      ? "border-purple-500/20 bg-white/[0.035]"
                      : "border-purple-200 bg-white shadow-sm"
                  }`}
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div>
                      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1 text-xs font-medium text-purple-300">
                        <span aria-hidden="true">🎯</span> MATCHED ISSUES
                      </div>

                      <h3 className="text-2xl font-bold tracking-tight">
                        Recommended contribution opportunities
                      </h3>

                      <p
                        className={`mt-2 text-sm ${
                          theme === "dark" ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        Opportunities matching your skills and experience, ranked by compatibility score.
                      </p>
                    </div>

                    {recommendations.length > 0 && (
                      <div
                        className={`text-xs sm:text-sm ${
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Showing {filteredRecommendations.length} of {recommendations.length} issues
                      </div>
                    )}
                  </div>

                  {/* Filter Toolbar (Issue #47) */}
                  {recommendations.length > 0 && (
                    <div
                      className={`mt-6 rounded-2xl border p-4 ${
                        theme === "dark"
                          ? "border-white/5 bg-black/20"
                          : "border-gray-200 bg-gray-50/50"
                      }`}
                    >
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Search input filter */}
                        <div>
                          <label
                            htmlFor="issue-search-filter"
                            className="block text-xs font-semibold text-gray-400"
                          >
                            Search issues
                          </label>
                          <input
                            id="issue-search-filter"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter by title or repo..."
                            className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-xs outline-none transition ${
                              theme === "dark"
                                ? "border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-purple-400"
                                : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-purple-600"
                            }`}
                          />
                        </div>

                        {/* Language filter dropdown */}
                        <div>
                          <label
                            htmlFor="issue-lang-filter"
                            className="block text-xs font-semibold text-gray-400"
                          >
                            Language
                          </label>
                          <select
                            id="issue-lang-filter"
                            value={languageFilter}
                            onChange={(e) => setLanguageFilter(e.target.value)}
                            className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-xs outline-none transition ${
                              theme === "dark"
                                ? "border-white/10 bg-[#0c101d] text-white focus:border-purple-400"
                                : "border-gray-300 bg-white text-gray-900 focus:border-purple-600"
                            }`}
                          >
                            <option value="all">All Languages</option>
                            {availableLanguages.map((lang) => (
                              <option key={lang} value={lang}>
                                {lang}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Label type filter dropdown */}
                        <div>
                          <label
                            htmlFor="issue-label-filter"
                            className="block text-xs font-semibold text-gray-400"
                          >
                            Label Type
                          </label>
                          <select
                            id="issue-label-filter"
                            value={labelFilter}
                            onChange={(e) => setLabelFilter(e.target.value)}
                            className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-xs outline-none transition ${
                              theme === "dark"
                                ? "border-white/10 bg-[#0c101d] text-white focus:border-purple-400"
                                : "border-gray-300 bg-white text-gray-900 focus:border-purple-600"
                            }`}
                          >
                            <option value="all">All Labels</option>
                            <option value="good-first-issue">Good First Issue</option>
                            <option value="help-wanted">Help Wanted</option>
                          </select>
                        </div>

                        {/* Minimum match score selector */}
                        <div>
                          <label
                            htmlFor="issue-score-filter"
                            className="block text-xs font-semibold text-gray-400"
                          >
                            Min Match: {minScoreFilter}%
                          </label>
                          <input
                            id="issue-score-filter"
                            type="range"
                            min="0"
                            max="90"
                            step="10"
                            value={minScoreFilter}
                            onChange={(e) => setMinScoreFilter(Number(e.target.value))}
                            className="mt-2.5 w-full accent-purple-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      {hasActiveFilters && (
                        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-xs">
                          <span className="text-gray-400">
                            Active filters applied
                          </span>
                          <button
                            type="button"
                            onClick={resetFilters}
                            className="text-purple-400 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-400 rounded"
                          >
                            Reset filters
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Loading State */}
                  {loadingMatching && (
                    <div className="mt-6 space-y-4">
                      {[0, 1].map((i) => (
                        <div
                          key={i}
                          className="rounded-2xl border border-white/5 bg-black/20 p-5"
                        >
                          <div className="flex items-center justify-between">
                            <Bar className="h-4 w-40" />
                            <Bar className="h-6 w-14" />
                          </div>
                          <Bar className="mt-3 h-5 w-3/4" />
                          <div className="mt-4 flex gap-2">
                            <Bar className="h-6 w-16" />
                            <Bar className="h-6 w-20" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Filter Empty State (Issue #47) */}
                  {!loadingMatching &&
                    recommendations.length > 0 &&
                    filteredRecommendations.length === 0 && (
                      <div
                        className={`mt-8 rounded-2xl border border-dashed p-8 text-center ${
                          theme === "dark" ? "border-white/10" : "border-gray-300"
                        }`}
                      >
                        <p
                          className={`text-sm font-medium ${
                            theme === "dark" ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          No issues match the selected filter criteria.
                        </p>
                        <p
                          className={`mt-1 text-xs ${
                            theme === "dark" ? "text-gray-500" : "text-gray-400"
                          }`}
                        >
                          Try resetting filters to view all recommended contribution opportunities.
                        </p>
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="mt-4 inline-flex items-center rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-purple-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                        >
                          Clear Filters
                        </button>
                      </div>
                    )}

                  {/* Error State */}
                  {!loadingMatching && matchingError && (
                    <div
                      role="alert"
                      className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-center text-sm font-medium text-red-300"
                    >
                      {matchingError}
                    </div>
                  )}

                  {/* Empty State */}
                  {!loadingMatching && !matchingError && recommendations.length === 0 && (
                    <div
                      className={`mt-8 rounded-2xl border border-dashed p-10 text-center ${
                        theme === "dark" ? "border-white/10" : "border-gray-300"
                      }`}
                    >
                      <p
                        className={
                          theme === "dark" ? "text-gray-300" : "text-gray-600"
                        }
                      >
                        No matching open issues found for the detected skills at this time.
                      </p>
                    </div>
                  )}

                  {/* Issue list */}
                  {!loadingMatching && filteredRecommendations.length > 0 && (
                    <div className="mt-6 space-y-4">
                      {filteredRecommendations.map((issue) => (
                        <IssueCard key={issue.id} issue={issue} theme={theme} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* How it works */}
          <section
            id="how-it-works"
            aria-labelledby="how-it-works-heading"
            className={`border-y px-4 py-16 sm:px-6 sm:py-24 ${
              theme === "dark"
                ? "border-white/5 bg-white/[0.015]"
                : "border-gray-200 bg-gray-100/50"
            }`}
          >
            <div className="mx-auto max-w-5xl">
              <div className="text-center">
                <p className="text-xs font-semibold tracking-wider text-purple-400 uppercase sm:text-sm">
                  HOW IT WORKS
                </p>

                <h2
                  id="how-it-works-heading"
                  className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl"
                >
                  From profile to contribution
                </h2>

                <p
                  className={`mx-auto mt-4 max-w-xl text-sm sm:text-base ${
                    theme === "dark" ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  A simple workflow designed to remove the guesswork from
                  getting started with open source.
                </p>
              </div>

              <div className="mt-12 grid gap-5 md:grid-cols-3">
                <StepCard
                  number="01"
                  icon="⌕"
                  title="Analyze your profile"
                  description="Connect your public GitHub profile and understand your existing technical experience."
                  theme={theme}
                />

                <StepCard
                  number="02"
                  icon="✦"
                  title="Understand your skills"
                  description="OpenSourceMate analyzes your repositories to identify the technologies you already work with."
                  theme={theme}
                />

                <StepCard
                  number="03"
                  icon="→"
                  title="Find your match"
                  description="Discover open-source issues that align with your skills and contribution goals."
                  theme={theme}
                />
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="px-4 py-16 sm:px-6 sm:py-24">
            <div
              className={`mx-auto max-w-4xl rounded-3xl border px-6 py-12 text-center sm:px-12 sm:py-16 ${
                theme === "dark"
                  ? "border-white/10 bg-white/[0.035]"
                  : "border-gray-200 bg-white shadow-sm"
              }`}
            >
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl text-black"
                aria-hidden="true"
              >
                ✦
              </div>

              <h2 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                Your next contribution is out there.
              </h2>

              <p
                className={`mx-auto mt-4 max-w-xl text-sm sm:text-base ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Stop scrolling through thousands of issues.
                Start contributing to projects where your skills can make an impact.
              </p>

              <button
                type="button"
                onClick={() => {
                  document
                    .getElementById("analyzer")
                    ?.scrollIntoView({ behavior: "smooth" });
                  document.getElementById("github-username-input")?.focus();
                }}
                className="mt-8 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
              >
                Analyze My GitHub →
              </button>
            </div>
          </section>
        </main>

        {/* Footer Landmark */}
        <footer
          role="contentinfo"
          className={`border-t px-4 py-8 sm:px-6 ${
            theme === "dark" ? "border-white/5" : "border-gray-200"
          }`}
        >
          <div
            className={`mx-auto flex max-w-7xl flex-col gap-4 text-xs sm:flex-row sm:items-center sm:justify-between sm:text-sm ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}
          >
            <p>© {new Date().getFullYear()} OpenSourceMate</p>
            <p>Built for the open-source community.</p>
            <GitHubLink className="transition hover:text-purple-400">
              View Repository ↗
            </GitHubLink>
          </div>
        </footer>
      </div>
    </>
  );
}

/* ---------------------------------- */
/* Reusable Components                */
/* ---------------------------------- */

function SkillCard({
  skill,
  theme,
}: {
  skill: Skill;
  theme?: "dark" | "light";
}) {
  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 ${
        theme === "dark"
          ? "border-white/5 bg-black/20"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold">{skill.name}</h4>
            <SkillProficiencyBadge
              level={skill.proficiency}
              score={skill.proficiency_score}
              reason={skill.proficiency_reason}
              repositoryCount={skill.repository_count}
              percentage={skill.percentage}
              theme={theme}
            />
          </div>

          <p
            className={`mt-1 text-xs ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {skill.repository_count}{" "}
            {skill.repository_count === 1 ? "repository" : "repositories"}
          </p>
        </div>

        <span
          className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
            theme === "dark"
              ? "bg-white/5 text-gray-300"
              : "bg-gray-200 text-gray-800"
          }`}
        >
          {skill.percentage}%
        </span>
      </div>

      <div
        className={`mt-4 h-1.5 overflow-hidden rounded-full ${
          theme === "dark" ? "bg-white/5" : "bg-gray-200"
        }`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-400 to-blue-400 transition-all duration-700"
          style={{ width: `${skill.percentage}%` }}
        />
      </div>
    </div>
  );
}

function IssueCard({
  issue,
  theme,
}: {
  issue: Recommendation;
  theme?: "dark" | "light";
}) {
  const isGoodFirst = issue.labels?.some((l) =>
    l.toLowerCase().includes("good first")
  );
  const isHelpWanted = issue.labels?.some((l) =>
    l.toLowerCase().includes("help wanted")
  );

  const score = Math.round(issue.match_score ?? issue.score ?? 0);
  const reasons = issue.match_reasons ?? issue.reasons ?? [];

  const getScoreBadgeStyle = (val: number) => {
    if (val >= 80)
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
    if (val >= 60) return "border-blue-500/30 bg-blue-500/10 text-blue-400";
    return "border-purple-500/30 bg-purple-500/10 text-purple-400";
  };

  return (
    <article
      aria-label={`${issue.title} in ${issue.repository}`}
      className={`rounded-2xl border p-5 transition hover:border-purple-500/30 ${
        theme === "dark"
          ? "border-white/10 bg-white/[0.02]"
          : "border-gray-200 bg-white shadow-sm"
      }`}
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`font-semibold ${
                theme === "dark" ? "text-purple-400" : "text-purple-600"
              }`}
            >
              {issue.repository}
            </span>

            {issue.language && (
              <>
                <span className="text-gray-500" aria-hidden="true">•</span>
                <span
                  className={
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }
                >
                  {issue.language}
                </span>
              </>
            )}

            {issue.comments > 0 && (
              <>
                <span className="text-gray-500" aria-hidden="true">•</span>
                <span
                  className={
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }
                >
                  {issue.comments} comments
                </span>
              </>
            )}
          </div>

          <h4 className="mt-2 text-base font-semibold leading-snug">
            <a
              href={issue.url}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded"
            >
              {issue.title}
            </a>
          </h4>

          {issue.labels && issue.labels.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Issue labels">
              {issue.labels.slice(0, 5).map((label, idx) => (
                <span
                  key={idx}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                    isGoodFirst && label.toLowerCase().includes("good first")
                      ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                      : isHelpWanted && label.toLowerCase().includes("help wanted")
                      ? "border border-amber-400/30 bg-amber-400/10 text-amber-300"
                      : theme === "dark"
                      ? "border border-white/10 bg-white/5 text-gray-300"
                      : "border border-gray-300 bg-white text-gray-700"
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* AI-Generated Explanation */}
          {issue.explanation && (
            <div
              className={`mt-4 rounded-xl border p-3.5 text-xs ${
                theme === "dark"
                  ? "border-purple-500/20 bg-purple-500/5 text-gray-200"
                  : "border-purple-200 bg-purple-50 text-gray-800"
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-purple-400">
                <span aria-hidden="true">✦</span>
                <span>Why this is recommended for you</span>
                {issue.is_ai_generated && (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[9px] uppercase tracking-wider font-bold ${
                      theme === "dark"
                        ? "bg-purple-400/20 text-purple-300"
                        : "bg-purple-200 text-purple-800"
                    }`}
                  >
                    AI MATCH
                  </span>
                )}
              </div>
              <p
                className={`mt-1 leading-relaxed ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {issue.explanation}
              </p>
            </div>
          )}

          {reasons.length > 0 && (
            <div
              className={`mt-4 rounded-xl border p-3 text-xs ${
                theme === "dark"
                  ? "border-white/5 bg-white/[0.02] text-gray-300"
                  : "border-gray-200 bg-white text-gray-700"
              }`}
            >
              <p className="font-semibold text-purple-400">Why this matches:</p>
              <ul className="mt-1.5 space-y-1">
                {reasons.map((reason, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="text-purple-400" aria-hidden="true">✓</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
          <div
            className={`rounded-xl border px-3 py-1.5 text-center text-xs font-semibold ${getScoreBadgeStyle(
              score
            )}`}
          >
            <span className="text-sm font-bold sm:text-base">{score}%</span>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400">
              Match
            </span>
          </div>

          <a
            href={issue.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open issue "${issue.title}" on GitHub (opens in a new tab)`}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-gray-200 transition hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            View on GitHub ↗
          </a>
        </div>
      </div>
    </article>
  );
}

function StepCard({
  number,
  icon,
  title,
  description,
  theme,
}: {
  number: string;
  icon: string;
  title: string;
  description: string;
  theme: "dark" | "light";
}) {
  return (
    <div
      className={`group rounded-3xl border p-6 transition hover:-translate-y-1 ${
        theme === "dark"
          ? "border-white/10 bg-white/[0.025] hover:bg-white/[0.04]"
          : "border-gray-200 bg-white shadow-sm hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg"
          aria-hidden="true"
        >
          {icon}
        </div>

        <span
          className={`text-xs font-semibold tracking-widest ${
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          }`}
        >
          {number}
        </span>
      </div>

      <h3 className="mt-7 text-lg font-semibold">{title}</h3>

      <p
        className={`mt-3 text-sm leading-6 ${
          theme === "dark" ? "text-gray-300" : "text-gray-600"
        }`}
      >
        {description}
      </p>
    </div>
  );
}

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />;
}

function ProfileSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
      <div className="flex items-center gap-5">
        <div className="h-20 w-20 animate-pulse rounded-2xl bg-white/10 sm:h-24 sm:w-24" />
        <div className="flex-1 space-y-3">
          <Bar className="h-6 w-48" />
          <Bar className="h-4 w-28" />
          <Bar className="h-4 w-full max-w-xl" />
        </div>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-white/5 bg-black/20 p-5">
            <Bar className="h-7 w-16" />
            <Bar className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillsSkeleton() {
  return (
    <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
      <Bar className="h-4 w-32" />
      <Bar className="mt-3 h-7 w-56" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-white/5 bg-black/20 p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Bar className="h-4 w-24" />
                <Bar className="h-3 w-16" />
              </div>
              <Bar className="h-6 w-12" />
            </div>
            <Bar className="mt-5 h-1.5 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
