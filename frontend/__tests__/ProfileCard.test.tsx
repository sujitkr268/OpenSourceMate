import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfileCard, {
  type Profile,
  normalizeWebsiteUrl,
  formatWebsiteDisplay,
  formatMemberSince,
  parseCompany,
} from "../components/ProfileCard";

describe("ProfileCard helper functions", () => {
  describe("normalizeWebsiteUrl", () => {
    it("handles null, undefined, or empty strings", () => {
      expect(normalizeWebsiteUrl(null)).toBeNull();
      expect(normalizeWebsiteUrl(undefined)).toBeNull();
      expect(normalizeWebsiteUrl("   ")).toBeNull();
    });

    it("leaves http:// and https:// URLs intact", () => {
      expect(normalizeWebsiteUrl("https://example.com")).toBe("https://example.com");
      expect(normalizeWebsiteUrl("http://insecure.org/path")).toBe("http://insecure.org/path");
    });

    it("prepends https:// when protocol is missing", () => {
      expect(normalizeWebsiteUrl("github.blog")).toBe("https://github.blog");
      expect(normalizeWebsiteUrl("www.developer.io/portfolio")).toBe(
        "https://www.developer.io/portfolio"
      );
    });
  });

  describe("formatWebsiteDisplay", () => {
    it("cleans protocols and trailing slashes for display", () => {
      expect(formatWebsiteDisplay("https://kernel.org/")).toBe("kernel.org");
      expect(formatWebsiteDisplay("http://test.com/blog/")).toBe("test.com/blog");
      expect(formatWebsiteDisplay(null)).toBe("");
    });
  });

  describe("formatMemberSince", () => {
    it("formats ISO date strings into readable month and year", () => {
      const formatted = formatMemberSince("2021-01-15T10:30:00Z");
      expect(formatted).toBe("Joined Jan 2021");
    });

    it("returns null for invalid dates or empty values", () => {
      expect(formatMemberSince(null)).toBeNull();
      expect(formatMemberSince("")).toBeNull();
      expect(formatMemberSince("invalid-date-string")).toBeNull();
    });
  });

  describe("parseCompany", () => {
    it("handles @org company references with a github link", () => {
      const parsed = parseCompany("@github");
      expect(parsed).toEqual({
        text: "@github",
        url: "https://github.com/github",
      });
    });

    it("handles plain text company names", () => {
      const parsed = parseCompany("Acme Inc.");
      expect(parsed).toEqual({ text: "Acme Inc." });
    });

    it("returns null for empty strings or null", () => {
      expect(parseCompany(null)).toBeNull();
      expect(parseCompany("   ")).toBeNull();
    });
  });
});

