# GitHub Profile Card Enhancements & Responsive Layout Specification

## 1. Overview & Objectives

Issue #34 requested a comprehensive upgrade to the GitHub Profile Card rendered upon analyzing a GitHub user profile.
The objective is to display deeper developer context, handle incomplete or sparse user data gracefully, guarantee fluid responsiveness across mobile (320px) to desktop (1280px+), and maintain strict WCAG accessibility and test coverage.

### Key Capabilities Added
1. **Extended Metadata Support**:
   - **Bio**: Rich bio rendered with typographic hierarchy.
   - **Location**: Rendered with map-pin icon.
   - **Company**: Rendered with office/briefcase icon. Organizations prefixed with `@` automatically link to `https://github.com/{organization}`.
   - **Website / Blog**: Rendered with globe/link icon, automatically normalizes protocols (`https://`), displays clean domain names, and opens in new tabs securely.
   - **Twitter / X Handle**: Rendered with official brand icon, linking directly to `https://x.com/{twitter_username}`.
   - **Member Since**: Parsed from ISO `created_at` timestamp into human-readable "Joined Month Year" format.
   - **Public Gists**: Visual stat card for public code snippets and gists.

2. **Graceful Degradation & Safe Fallbacks**:
   - Missing or empty `name` safely defaults to the GitHub `username` as heading.
   - Missing, null, or whitespace-only `bio` displays an italicized `"No bio provided"` placeholder without layout shifts.
   - Missing metadata fields (location, company, blog, twitter) are omitted cleanly or replaced by subtle, non-intrusive elements rather than broken links or empty containers.
   - Avatar loading errors trigger an automatic graceful fallback to a gradient placeholder with the user's initial.

3. **Fluid Responsive Layout**:
   - **320px (Mobile portrait)**: Vertical single-column stack, compact avatar (80x80px), full-width action buttons, wrap-around metadata tags, and stacked stats.
   - **768px (Tablet portrait/landscape)**: Horizontal alignment, dual-column stat grid, and inline action buttons.
   - **1280px+ (Desktop)**: Spacious card with full 4-column stat grid, ambient backdrop glow, and interactive hover effects.

---

## 2. API Schema Updates

### Backend Route (`GET /api/github/users/{username}`)
Extended payload schema returned by the backend:

```json
{
  "username": "octocat",
  "name": "The Octocat",
  "bio": "Open source contributor and GitHub mascot",
  "avatar_url": "https://avatars.githubusercontent.com/u/583231",
  "public_repositories": 8,
  "followers": 15000,
  "following": 9,
  "profile_url": "https://github.com/octocat",
  "location": "San Francisco, CA",
  "company": "@github",
  "blog": "https://github.blog",
  "twitter_username": "github",
  "created_at": "2011-01-25T18:44:36Z",
  "public_gists": 8
}
```

### TypeScript Interface (`frontend/components/ProfileCard.tsx`)
```typescript
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
```

---

## 3. Responsive Breakpoint Specification

| Breakpoint | Width | Layout Behavior |
| :--- | :--- | :--- |
| **Mobile Extra-Small** | 320px – 480px | Header stacks vertically. Avatar 80x80px. Metadata chips wrap horizontally. Stats in single column or dual 2-column grid. Full-width GitHub button. |
| **Mobile Medium / Tablet** | 481px – 768px | Header transitions to flex row. Avatar 96x96px. Metadata chips render in flexible row. Stats in 2 or 3-column grid. |
| **Desktop** | 769px – 1280px+ | Full horizontal layout with view and export action buttons. Stats in 4-column responsive grid (Repositories, Followers, Following, Gists). Ambient background blur. |

---

## 4. Edge Cases Tested

The test suite in `frontend/__tests__/ProfileCard.test.tsx` and backend test suite in `backend/tests/test_github_routes.py` evaluate 3 distinct user profile archetypes and critical boundary conditions:

### Case 1: Complete / Full Profile (e.g. `torvalds`)
- All attributes populated (name, bio, location, company with `@` prefix, website URL with `https://`, twitter handle, created_at, and public gists).
- Verifies company link points to GitHub organization, blog link opens verified website, twitter link points to X profile, date parses to "Joined Sep 2011", and 4 stat cards render with formatted numbers (e.g., `215,420`).

### Case 2: Missing Name & Bio (e.g. `mysterycoder`)
- `name: null`, `bio: null`, `company: null`, `blog: null`, `twitter_username: null`, `public_gists: 0`.
- Verifies heading defaults cleanly to `@mysterycoder`, bio renders italicized `"No bio provided"`, missing social links do not render broken anchors, and gists card is omitted when count is 0.

### Case 3: Sparse / Boundary Edge Case (e.g. `newbie`)
- `name: ""`, `bio: "   "` (whitespace only), `blog: "myportfolio.dev"` (missing protocol), `company: "Freelance"` (no `@` symbol), `created_at: null`, `avatar_url: ""`.
- Verifies protocol normalization (`https://myportfolio.dev`), company plain text rendering without broken link, whitespace bio treated as empty, and avatar image error triggers the initial placeholder fallback ("N").

---

## 5. Verification Commands

```bash
# Run backend pytest suite
cd backend && .\.venv\Scripts\pytest

# Run frontend Jest test suite
cd frontend && npm test

# Run frontend ESLint check
cd frontend && npm run lint
```
