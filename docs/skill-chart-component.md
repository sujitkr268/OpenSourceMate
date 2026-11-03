# Skill Distribution Chart Component Specification

**Issue Reference:** #12
**Component:** `frontend/components/SkillChart.tsx`
**Purpose:** Reusable, zero-dependency, accessible SVG-based skill distribution chart supporting Donut and Horizontal Bar views, legend, interactive tooltips, and screen-reader data table fallbacks.

---

## 1. Overview & Motivation

While OpenSourceMate has detected developer technical skills and repository frequencies, displaying skills solely as flat cards does not communicate proportional strength or specialization at a glance.

The `SkillChart` component solves this by:

1. Visualizing top-N skills using proportional SVG geometry without pulling in large external charting libraries (saving bundle size and reducing runtime overhead).
2. Offering two user-switchable modes:
   - **Donut Chart:** Ideal for understanding overall ecosystem balance and specialization.
   - **Horizontal Bar Chart:** Ideal for comparing direct repository counts and ranking.
3. Providing full WCAG 2.1 AA accessibility via keyboard-focusable segments and an expandable Accessible Data Table fallback.

---

## 2. Component API & Props

```typescript
export type SkillItem = {
  name: string;
  repository_count: number;
  percentage: number;
};

export interface SkillChartProps {
  /** Array of analyzed developer skills */
  skills: SkillItem[];
  /** Total public repositories analyzed */
  totalRepositories?: number;
  /** Active theme ('dark' | 'light') */
  theme?: "dark" | "light";
  /** Maximum number of primary skills to highlight before aggregating into 'Other' */
  topN?: number;
  /** Default view representation ('donut' | 'bar') */
  initialType?: "donut" | "bar";
  /** Optional container class names */
  className?: string;
}
```

---

## 3. Mathematical Geometry & SVG Implementation

### 3.1 Donut Arc Calculations

To render crisp circular segments without complex path arc math:

- Radius: $r = \frac{\text{size} - \text{strokeWidth}}{2} = \frac{300 - 38}{2} = 131\text{px}$
- Total Circumference: $C = 2 \cdot \pi \cdot r \approx 823.097\text{px}$
- Segment Arc Length: $L_i = \frac{\text{percentage}_i}{100} \cdot C$
- Stroke Dasharray: `L_i C`
- Stroke Dashoffset: $-\sum_{k=0}^{i-1} L_k$
- Rotation: SVG is rotated $-90^\circ$ so that segments start at 12 o'clock.

### 3.2 High-Contrast Color Palette

The component uses an 8-color accessible palette with distinct hues across purple, blue, emerald, amber, pink, cyan, indigo, and teal, ensuring WCAG contrast compliance against both `#05070d` and `#ffffff`.

---

## 4. Edge Cases Handled

| Scenario                                | Handled By             | Visual Outcome                                                                     |
| :-------------------------------------- | :--------------------- | :--------------------------------------------------------------------------------- |
| **Empty Skills (`[]`)**                 | Empty state container  | Friendly icon, explanatory message, no broken SVG                                  |
| **Single Skill (`[{"Python": 100%}]`)** | Single-skill detection | "Specialized 100%" callout badge with single full-circle track                     |
| **Many Skills (> N)**                   | Automatic aggregation  | Top N shown individually; remainder rolled into "Other Technologies"               |
| **Small Viewports (320px)**             | Responsive layout      | SVG scales automatically using `viewBox="0 0 300 300"`; legend wraps into 1 column |

---

## 5. Accessibility (a11y) & WCAG 2.1 AA Compliance

1. **Screen Reader Support:**
   - `<svg>` includes `role="img"`, `<title>`, and `<desc>` summarizing skills and percentages.
   - Slices and bars have `role="graphics-symbol"` and explicit `aria-label`.
2. **Accessible Table Fallback:**
   - Users and screen reader software can toggle the Accessible Data Table via keyboard or assistive tools.
   - Standard HTML `<table>` with proper `<th scope="col">` and numeric data formatting.
3. **Keyboard Focusable:**
   - Donut slices and bar items support `tabIndex={0}`, receiving focus outlines and triggering active tooltip highlights on focus.
4. **Theme Adaptation:**
   - Automatically adapts colors, stroke backgrounds, and typography depending on the user's selected dark/light mode.
