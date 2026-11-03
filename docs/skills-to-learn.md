# Skills to Learn Next Architecture & Contribution Guide

## 1. Overview
When analyzing a developer's GitHub profile, understanding what skills they currently use is only the first step. To foster continuous growth and expand their open-source contribution opportunities, OpenSourceMate provides a **"Skills to learn next"** section powered by a static JSON mapping.

For example:
- A developer working in **Python** is suggested complementary frameworks and tools like **Django**, **FastAPI**, **Flask**, **PyTorch**, and **Pandas**.
- A frontend developer using **React** is suggested **Next.js**, **Tailwind CSS**, **TypeScript**, and **Redux**.
- A systems programmer using **Rust** is suggested **WebAssembly**, **Tokio**, and **Tauri**.

---

## 2. Requirements & Acceptance Criteria

- **Static JSON Mapping**: Easily extensible mapping located at [`frontend/data/skills_to_learn.json`](../frontend/data/skills_to_learn.json).
- **Up to 5 Suggestions**: Displays at most 5 suggested skills based on the user's detected profile skills.
- **Strict Exclusion**: Automatically excludes any skills the user already possesses (case-insensitive).
- **Zero-Crash Fallback**: Empty, null, or unknown skills display nothing (renders `null`) instead of throwing an error or showing broken UI.
- **Easy PR Contribution**: Designed so community contributors can add new languages and frameworks via pull requests without touching frontend code.

---

## 3. JSON Mapping Schema & Contribution Guide

The mapping is stored in `frontend/data/skills_to_learn.json`. It maps canonical technology names to arrays of complementary skills ordered by recommendation priority.

### Format:
```json
{
  "Python": ["Django", "FastAPI", "Flask", "PyTorch", "Pandas", "Celery", "Docker"],
  "React": ["Next.js", "TypeScript", "Tailwind CSS", "Redux", "GraphQL"],
  "Go": ["Kubernetes", "Docker", "gRPC", "Prometheus", "Terraform"]
}
```

### How to Add or Extend Skills via Pull Request:
1. Open [`frontend/data/skills_to_learn.json`](../frontend/data/skills_to_learn.json).
2. Find the language or framework you want to improve, or add a new key in alphabetical order.
3. List 3–8 popular, companion technologies, frameworks, or libraries commonly used alongside that skill.
4. Ensure skill names use clean, canonical capitalization (e.g. `Next.js`, `FastAPI`, `PostgreSQL`).
5. Run tests:
   ```bash
   cd frontend
   npm test -- --no-cache skillsToLearn
   ```
6. Submit your pull request!

---

## 4. Recommendation Algorithm (`frontend/utils/skillsToLearn.ts`)

The recommendation engine performs the following pipeline:
1. **Validation**: If `userSkills` is empty, falsy, or contains no valid skill names, returns `[]` immediately.
2. **Existing Skills Index**: Builds a normalized, lowercased `Set` of the user's detected skills.
3. **Normalized Mapping Index**: Builds a case-insensitive lookup table for all mapping keys.
4. **Resolution & Filtering**:
   - Iterates through the user's skills in order of prominence.
   - For each skill present in the mapping, iterates through its companion skills.
   - Filters out any skill already in the user's `existingSkillsSet` (case-insensitively).
   - Filters out any skill already added to the suggestion list (deduplication across multiple user skills).
   - Collects unique `SkillSuggestion` objects (`{ name, recommendedFrom }`).
   - Terminates as soon as the limit (default `5`) is reached.
5. **Safe Return**: Returns the list of suggestions. If none match or all suggestions are already possessed, returns `[]`.

---

## 5. UI Component (`frontend/components/SkillsToLearn.tsx`)

The component renders seamlessly below the Technical Skills grid in `frontend/app/page.tsx`:
- **Conditional Visibility**: If `suggestions.length === 0`, the component returns `null` (no DOM footprint).
- **Header Badge**: `💡 LEARNING PATHS` eyebrow badge, "Skills to learn next" heading, and dynamic suggestion count.
- **Interactive Cards**: Responsive cards (1-col on mobile, up to 5-col on desktop) displaying:
  - Skill name with sparkle accent icon.
  - Contextual link: `"Pairs with <SourceSkill>"`.
  - Recommended indicator dot.
- **Theme Support**: Fully styled with Tailwind CSS classes for both `dark` and `light` modes.
- **Accessibility**: Includes `aria-label="Skills to learn next"` semantic section container.

---

## 6. Test Suite

Unit and integration tests are provided in:
- `frontend/__tests__/skillsToLearn.test.ts`: Tests normalization, JSON mapping extraction, exclusion logic, deduplication, custom mapping overrides, and edge cases.
- `frontend/__tests__/SkillsToLearn.test.tsx`: Tests rendering behavior, null render on empty/unknown/fully-owned skills, theme rendering, and accessibility.
