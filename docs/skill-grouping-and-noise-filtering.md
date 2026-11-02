# Technology Grouping and Noise Language Filtering Architecture (Issue #130)

## 1. Overview & Motivation
When GitHub analyzes a repository, its linguist engine catalogs every file, which often includes:
- Build automation files (`Makefile`, `CMake`).
- Container and packaging descriptors (`Dockerfile`).
- Documentation markup and generated formats (`TeX`, `PostScript`, `Rich Text Format`, `Gettext Catalog`).
- Interactive execution artifacts (`Jupyter Notebook`).

While essential for execution and deployment, these are generally not reflective of a software engineer's primary programming language skills. Furthermore, related technologies (such as `HTML` + `CSS` for Web styling, or `JavaScript` + `TypeScript` within the JS/TS ecosystem) are often fragmented across multiple individual entries, diluting the perceived depth in a specific stack.

**Issue #130** introduces:
1. An extensible data-driven mapping file (`backend/app/data/skill_mappings.json`).
2. Automatic noise language filtering (`ignore_noise=True`).
3. Technology grouping and ecosystem consolidation (`group_related=True`), complementing Issue #22 without breaking API stability.

---

## 2. Configuration Data File (`app/data/skill_mappings.json`)
Contributors can extend language mappings and ignore rules without modifying any Python code.

```json
{
  "ignore_languages": [
    "Jupyter Notebook",
    "Dockerfile",
    "Makefile",
    "CMake",
    "TeX",
    "Roff",
    "PostScript",
    "Rich Text Format",
    "Gettext Catalog",
    "Vim Script",
    "Batchfile"
  ],
  "groups": {
    "Web": [
      "HTML",
      "CSS",
      "SCSS",
      "Sass",
      "Less"
    ],
    "JavaScript / TypeScript": [
      "JavaScript",
      "TypeScript"
    ],
    "C / C++": [
      "C",
      "C++"
    ],
    "JVM Ecosystem": [
      "Java",
      "Kotlin",
      "Scala",
      "Groovy",
      "Clojure"
    ],
    "Mobile Development": [
      "Swift",
      "Kotlin",
      "Dart",
      "Objective-C"
    ],
    "Systems & Embedded": [
      "Rust",
      "Go",
      "C",
      "C++",
      "Zig"
    ],
    "Cloud & Infrastructure": [
      "HCL",
      "Terraform",
      "Puppet",
      "Chef"
    ]
  }
}
```

---

## 3. Analysis Pipeline & Modes

### 3.1 Noise Filtering
During skill analysis in `app.services.skill_service.analyze_skills`:
- Languages listed in `ignore_languages` are skipped when `ignore_noise=True` (default).
- Filtering is case-insensitive.
- If a consumer specifically requires raw linguist output (e.g. analyzing DevOps tooling), they can pass `ignore_noise=False`.

### 3.2 Standard Mode (`group_related=False` - Default)
- Preserves fine-grained individual skills (e.g., `HTML`, `CSS`, `TypeScript`).
- Enriches each entry with its canonical `group` attribute (e.g. `group: "Web"`).
- Provides an optional top-level `groups` summary mapping active ecosystems to present skills.

### 3.3 Grouped Mode (`group_related=True`)
- Consolidates related technologies into unified ecosystem items (e.g. `Web`, `JavaScript / TypeScript`).
- **De-duplication**: If a single repository contains both `HTML` and `CSS`, the `Web` ecosystem counts that repository **once**, preventing artificial inflation.
- Returns `subskills: ["CSS", "HTML"]` documenting the constituent technologies.
- Preserves standalone languages and frameworks that do not belong to any group.

---

## 4. API Specification & Backwards Compatibility
The endpoint `GET /api/github/users/{username}/skills` supports optional query parameters:
- `include_forks: bool = False` (from Issue #22)
- `ignore_noise: bool = True` (Issue #130)
- `group_related: bool = False` (Issue #130)

### Response Schema (`SkillItemSerializer` & `UserSkillsSerializer`)
```json
{
  "username": "webdev",
  "total_repositories_analyzed": 5,
  "skills": [
    {
      "name": "Web",
      "type": "ecosystem",
      "repository_count": 3,
      "percentage": 60.0,
      "weight": 1.0,
      "group": "Web",
      "subskills": ["CSS", "HTML"]
    },
    {
      "name": "Python",
      "type": "language",
      "repository_count": 2,
      "percentage": 40.0,
      "weight": 0.67,
      "group": null
    }
  ],
  "groups": {
    "Web": ["CSS", "HTML"]
  }
}
```

All new fields default to `None`, preserving strict backward compatibility for all existing clients.

---

## 5. Automated Tests
Tests in `backend/tests/test_skill_grouping_and_noise.py`:
1. `test_skill_mappings_file_is_valid_and_extensible`: Verifies JSON file integrity.
2. `test_is_noise_language_helper`: Case-insensitive noise checking.
3. `test_resolve_group_for_skill`: Technology to group mapping.
4. `test_ignore_noise_filters_dockerfile_makefile_and_jupyter`: Suppresses non-skill languages.
5. `test_ignore_noise_can_be_disabled`: Allows including noise if requested.
6. `test_standard_mode_annotates_group_attribute`: Verifies non-breaking group tagging.
7. `test_group_related_consolidates_web_technologies`: Consolidates HTML/CSS without double-counting.
8. `test_group_related_consolidates_javascript_and_typescript`: Unifies JS/TS with subskills.
9. `test_skills_endpoint_group_related_query_param`: End-to-end endpoint verification with mock API.

