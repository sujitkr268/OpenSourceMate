# Backend Response Serializers, Unified Error Format & Health Endpoint

## Overview

This document details the backend architectural improvements implemented for OpenSourceMate:
1. **DRF-Style Pydantic Response Serializers**: Strongly typed schemas for all API route outputs (`/api/github/*`, `/api/matching/*`, `/api/issues/*`, `/api/health/*`).
2. **Strict Server-Side GitHub Username Validation**: RFC-conformant validation rules for GitHub usernames (1-39 alphanumeric/hyphen characters, no leading/trailing hyphens, no consecutive hyphens).
3. **Consistent Error Envelope**: All API error responses (400, 404, 422, 429, 500) follow a unified schema `{"error": {"code": "...", "message": "...", "details": ...}}` while maintaining backward compatibility with FastAPI's `detail` string.
4. **Health Check Endpoints**: `GET /api/health/` and `GET /api/health` returning `{"status": "healthy", "service": "OpenSourceMate API", "version": "0.1.0"}`.

---

## Response Serializers (`app/schemas/serializers.py` & `app/serializers.py`)

The application implements DRF-equivalent serializers through Pydantic v2 `BaseModel` classes:

* `HealthResponseSerializer`: Schema for `/api/health` and `/api/health/`.
* `HealthDiagnosticsSerializer`: Schema for `/api/health/diagnostics`.
* `ErrorDetailSerializer` & `ErrorResponseSerializer`: Standardized error envelope.
* `GitHubUserProfileSerializer`: Profile metadata including username, bio, avatar, repo count, followers, following.
* `ExtendedGitHubUserProfileSerializer`: Extended profile attributes (location, company, blog, twitter, public gists).
* `RepositoryItemSerializer` & `RepositoryListSerializer`: Repository listing and metadata.
* `SkillItemSerializer` & `UserSkillsSerializer`: Technical skills analysis breakdown.
* `MatchedIssueRecommendationSerializer` & `MatchedIssuesResponseSerializer`: Ranked issue recommendations.
* `IssueSearchResponseSerializer`: GitHub issue search results.
* `IssueAnalysisRequestSerializer` & `IssueAnalysisResponseSerializer`: Deep AI analysis payloads.

---

## Server-Side Username Validation (`app/utils/validation.py`)

GitHub usernames must adhere to the following rules:
* 1 to 39 characters in length.
* Only alphanumeric characters (`[a-zA-Z0-9]`) or single hyphens (`-`).
* Cannot begin or end with a hyphen (`-`).
* Cannot contain consecutive hyphens (`--`).

Validation is enforced before calling downstream GitHub APIs across:
* `GET /api/github/users/{username}`
* `GET /api/github/users/{username}/repositories`
* `GET /api/github/users/{username}/skills`
* `GET /api/matching/users/{username}/issues`

Violations immediately trigger HTTP 400 Bad Request with error code `INVALID_USERNAME`.

---

## Error Envelope Specification

```json
{
  "error": {
    "code": "INVALID_USERNAME",
    "message": "Invalid GitHub username '-bad-'. GitHub usernames must be 1-39 characters, contain only alphanumeric characters or single hyphens, and cannot start or end with a hyphen.",
    "details": {
      "username": "-bad-"
    }
  },
  "detail": "Invalid GitHub username '-bad-'. GitHub usernames must be 1-39 characters, contain only alphanumeric characters or single hyphens, and cannot start or end with a hyphen."
}
```

For rate-limited responses (HTTP 429):
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "GitHub rate limit reached. Please try again later.",
    "details": {
      "reset_at": "2030-01-01T00:00:00+00:00"
    }
  },
  "detail": "GitHub rate limit reached. Please try again later.",
  "reset_at": "2030-01-01T00:00:00+00:00"
}
```

---

## Testing & Verification

Run the test suite using pytest:

```bash
cd backend
pytest -v
```

All 102 unit tests pass covering:
* `test_serializers.py`: Serializer serialization, deserialization, type coercion, and validation errors.
* `test_error_handling.py`: Edge-case usernames, 400/404/422/429/500 error envelope structures.
* `test_health.py`: Both trailing-slash (`/api/health/`) and standard (`/api/health`) health endpoints.
