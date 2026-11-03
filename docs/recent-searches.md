# Recent Profile Searches via LocalStorage Specification

**Issue Reference:** #33
**Components:**

- `frontend/utils/recentSearches.ts`
- `frontend/components/RecentSearches.tsx`
- `frontend/__tests__/recentSearches.test.ts`
- `frontend/__tests__/RecentSearchesComponent.test.tsx`
- `frontend/app/page.tsx`

---

## 1. Overview & Problem Statement

Developers frequently revisit the same profiles or compare colleagues' profiles. Without persistence, users are forced to manually re-type usernames every time they load or refresh the page.

This feature adds automatic, client-side recent search tracking:

1. **Deduplicated History:** Stores up to 5 unique, successfully analyzed GitHub usernames.
2. **Instant Re-Analysis:** Clicking a search chip immediately loads that username and initiates profile analysis.
3. **Individual and Bulk Deletion:** Users can dismiss individual chips with a close button or clear all stored items at once.
4. **Zero-Crash Resilience:** All storage interactions are safely wrapped in `try/catch` to ensure seamless execution even if storage is restricted or disabled.

---

## 2. Storage Data Model & Operations

- **Storage Key:** `osm_recent_searches`
- **Format:** JSON array of strings, e.g. `["torvalds", "gaearon", "kentcdodds"]`
- **Capacity:** Fixed limit of 5 (`MAX_RECENT_SEARCHES = 5`)

### Operations:

```typescript
getRecentSearches(): string[]
saveRecentSearch(username: string): string[]
removeRecentSearch(username: string): string[]
clearRecentSearches(): void
```

---

## 3. Resilience to Storage Blocking & Privacy Modes

In private browsing modes (e.g., Safari Private, Incognito, strict cookie blocking) or when device quotas are reached, accessing `window.localStorage` throws a `SecurityError` or `QuotaExceededError`.

- All read and write operations in `recentSearches.ts` use defensive `try/catch` guards.
- If storage is blocked, `getRecentSearches()` safely returns an empty array `[]`.
- If saving fails, in-memory state is maintained without raising uncaught exceptions in the console.

---

## 4. UI / UX Design & Accessibility

- **Placement:** Positioned cleanly below the username input within the `#analyzer` card.
- **Visual Style:** Rounded pill chips with `@` prefix, subtle hover glow, and accessible color contrast in both dark and light modes.
- **Keyboard Operable:** Chips and remove buttons support standard `Tab` focus with visible focus rings (`focus-visible:ring-2 focus-visible:ring-purple-400`).
- **Screen Reader Announcements:** Sighted icons include `aria-hidden="true"`; buttons provide explicit `aria-label` tags (e.g. `aria-label="Re-run analysis for GitHub user @torvalds"`).
