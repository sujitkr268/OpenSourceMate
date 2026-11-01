# Typed API Client with Timeout, Abort & Retry

## Overview
This document outlines the architecture, TypeScript types, and runtime capabilities of the **Typed API Client** for OpenSourceMate.

The client replaces unstructured raw `fetch` calls across the application with:
- **Strong TypeScript typing** for all backend responses (zero `any` types).
- **Configurable request timeouts** with custom `ApiTimeoutError` instances.
- **In-flight search cancellation** via `AbortController` signal chaining, guaranteeing that rapid repeated searches never display stale responses.
- **Automatic single-retry mechanism** for transient server and network errors (e.g., HTTP 502, 503, 504, 408, and connection failures), without retrying client errors (400, 404, 422, 429).
- **Graceful environment fallback** reusing `process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"` from Issue #1.

---

## Type Definitions (`frontend/types/api.ts`)

| Type | Description |
|---|---|
| `GitHubUserProfile` | Complete profile model including avatar, repositories, follower metrics, and bio. |
| `SkillItem` | Analyzed skill technology, repository count, and calculated compatibility percentage. |
| `UserSkillsResponse` | Full skill payload returned by `/api/github/users/:username/skills`. |
| `IssueRecommendation` | Matched GitHub open-source issue, labels, match score, and AI rationale. |
| `MatchedIssuesResponse` | List of ranked recommendations returned by `/api/matching/users/:username/issues`. |
| `HealthResponse` | Status, service name, and version from `/api/health`. |
| `ApiErrorResponse` | Normalized error response structure `{ error?: { code, message, details }, detail, reset_at }`. |

---

## Core Capabilities (`frontend/utils/apiClient.ts`)

### 1. In-Flight Search Cancellation
When a user types or submits a search, any existing in-flight request is immediately cancelled:
```typescript
import { createSearchSignal, isAbortError } from "../utils/apiClient";

const searchSignal = createSearchSignal();
try {
  const profile = await fetchUserProfile(username, { signal: searchSignal });
} catch (err) {
  if (isAbortError(err)) {
    // User triggered a newer search; discard result to prevent race conditions
    return;
  }
}
```

### 2. Request Timeout Control
All requests enforce a default 10,000ms timeout threshold. If the server hangs or exceeds the deadline, the client rejects with `ApiTimeoutError` (HTTP 408):
```typescript
const profile = await fetchUserProfile(username, { timeoutMs: 5000 });
```

### 3. Transient Failure Retry
Transient issues (502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout, and network connection drops) are retried once automatically with backoff. Client errors (such as 404 Not Found or 429 Rate Limit) are never retried.

---

## Verification & Testing
Exhaustive unit tests are located in `frontend/__tests__/apiClient.test.ts`:
- Environment fallback and URL resolution.
- Parsing and typing of API responses.
- Cancellation signal propagation across rapid searches.
- Single-retry execution on 503 and `TypeError` network drops.
- Non-retry guarantee on 404 and 429 responses.
- Timeout rejection with `ApiTimeoutError`.
