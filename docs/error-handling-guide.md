# Next.js App Router Error Handling & Not Found Specification

**Issue Reference:** #31
**Components:**

- `frontend/app/not-found.tsx`
- `frontend/app/error.tsx`
- `frontend/app/global-error.tsx`
- `frontend/__tests__/NotFound.test.tsx`
- `frontend/__tests__/Error.test.tsx`

---

## 1. Overview & Objectives

In Next.js App Router, unhandled errors and unknown routes default to generic or unstyled fallback interfaces unless explicitly overridden with convention-based boundary files.

This feature introduces a cohesive error recovery architecture matching OpenSourceMate's dark mode visual identity:

1. **Custom 404 Route (`app/not-found.tsx`):** Triggered when users navigate to undefined routes or when `notFound()` is invoked.
2. **Segment Error Boundary (`app/error.tsx`):** Client error boundary isolating route segment crashes and providing a "Try Again" recovery mechanism.
3. **Global Root Error Boundary (`app/global-error.tsx`):** Catches errors that occur inside the root layout or root HTML tree.

---

## 2. Component Specifications

### 2.1 `app/not-found.tsx` (Custom 404 Page)

- **Render Mode:** Server Component with static metadata (`title: "404 - Page Not Found | OpenSourceMate"`).
- **Visual Design:**
  - Distinct ambient purple/blue glow gradients.
  - Large glowing `404` header typography.
  - Informative copy explaining that the resource was moved or does not exist.
  - Direct navigation cards and CTAs:
    - Return to Home (`/`)
    - Launch GitHub Profile Analyzer (`/#analyzer`)
- **Responsive Layout:**
  - Stacks cards on mobile screens (< 640px) and renders 2-column cards on tablets and desktops.

### 2.2 `app/error.tsx` (Route Segment Boundary)

- **Render Mode:** Client Component (`"use client"`).
- **Props Accepted:**
  - `error: Error & { digest?: string }`
  - `reset: () => void` (re-renders the route segment without full page reload)
- **Interactive Features:**
  - **Try Again Button:** Triggers `reset()` to attempt graceful recovery.
  - **Quick Links:** Navigation anchors back to Home (`/`) and Analyzer (`/#analyzer`).
  - **Developer Diagnostics Accordion:** Expandable accordion displaying `error.message` and `error.digest` to aid debugging without exposing raw stacks to end-users.

### 2.3 `app/global-error.tsx` (Root Fallback)

- **Render Mode:** Client Component (`"use client"`).
- **Requirement:** Must include own `<html>` and `<body>` tags because it replaces the root layout if the root layout throws.
- **Actions:** Refresh Page button (`() => reset()`) and Link to Home (`/`).

---

## 3. Automated Test Coverage

The error boundary and not-found components are covered by unit tests in `frontend/__tests__/`:

- `NotFound.test.tsx`:
  - Renders 404 badge, heading, and explanation.
  - Verifies presence and destination of navigation links to Home (`/`) and Analyzer (`/#analyzer`).
- `Error.test.tsx`:
  - Renders user-friendly error title and text.
  - Confirms `reset()` function is called when clicking "Try Again".
  - Tests developer diagnostics accordion expansion/collapse.
