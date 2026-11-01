"""Unit and integration tests for GitHub repository pagination (Issue #129).

Verifies:
- RFC 5988 Link header parsing.
- Following multi-page repository endpoints up to a configurable sensible cap.
- Accurate repository count and skills analysis across multiple pages.
- Rate-limit handling and error propagation during pagination.
- Caching behavior across multi-page fetches.
"""

from datetime import datetime, timezone
import httpx
import pytest

from app.cache import TTLCache
from app.config import Settings
from app.main import app
from app.services import github_service
from app.services.github_service import (
    GitHubRateLimitError,
    get_user_repositories,
    parse_github_link_header,
)

RESET_TS = 1893456000  # 2030-01-01T00:00:00Z


@pytest.fixture(autouse=True)
def clean_cache():
    """Clear memory cache between tests to prevent test pollution."""
    github_service.cache = TTLCache()


def test_parse_github_link_header_none_and_empty():
    """Empty or None header yields empty dict."""
    assert parse_github_link_header(None) == {}
    assert parse_github_link_header("") == {}
    assert parse_github_link_header("   ") == {}


def test_parse_github_link_header_standard_next_and_last():
    """Standard GitHub Link header with next and last relations."""
    header = (
        '<https://api.github.com/users/torvalds/repos?page=2&per_page=100>; rel="next", '
        '<https://api.github.com/users/torvalds/repos?page=4&per_page=100>; rel="last"'
    )
    links = parse_github_link_header(header)
    assert links == {
        "next": "https://api.github.com/users/torvalds/repos?page=2&per_page=100",
        "last": "https://api.github.com/users/torvalds/repos?page=4&per_page=100",
    }


def test_parse_github_link_header_all_four_relations():
    """Full set of GitHub pagination relations: prev, next, first, last."""
    header = (
        '<https://api.github.com/users/octocat/repos?page=1>; rel="prev", '
        '<https://api.github.com/users/octocat/repos?page=3>; rel="next", '
        '<https://api.github.com/users/octocat/repos?page=1>; rel="first", '
        '<https://api.github.com/users/octocat/repos?page=5>; rel="last"'
    )
    links = parse_github_link_header(header)
    assert links["prev"] == "https://api.github.com/users/octocat/repos?page=1"
    assert links["next"] == "https://api.github.com/users/octocat/repos?page=3"
    assert links["first"] == "https://api.github.com/users/octocat/repos?page=1"
    assert links["last"] == "https://api.github.com/users/octocat/repos?page=5"


def test_parse_github_link_header_whitespace_and_casing():
    """Resilient to unusual whitespace and casing in rel attribute."""
    header = '<https://api.github.com/repos?page=2>;   rel="NEXT"'
    links = parse_github_link_header(header)
    assert links.get("next") == "https://api.github.com/repos?page=2"


def _make_dummy_repos(start: int, count: int, language: str = "Python") -> list[dict]:
    return [
        {
            "name": f"repo-{i}",
            "description": f"Repository number {i}",
            "language": language,
            "stargazers_count": i * 2,
            "forks_count": i,
            "fork": False,
            "html_url": f"https://github.com/dev/repo-{i}",
            "updated_at": "2026-10-25T12:00:00Z",
        }
        for i in range(start, start + count)
    ]


async def test_single_page_when_fewer_than_per_page(github_mock):
    """When a user has fewer repositories than per_page, exactly 1 request is made."""
    dummy_repos = _make_dummy_repos(start=1, count=42)
    calls = github_mock(lambda r: httpx.Response(200, json=dummy_repos))

    repos = await get_user_repositories("smalluser", per_page=100)

    assert len(repos) == 42
    assert len(calls) == 1
    assert calls[0].url.params["page"] == "1"
    assert calls[0].url.params["per_page"] == "100"


async def test_multi_page_following_link_header(github_mock):
    """User with 145 repositories across 2 pages follows Link header rel='next'."""
    page_1 = _make_dummy_repos(start=1, count=100, language="Rust")
    page_2 = _make_dummy_repos(start=101, count=45, language="Go")

    def mock_router(request: httpx.Request):
        url_str = str(request.url)
        if "page=2" in url_str:
            return httpx.Response(200, json=page_2)
        # Page 1 includes Link header to page 2
        link_hdr = '<https://api.github.com/users/busydev/repos?page=2&per_page=100>; rel="next"'
        return httpx.Response(200, json=page_1, headers={"Link": link_hdr})

    calls = github_mock(mock_router)

    repos = await get_user_repositories("busydev", per_page=100, max_pages=3)

    assert len(repos) == 145
    assert len(calls) == 2
    assert repos[0]["name"] == "repo-1"
    assert repos[99]["name"] == "repo-100"
    assert repos[100]["name"] == "repo-101"
    assert repos[144]["name"] == "repo-145"


