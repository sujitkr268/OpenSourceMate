# Frontend Testing Guide & Specification

**Issue Reference:** #24
**Target:** Frontend Analyze Flow Automated Test Suite
**Framework:** Jest + React Testing Library (RTL) + Next.js `next/jest`

---

## 1. Overview & Objectives

This document outlines the testing architecture and guidelines for the OpenSourceMate frontend application. The testing suite validates user flows end-to-end at the component level with mocked backend responses to ensure reliable, deterministic, and fast CI/CD execution without external network calls.

---

## 2. Directory & File Structure

```text
frontend/
├── __tests__/
│   └── Home.test.tsx        # Comprehensive unit & integration tests for profile analysis
├── jest.config.mjs          # Next.js Jest configuration with module aliasing & jsdom
├── jest.setup.ts            # Global testing setup (mocks matchMedia, DOM APIs, clears storage)
├── package.json             # Test scripts (npm test, test:watch, test:coverage)
└── app/
    └── page.tsx             # Main analyzer landing page
```

---

## 3. Test Suites & Coverage Matrix

| Test Case                | Flow / State Covered   | Verification Criteria                                              |  Status  |
| :----------------------- | :--------------------- | :----------------------------------------------------------------- | :------: |
| `renders landing page`   | Initial render         | Header, hero titles, input, buttons visible                        | **PASS** |
| `empty username`         | Client-side validation | Error alert shown; 0 network calls initiated                       | **PASS** |
| `invalid username chars` | Regex validation       | Clear error shown for invalid symbols / hyphen placement           | **PASS** |
| `username sanitization`  | Whitespace & @ strip   | Trims spaces and removes `@` before API request                    | **PASS** |
| `loading state`          | Asynchronous wait      | Button disabled, text changes to "Analyzing...", skeletons visible | **PASS** |
| `successful analysis`    | Happy path             | Profile data, skills, and recommended issue cards render           | **PASS** |
| `404 user not found`     | API error              | Informative "User not found" message displayed                     | **PASS** |
| `429 rate limit`         | API rate limiting      | Friendly rate limit notice with reset time displayed               | **PASS** |
| `502/503 service down`   | API service failure    | "GitHub API is temporarily unavailable" message                    | **PASS** |
| `network disconnect`     | TypeError / offline    | Network error notice + functional "Retry" button                   | **PASS** |
| `keyboard submission`    | Keyboard accessibility | Pressing `Enter` in input triggers analysis                        | **PASS** |
| `theme toggle`           | Dark / Light theme     | Updates `data-theme` attribute and `localStorage`                  | **PASS** |

---

## 4. How to Run Tests Locally

### Run all tests once:

```bash
cd frontend
npm test
```

### Run tests in watch mode (interactive development):

```bash
npm run test:watch
```

### Generate code coverage report:

```bash
npm run test:coverage
```

---

## 5. Mocking Strategy

1. **Global `fetch` Mocking:**
   All HTTP requests to `${API_URL}/api/github/...` and `${API_URL}/api/matching/...` are intercepted using `jest.fn()`. Responses simulate exact backend JSON schemas for `/users/{username}`, `/users/{username}/skills`, and `/users/{username}/issues`.
2. **Browser APIs:**
   `window.matchMedia`, `Element.prototype.scrollIntoView`, and `URL.createObjectURL` are polyfilled in `jest.setup.ts` to prevent DOM exceptions in JSDOM environments.
3. **State Isolation:**
   `beforeEach` clears all Jest mocks and resets `localStorage` to guarantee tests remain completely idempotent.

---

## 6. Continuous Integration (CI)

Frontend unit and integration tests are automatically executed on every pull request and push to `main` via `.github/workflows/ci.yml`:

```yaml
- name: Run unit & integration tests
  run: npm test -- --ci
```