describe("ProfileCard Component Edge Cases", () => {
  // Edge Case 1: Complete Full Profile
  const fullProfile: Profile = {
    username: "torvalds",
    name: "Linus Torvalds",
    bio: "Creator of Linux and Git. Open source advocate.",
    avatar_url: "https://avatars.githubusercontent.com/u/1024025",
    public_repositories: 14,
    followers: 215420,
    following: 1,
    profile_url: "https://github.com/torvalds",
    location: "Portland, OR",
    company: "@linuxfoundation",
    blog: "https://kernel.org",
    twitter_username: "linustorvalds",
    created_at: "2011-09-03T15:26:00Z",
    public_gists: 8,
  };

  // Edge Case 2: Minimal Profile with Missing Name & Bio
  const missingNameBioProfile: Profile = {
    username: "mysterycoder",
    name: null,
    bio: null,
    avatar_url: "https://avatars.githubusercontent.com/u/9999",
    public_repositories: 5,
    followers: 42,
    following: 10,
    profile_url: "https://github.com/mysterycoder",
    location: "Remote, Earth",
    company: null,
    blog: null,
    twitter_username: null,
    created_at: "2023-05-12T10:00:00Z",
    public_gists: 0,
  };

  // Edge Case 3: Sparse / Boundary Edge Case (empty strings, protocol-less blog, plain company)
  const sparseProfile: Profile = {
    username: "newbie",
    name: "",
    bio: "   ",
    avatar_url: "",
    public_repositories: 0,
    followers: 0,
    following: 0,
    profile_url: "https://github.com/newbie",
    location: null,
    company: "Independent Freelancer",
    blog: "myportfolio.dev",
    twitter_username: null,
    created_at: null,
    public_gists: null,
  };

  test("1. Renders full profile with all metadata, external links, and gists", () => {
    const handleExport = jest.fn();
    render(<ProfileCard profile={fullProfile} onExport={handleExport} />);

    // Name & Username
    expect(screen.getByRole("heading", { level: 3, name: "Linus Torvalds" })).toBeInTheDocument();
    expect(screen.getByText("@torvalds")).toBeInTheDocument();

    // Bio
    expect(
      screen.getByText("Creator of Linux and Git. Open source advocate.")
    ).toBeInTheDocument();

    // Metadata
    expect(screen.getByText("Portland, OR")).toBeInTheDocument();
    const companyLink = screen.getByRole("link", { name: "@linuxfoundation" });
    expect(companyLink).toHaveAttribute("href", "https://github.com/linuxfoundation");

    const blogLink = screen.getByTitle("Visit website: https://kernel.org");
    expect(blogLink).toHaveAttribute("href", "https://kernel.org");
    expect(screen.getByText("kernel.org")).toBeInTheDocument();

    const twitterLink = screen.getByRole("link", { name: "@linustorvalds" });
    expect(twitterLink).toHaveAttribute("href", "https://x.com/linustorvalds");

    // Member since
    expect(screen.getAllByText(/Joined Sep 2011/).length).toBeGreaterThan(0);

    // Stats
    expect(screen.getByText("Repositories")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("Followers")).toBeInTheDocument();
    expect(screen.getByText("215,420")).toBeInTheDocument();
    expect(screen.getByText("Following")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Public Gists")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();

    // View on GitHub button
    const githubLink = screen.getByRole("link", {
      name: "View torvalds's profile on GitHub (opens in new tab)",
    });
    expect(githubLink).toHaveAttribute("href", "https://github.com/torvalds");
    expect(githubLink).toHaveAttribute("target", "_blank");

    // Export Buttons
    const exportMdBtn = screen.getByRole("button", { name: "Export MD" });
    fireEvent.click(exportMdBtn);
    expect(handleExport).toHaveBeenCalledWith("markdown");

    const exportJsonBtn = screen.getByRole("button", { name: "Export JSON" });
    fireEvent.click(exportJsonBtn);
    expect(handleExport).toHaveBeenCalledWith("json");
  });

  test("2. Gracefully handles missing name & bio by falling back to username and 'No bio provided'", () => {
    render(<ProfileCard profile={missingNameBioProfile} />);

    // Name falls back to username
    expect(screen.getByRole("heading", { level: 3, name: "mysterycoder" })).toBeInTheDocument();
    expect(screen.getByText("@mysterycoder")).toBeInTheDocument();

    // Bio shows fallback text
    expect(screen.getByText("No bio provided")).toBeInTheDocument();

    // Location is shown
    expect(screen.getByText("Remote, Earth")).toBeInTheDocument();

    // Company, blog, twitter should not be present
    expect(screen.queryByTitle(/Visit website/)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Twitter\/X/)).not.toBeInTheDocument();

    // Gists card should not be present because count is 0
    expect(screen.queryByText("Public Gists")).not.toBeInTheDocument();
  });

  test("3. Handles sparse profile with whitespace bio, protocol-less blog, and avatar fallback", () => {
    render(<ProfileCard profile={sparseProfile} />);

    // Falls back to username
    expect(screen.getByRole("heading", { level: 3, name: "newbie" })).toBeInTheDocument();

    // Whitespace bio is treated as empty -> shows fallback
    expect(screen.getByText("No bio provided")).toBeInTheDocument();

    // Plain company (without @) rendered as text, not a link
    expect(screen.getByText("Independent Freelancer")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Independent Freelancer" })).not.toBeInTheDocument();

    // Website protocol normalization
    const blogLink = screen.getByTitle("Visit website: https://myportfolio.dev");
    expect(blogLink).toHaveAttribute("href", "https://myportfolio.dev");
    expect(screen.getByText("myportfolio.dev")).toBeInTheDocument();

    // Avatar fallback initials rendered
    expect(screen.getByLabelText("Avatar placeholder")).toBeInTheDocument();
    expect(screen.getByText("N")).toBeInTheDocument();
  });

  test("4. Image onError triggers avatar initials fallback", () => {
    render(<ProfileCard profile={fullProfile} />);

    const avatarImg = screen.getByAltText("Linus Torvalds's avatar");
    expect(avatarImg).toBeInTheDocument();

    // Trigger image error
    fireEvent.error(avatarImg);

    // Should now display avatar placeholder initial 'L'
    expect(screen.getByLabelText("Avatar placeholder")).toBeInTheDocument();
    expect(screen.getByText("L")).toBeInTheDocument();
  });
});