async def test_multi_page_respects_sensible_cap(github_mock):
    """User with 4 pages (400 repos) is capped at max_cap (300 repos / 3 pages)."""
    p1 = _make_dummy_repos(1, 100)
    p2 = _make_dummy_repos(101, 100)
    p3 = _make_dummy_repos(201, 100)
    p4 = _make_dummy_repos(301, 100)

    def mock_router(request: httpx.Request):
        url_str = str(request.url)
        if "page=2" in url_str:
            link = '<https://api.github.com/users/huge/repos?page=3>; rel="next"'
            return httpx.Response(200, json=p2, headers={"Link": link})
        if "page=3" in url_str:
            link = '<https://api.github.com/users/huge/repos?page=4>; rel="next"'
            return httpx.Response(200, json=p3, headers={"Link": link})
        if "page=4" in url_str:
            return httpx.Response(200, json=p4)
        link = '<https://api.github.com/users/huge/repos?page=2>; rel="next"'
        return httpx.Response(200, json=p1, headers={"Link": link})

    calls = github_mock(mock_router)

    repos = await get_user_repositories("huge", per_page=100, max_pages=3, max_cap=300)

    assert len(repos) == 300
    assert len(calls) == 3
    assert repos[-1]["name"] == "repo-300"


async def test_fallback_pagination_when_link_header_missing(github_mock):
    """When Link header is omitted by a proxy/mock, advances page parameter until exhausted."""
    p1 = _make_dummy_repos(1, 100)
    p2 = _make_dummy_repos(101, 30)

    def mock_router(request: httpx.Request):
        page = request.url.params.get("page")
        if page == "2":
            return httpx.Response(200, json=p2)
        return httpx.Response(200, json=p1)

    calls = github_mock(mock_router)

    repos = await get_user_repositories("fallbackdev", per_page=100, max_pages=3)

    assert len(repos) == 130
    assert len(calls) == 2


async def test_rate_limit_on_second_page_raises_and_does_not_cache(github_mock):
    """If rate limit is hit on page 2, raises GitHubRateLimitError and does not cache page 1."""
    p1 = _make_dummy_repos(1, 100)

    def mock_router(request: httpx.Request):
        if "page=2" in str(request.url):
            return httpx.Response(
                403,
                headers={
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(RESET_TS),
                },
            )
        link = '<https://api.github.com/users/limited/repos?page=2>; rel="next"'
        return httpx.Response(200, json=p1, headers={"Link": link})

    github_mock(mock_router)

    with pytest.raises(GitHubRateLimitError) as exc_info:
        await get_user_repositories("limited", per_page=100)

    assert exc_info.value.reset_at == datetime.fromtimestamp(RESET_TS, tz=timezone.utc)
    # Ensure incomplete data was NOT cached
    assert github_service.cache.get("github:repos:limited") is None


@pytest.fixture
async def api():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def test_not_found_user_returns_none(github_mock):
    """Non-existent username returns None on first page."""
    github_mock(lambda r: httpx.Response(404, json={"message": "Not Found"}))

    assert await get_user_repositories("ghost_user") is None


async def test_repositories_route_pagination_metadata(api, github_mock):
    """GET /api/github/users/{username}/repositories returns pagination attributes."""
    p1 = _make_dummy_repos(1, 100, language="TypeScript")
    p2 = _make_dummy_repos(101, 20, language="TypeScript")

    def mock_router(request: httpx.Request):
        if "page=2" in str(request.url):
            return httpx.Response(200, json=p2)
        link = '<https://api.github.com/users/alex/repos?page=2&per_page=100>; rel="next"'
        return httpx.Response(200, json=p1, headers={"Link": link})

    github_mock(mock_router)

    response = await api.get("/api/github/users/alex/repositories")
    assert response.status_code == 200
    data = response.json()

    assert data["username"] == "alex"
    assert data["repository_count"] == 120
    assert data["total_pages_fetched"] == 2
    assert data["has_more"] is False
    assert len(data["repositories"]) == 120


async def test_skills_route_counts_multi_page_repositories(api, github_mock):
    """GET /api/github/users/{username}/skills accurately reports total_repositories_analyzed."""
    p1 = _make_dummy_repos(1, 100, language="Python")
    p2 = _make_dummy_repos(101, 50, language="Python")

    def mock_router(request: httpx.Request):
        url_str = str(request.url)
        if "/repos" in url_str:
            if "page=2" in url_str:
                return httpx.Response(200, json=p2)
            link = '<https://api.github.com/users/pythonista/repos?page=2&per_page=100>; rel="next"'
            return httpx.Response(200, json=p1, headers={"Link": link})
        return httpx.Response(200, json={})

    github_mock(mock_router)

    response = await api.get("/api/github/users/pythonista/skills")
    assert response.status_code == 200
    data = response.json()

    assert data["username"] == "pythonista"
    assert data["total_repositories_analyzed"] == 150
    assert len(data["skills"]) > 0
    assert data["skills"][0]["name"] == "Python"
    assert data["skills"][0]["repository_count"] == 150

