# GitHub Repository Pagination Architecture (Issue #129)

## 1. Problem Statement
The GitHub REST API paginates repository lists at a default of 30 items and a maximum of 100 items per page (`per_page=100`). Without robust pagination support:
- Developers with more than 100 repositories only had their first page analyzed.
- Secondary technologies, recent projects, and overall repository metrics (`total_repositories_analyzed`) were artificially truncated and underreported.
- Profiles could get stuck in infinite pagination loops if pagination was uncapped.

Issue #129 addresses these problems by implementing standard RFC 5988 `Link` header pagination up to a configurable sensible cap, ensuring accurate skill analysis and complete repository counts.

---

## 2. Core Implementation

### 2.1 RFC 5988 Link Header Parser
GitHub returns pagination links in HTTP response headers formatted according to RFC 5988:
```http
Link: <https://api.github.com/users/octocat/repos?page=2&per_page=100>; rel="next",
      <https://api.github.com/users/octocat/repos?page=4&per_page=100>; rel="last"
```

The function `parse_github_link_header` in `app.services.github_service` parses these headers using a regular expression:
```python
LINK_HEADER_PATTERN = re.compile(r'<([^>]+)>;\s*rel="([^"]+)"')

def parse_github_link_header(link_header: str | None) -> dict[str, str]:
    ...
```
It returns a normalized dictionary mapping relation strings (`"next"`, `"last"`, `"prev"`, `"first"`) to their respective target URLs.

### 2.2 Pagination Flow & Sensible Cap
The repository fetcher `get_user_repositories` traverses pages while adhering to safety limits:
1. **Initial Request**: Requests page 1 with `per_page=100` and `sort=updated`.
2. **Page Processing**: Extends the aggregate `repositories` list with the returned repository JSON objects.
3. **Termination Conditions**:
   - Reaching fewer items than `per_page` (indicates the final page).
   - Reaching or exceeding `effective_cap` (defaults to 300 repositories).
   - Reaching `effective_max_pages` (defaults to 3 pages).
   - Absence of a `rel="next"` relation in the Link header.
4. **Fallback Handling**: If an API proxy or mock strips the `Link` header but returns a full page, the client advances the `page` query parameter automatically up to `max_pages`.

### 2.3 Configuration Settings
Configurable via environment variables or `.env`:
| Setting | Type | Default | Description |
|---|---|---|---|
| `GITHUB_MAX_REPO_PAGES` | `int` | `3` | Maximum number of pagination calls permitted per profile fetch. |
| `GITHUB_REPOS_PER_PAGE` | `int` | `100` | Number of repositories requested per page (GitHub max is 100). |
| `GITHUB_MAX_REPOS_CAP` | `int` | `300` | Sensible ceiling for total repositories analyzed per user. |
| `GITHUB_CACHE_TTL` | `int` | `300` | In-memory cache time-to-live in seconds (Issue #14). |

---

## 3. Integration with Rate Limiting (Issue #14)
Multi-page pagination executes multiple outbound HTTP requests in sequence. To protect against rate-limit exhaustion:
- Every pagination request invokes `github_get(...)`, which checks `_is_rate_limited(response)` for HTTP 403 (with `X-RateLimit-Remaining: 0`) and HTTP 429.
- If a rate limit is reached on page 2 or 3:
  - `GitHubRateLimitError` is raised immediately with the reset timestamp.
  - The in-memory cache is **not poisoned** with truncated or incomplete data.
  - The client receives a standardized `429 RATE_LIMIT_EXCEEDED` response including `reset_at`.

---

## 4. Accurate Skills Analysis & Repository Counts
In `app.services.skill_service`:
```python
result = analyze_skills(repositories, include_forks=include_forks, repo_details=details)
```
Because `repositories` now contains all repositories fetched across all pages (e.g. 150 repos across 2 pages, or 300 repos across 3 pages), `total_repositories_analyzed` reports the actual analyzed count:
```json
{
  "username": "busydev",
  "total_repositories_analyzed": 150,
  "skills": [
    {
      "name": "Rust",
      "repository_count": 100,
      "percentage": 67
    },
    {
      "name": "Go",
      "repository_count": 50,
      "percentage": 33
    }
  ]
}
```

---

## 5. Automated Testing Strategy
Automated tests in `backend/tests/test_github_pagination.py`:
- `test_parse_github_link_header_*`: Verifies empty, 2-relation, 4-relation, and malformed header parsing.
- `test_single_page_when_fewer_than_per_page`: Confirms users with < 100 repos terminate after 1 API call.
- `test_multi_page_following_link_header`: Confirms 145 repositories across 2 pages are all fetched.
- `test_multi_page_respects_sensible_cap`: Confirms users with 400 repositories are safely capped at 300 repositories (3 pages).
- `test_rate_limit_on_second_page_raises_and_does_not_cache`: Confirms rate limit errors during pagination abort cleanly without caching partial state.
- `test_repositories_route_pagination_metadata`: Verifies route serialization including `total_pages_fetched` and `has_more`.
- `test_skills_route_counts_multi_page_repositories`: Verifies `total_repositories_analyzed` matches multi-page repositories.

