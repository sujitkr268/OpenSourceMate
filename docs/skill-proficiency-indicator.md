# Skill Proficiency Indicator Architecture (Issue #131)

## 1. Overview
When discovering open-source repositories and matched issues, developers and project maintainers benefit from understanding which technologies represent a user's core expertise versus those explored in a single tutorial or early prototype.

**Issue #131** introduces an automated **Proficiency Indicator** for every detected skill. It computes an estimated tier:
- **`Learning`**: Early exploration, single-repository usage, or lower code share.
- **`Comfortable`**: Steady usage across multiple projects with regular activity.
- **`Strong`**: Substantial repository breadth, dominant code share, and recent activity.

Each skill displays a compact visual badge in the UI accompanied by an accessible tooltip detailing how the estimate was computed.

> [!IMPORTANT]
> Proficiency indicators are clearly communicated as **automated estimates** derived from public repository metadata, not formal certifications or performance assessments.

---

## 2. Calculation Rules & Scoring Algorithm

The proficiency calculation evaluates three objective dimensions (each awarded 1.0 to 3.0 points):

### 2.1 Breadth: Repository Count (1.0 to 3.0 points)
| Repositories Using Skill | Points | Rationale |
|---|---|---|
| **$\ge$ 5 repositories** | 3.0 pts | Broad application across diverse codebases |
| **2 to 4 repositories** | 2.0 pts | Proven multi-project adoption |
| **1 repository** | 1.0 pt | Initial exploration or single focused project |

### 2.2 Depth: Code Share Percentage (1.0 to 3.0 points)
| Percentage of Analyzed Code | Points | Rationale |
|---|---|---|
| **$\ge$ 40%** | 3.0 pts | Primary technology anchor |
| **15% to 39.9%** | 2.0 pts | Significant secondary or stack component |
| **$<$ 15%** | 1.0 pt | Supporting or minor script usage |

### 2.3 Recency: Recent Activity (1.0 to 3.0 points)
Recency is computed from the repository's `updated_at` timestamp:
| Most Recent Update | Points | Rationale |
|---|---|---|
| **$\le$ 90 days ago** | 3.0 pts | Current active practice |
| **91 to 365 days ago** | 2.0 pts | Active within the past year |
| **$>$ 365 days ago** | 1.0 pt | Inactive or legacy project |
| *No timestamp provided* | 1.5 pts | Neutral default |

### 2.4 Tier Thresholds & Score Normalization
- **Total Points**: Sum of Breadth + Depth + Recency (range: 3.0 to 9.0).
- **Normalized Score**: $\text{Score} = \text{round}\left(\frac{\text{Total Points}}{9.0} \times 10.0, 1\right)$ (range: 3.3 to 10.0).

| Total Points | Normalized Score | Assigned Tier | Theme Color |
|---|---|---|---|
| **$\ge$ 7.0 pts** | **7.8 – 10.0** | **`Strong`** | Emerald / Green |
| **5.0 – 6.9 pts** | **5.6 – 7.7** | **`Comfortable`** | Blue / Cyan |
| **$<$ 5.0 pts** | **3.3 – 5.5** | **`Learning`** | Amber / Yellow |

---

## 3. Rationale & Tooltip Explanation
Every badge features an interactive, accessible tooltip (`role="tooltip"`, `aria-describedby`) explaining:
1. Assigned tier and score (e.g. `Score: 8.9/10`).
2. Exact factors that contributed to the score:
   `"Estimated as Strong: used in 6 repositories (55.0% code share), active recently (12 days ago)."`
3. Prominent automated estimation disclaimer:
   `"Note: This is an automated estimate based on public GitHub repository activity."`

---

## 4. API Specification

### Endpoint: `GET /api/github/users/{username}/skills`
```json
{
  "username": "octocat",
  "total_repositories_analyzed": 8,
  "skills": [
    {
      "name": "TypeScript",
      "type": "language",
      "repository_count": 5,
      "percentage": 50.0,
      "weight": 1.0,
      "proficiency": "Strong",
      "proficiency_score": 8.9,
      "proficiency_reason": "Estimated as Strong: used in 5 repositories (50.0% code share), active recently (4 days ago). Estimated indicator based on public repository activity."
    },
    {
      "name": "Python",
      "type": "language",
      "repository_count": 2,
      "percentage": 25.0,
      "weight": 0.5,
      "proficiency": "Comfortable",
      "proficiency_score": 6.7,
      "proficiency_reason": "Estimated as Comfortable: used in 2 repositories (25.0% code share), active within the past year. Estimated indicator based on public repository activity."
    }
  ]
}
```

---

## 5. Automated Tests

### Backend Tests (`backend/tests/test_skill_proficiency.py`)
- `test_proficiency_learning_level`: Validates single repository edge cases.
- `test_proficiency_comfortable_level`: Validates multi-project moderate activity.
- `test_proficiency_strong_level`: Validates broad repository footprint with recent commits.
- `test_proficiency_zero_or_negative`: Validates defensive fallbacks.
- `test_proficiency_old_activity`: Validates recency degradation for old repositories.
- `test_analyze_skills_computes_proficiency_with_timestamps`: Verifies end-to-end repository timestamp aggregation.

### Frontend Tests (`frontend/__tests__/SkillProficiencyBadge.test.tsx` & `frontend/__tests__/proficiency.test.ts`)
- Component rendering for each tier (`Strong`, `Comfortable`, `Learning`).
- Keyboard accessibility: tooltip appears on button `focus` and disappears on `blur`.
- Hover interactions: tooltip appears on `mouseEnter` and disappears on `mouseLeave`.
- Dark and light theme style adherence.
- Deterministic client-side fallback calculation.

