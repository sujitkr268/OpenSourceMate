import base64
import json
import re
import time
from datetime import datetime, timezone

import httpx

from app.cache import TTLCache
from app.config import get_settings


GITHUB_API_URL = "https://api.github.com"

cache = TTLCache()

_client: httpx.AsyncClient | None = None


class GitHubRateLimitError(Exception):
    """Raised when GitHub says we are out of API requests."""

    def __init__(self, reset_at: datetime | None = None):
        self.reset_at = reset_at
        super().__init__("GitHub API rate limit reached")


def get_client() -> httpx.AsyncClient:
    global _client

    if _client is None:
        headers = {"Accept": "application/vnd.github+json"}
        token = get_settings().github_token

        if token:
            headers["Authorization"] = f"Bearer {token}"

        _client = httpx.AsyncClient(headers=headers, timeout=15.0)

    return _client


async def close_client() -> None:
    global _client

    if _client is not None:
        await _client.aclose()
        _client = None


def _rate_limit_reset(response: httpx.Response) -> datetime | None:
    reset = response.headers.get("X-RateLimit-Reset")

    if reset and reset.isdigit():
        return datetime.fromtimestamp(int(reset), tz=timezone.utc)

    # Secondary rate limits only send Retry-After (in seconds).
    retry_after = response.headers.get("Retry-After")

    if retry_after and retry_after.isdigit():
        return datetime.fromtimestamp(
            time.time() + int(retry_after), tz=timezone.utc
        )

    return None


def _is_rate_limited(response: httpx.Response) -> bool:
    if response.status_code == 429:
        return True

    return (
        response.status_code == 403
        and response.headers.get("X-RateLimit-Remaining") == "0"
    )


async def github_get(url: str, params: dict | None = None) -> httpx.Response:
    """GET a GitHub API url with the shared client.

    Raises GitHubRateLimitError when GitHub reports the rate limit is hit.
    """
    response = await get_client().get(url, params=params)

    if _is_rate_limited(response):
        raise GitHubRateLimitError(_rate_limit_reset(response))

    return response


async def get_github_user(username: str):
    key = f"github:user:{username.lower()}"
    cached = cache.get(key)

    if cached is not None:
        return cached

    response = await github_get(f"{GITHUB_API_URL}/users/{username}")

    if response.status_code == 404:
        return None

    response.raise_for_status()

    user = response.json()
    cache.set(key, user, get_settings().github_cache_ttl)

    return user


LINK_HEADER_PATTERN = re.compile(r'<([^>]+)>;\s*rel="([^"]+)"')


def parse_github_link_header(link_header: str | None) -> dict[str, str]:
    """Parse RFC 5988 Link headers into a dict mapping relation names to URLs.

    Example input:
        '<https://api.github.com/users/foo/repos?page=2&per_page=100>; rel="next", '
        '<https://api.github.com/users/foo/repos?page=4&per_page=100>; rel="last"'
    Returns:
        {"next": "https://...", "last": "https://..."}
    """
    if not link_header:
        return {}

    links: dict[str, str] = {}
    for match in LINK_HEADER_PATTERN.finditer(link_header):
        url, rel = match.groups()
        links[rel.strip().lower()] = url.strip()

    return links


MAX_REPOSITORY_PAGES = 3
REPOS_PER_PAGE = 100
MAX_REPOSITORIES_CAP = 300


async def get_user_repositories(
    username: str,
    max_pages: int | None = None,
    per_page: int | None = None,
    max_cap: int | None = None,
) -> list[dict] | None:
    """Fetch public repositories for a user, following pagination up to a sensible cap.

    Follows GitHub RFC 5988 Link headers and supports per_page navigation up to
    max_pages / max_cap (Issue #129). Integrates seamlessly with rate-limit
    detection (Issue #14) and TTL cache.
    """
    key = f"github:repos:{username.lower()}"
    cached = cache.get(key)

    if cached is not None:
        return cached

    settings = get_settings()
    effective_max_pages = (
        max_pages
        if max_pages is not None
        else getattr(settings, "github_max_repo_pages", MAX_REPOSITORY_PAGES)
    )
    effective_per_page = (
        per_page
        if per_page is not None
        else getattr(settings, "github_repos_per_page", REPOS_PER_PAGE)
    )
    effective_cap = (
        max_cap
        if max_cap is not None
        else getattr(settings, "github_max_repos_cap", MAX_REPOSITORIES_CAP)
    )

    repositories: list[dict] = []
    next_url: str | None = f"{GITHUB_API_URL}/users/{username}/repos"
    params: dict | None = {
        "per_page": effective_per_page,
        "sort": "updated",
        "page": 1,
    }
    pages_fetched = 0

    while next_url and pages_fetched < effective_max_pages:
        response = await github_get(next_url, params=params)

        if response.status_code == 404:
            return None

        response.raise_for_status()

        page_repos = response.json()
        if not isinstance(page_repos, list):
            break

        repositories.extend(page_repos)
        pages_fetched += 1

        # Check if we have hit or exceeded the sensible upper bound cap
        if len(repositories) >= effective_cap:
            repositories = repositories[:effective_cap]
            break

        # If this page returned fewer than requested items, we reached the end
        if len(page_repos) < effective_per_page:
            break

        # Parse Link header to follow the next page
        link_header = response.headers.get("Link") or response.headers.get("link")
        links = parse_github_link_header(link_header)

        if "next" in links:
            next_url = links["next"]
            params = None
        elif pages_fetched < effective_max_pages:
            # Fallback if Link header was omitted (e.g. lightweight mocks)
            next_url = f"{GITHUB_API_URL}/users/{username}/repos"
            params = {
                "per_page": effective_per_page,
                "sort": "updated",
                "page": pages_fetched + 1,
            }
        else:
            next_url = None

    cache.set(key, repositories, settings.github_cache_ttl)

    return repositories


MAX_DETAIL_REPOSITORIES = 5
MANIFEST_FILES = ("package.json", "requirements.txt", "pyproject.toml")


def _dependencies_from_manifest(filename: str, text: str) -> list[str]:
    if filename == "package.json":
        try:
            data = json.loads(text)
        except ValueError:
            return []

        if not isinstance(data, dict):
            return []

        names = []
        for section in ("dependencies", "devDependencies"):
            values = data.get(section)
            if isinstance(values, dict):
                names.extend(values)
        return names

    if filename == "requirements.txt":
        names = []
        for line in text.splitlines():
            line = line.split("#", 1)[0].strip()
            match = re.match(r"[A-Za-z0-9_.-]+", line)
            if match:
                names.append(match.group(0))
        return names

    # pyproject.toml: take the leading package name of every quoted requirement string.
    return re.findall(r"""["']([A-Za-z0-9_.-]+)\s*(?:[<>=!~\[;,]|["'])""", text)


async def _fetch_manifest(full_name: str, filename: str) -> list[str]:
    response = await github_get(
        f"{GITHUB_API_URL}/repos/{full_name}/contents/{filename}"
    )

    if response.status_code != 200:
        return []

    content = response.json().get("content")
    if not content:
        return []

    try:
        text = base64.b64decode(content).decode("utf-8", errors="ignore")
    except ValueError:
        return []

    return _dependencies_from_manifest(filename, text)


async def _fetch_repo_details(full_name: str) -> dict:
    key = f"github:repo-details:{full_name.lower()}"
    cached = cache.get(key)

    if cached is not None:
        return cached

    details = {"languages": {}, "dependencies": []}

    response = await github_get(f"{GITHUB_API_URL}/repos/{full_name}/languages")
    if response.status_code == 200 and isinstance(response.json(), dict):
        details["languages"] = response.json()

    for filename in MANIFEST_FILES:
        try:
            details["dependencies"].extend(await _fetch_manifest(full_name, filename))
        except (httpx.HTTPError, ValueError):
            # One file that will not load should not lose the rest.
            continue

    cache.set(key, details, get_settings().github_cache_ttl)

    return details


async def get_repository_details(
    repositories: list[dict], limit: int = MAX_DETAIL_REPOSITORIES
) -> dict[str, dict]:
    """Languages and dependencies for the most recently updated non-fork repos.

    Only `limit` repos are looked at so a large profile stays inside the GitHub
    rate limit. Anything that fails is skipped; the skill list then falls back to
    the main language and topics for that repo.
    """
    candidates = [r for r in repositories if not r.get("fork") and r.get("full_name")]
    candidates.sort(key=lambda r: r.get("updated_at") or "", reverse=True)

    details = {}

    for repository in candidates[:limit]:
        try:
            details[repository["full_name"]] = await _fetch_repo_details(
                repository["full_name"]
            )
        except (GitHubRateLimitError, httpx.HTTPError):
            continue

    return details

async def get_github_diagnostics() -> dict:
    """Check GitHub API reachability, auth token presence, and quota status."""
    settings = get_settings()
    token = settings.github_token
    token_configured = bool(token)
    token_preview = None
    if token:
        clean = token.strip()
        token_preview = f"{clean[:4]}****" if len(clean) >= 4 else "****"

    client = get_client()
    start_time = time.perf_counter()

    try:
        response = await client.get(f"{GITHUB_API_URL}/rate_limit")
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        if response.status_code == 200:
            data = response.json()
            resources = data.get("resources", {})
            core = resources.get("core", {})
            search = resources.get("search", {})

            def _format_reset(ts: int | None) -> str | None:
                if not ts:
                    return None
                return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()

            return {
                "reachable": True,
                "latency_ms": latency_ms,
                "token_configured": token_configured,
                "token_preview": token_preview,
                "rate_limit": {
                    "core": {
                        "limit": core.get("limit"),
                        "remaining": core.get("remaining"),
                        "reset_at": _format_reset(core.get("reset")),
                    },
                    "search": {
                        "limit": search.get("limit"),
                        "remaining": search.get("remaining"),
                        "reset_at": _format_reset(search.get("reset")),
                    },
                },
            }

        return {
            "reachable": False,
            "status_code": response.status_code,
            "latency_ms": latency_ms,
            "token_configured": token_configured,
            "token_preview": token_preview,
            "rate_limit": None,
        }

    except Exception as exc:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "reachable": False,
            "latency_ms": latency_ms,
            "token_configured": token_configured,
            "token_preview": token_preview,
            "error": str(exc),
            "rate_limit": None,
        }
