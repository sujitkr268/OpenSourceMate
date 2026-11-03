from datetime import UTC, datetime

import httpx
import pytest

from app.config import Settings
from app.services import github_service
from app.services.github_service import (
    GitHubRateLimitError,
    get_github_user,
    get_user_repositories,
)
from app.services.issue_service import search_github_issues

RESET = 1893456000  # 2030-01-01T00:00:00Z


def ok(request):
    return httpx.Response(200, json={"login": "octocat"})


async def test_user_is_cached_between_calls(github_mock):
    calls = github_mock(ok)

    first = await get_github_user("octocat")
    second = await get_github_user("OctoCat")

    assert first == second == {"login": "octocat"}
    assert len(calls) == 1


async def test_repositories_are_cached_between_calls(github_mock):
    calls = github_mock(lambda r: httpx.Response(200, json=[{"name": "repo"}]))

    await get_user_repositories("octocat")
    await get_user_repositories("octocat")

    assert len(calls) == 1


async def test_cache_is_skipped_when_ttl_is_zero(github_mock, monkeypatch):
    calls = github_mock(ok)
    monkeypatch.setattr(
        github_service,
        "get_settings",
        lambda: Settings(_env_file=None, github_cache_ttl=0),
    )

    await get_github_user("octocat")
    await get_github_user("octocat")

    assert len(calls) == 2


async def test_missing_user_returns_none_and_is_not_cached(github_mock):
    calls = github_mock(lambda r: httpx.Response(404, json={}))

    assert await get_github_user("ghost") is None
    assert await get_github_user("ghost") is None
    assert len(calls) == 2


async def test_429_raises_rate_limit_error(github_mock):
    github_mock(
        lambda r: httpx.Response(429, headers={"X-RateLimit-Reset": str(RESET)})
    )

    with pytest.raises(GitHubRateLimitError) as exc_info:
        await get_github_user("octocat")

    assert exc_info.value.reset_at == datetime.fromtimestamp(RESET, tz=UTC)


async def test_403_with_no_remaining_requests_is_a_rate_limit(github_mock):
    github_mock(
        lambda r: httpx.Response(
            403,
            headers={
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(RESET),
            },
        )
    )

    with pytest.raises(GitHubRateLimitError):
        await get_user_repositories("octocat")


async def test_plain_403_is_not_a_rate_limit(github_mock):
    github_mock(lambda r: httpx.Response(403, headers={"X-RateLimit-Remaining": "42"}))

    with pytest.raises(httpx.HTTPStatusError):
        await get_github_user("octocat")


async def test_rate_limit_without_reset_header(github_mock):
    github_mock(lambda r: httpx.Response(429))

    with pytest.raises(GitHubRateLimitError) as exc_info:
        await get_github_user("octocat")

    assert exc_info.value.reset_at is None


async def test_rate_limited_response_is_not_cached(github_mock):
    state = {"limited": True}

    def handler(request):
        if state["limited"]:
            return httpx.Response(429)
        return httpx.Response(200, json={"login": "octocat"})

    github_mock(handler)

    with pytest.raises(GitHubRateLimitError):
        await get_github_user("octocat")

    state["limited"] = False
    assert await get_github_user("octocat") == {"login": "octocat"}


async def test_issue_search_uses_the_same_rate_limit_handling(github_mock):
    github_mock(lambda r: httpx.Response(429))

    with pytest.raises(GitHubRateLimitError):
        await search_github_issues(language="python")


def test_token_is_sent_when_configured(monkeypatch):
    monkeypatch.setattr(github_service, "_client", None)
    monkeypatch.setattr(
        github_service,
        "get_settings",
        lambda: Settings(_env_file=None, github_token="abc123"),
    )

    client = github_service.get_client()

    assert client.headers["Authorization"] == "Bearer abc123"


def test_no_auth_header_without_token(monkeypatch):
    monkeypatch.setattr(github_service, "_client", None)
    monkeypatch.setattr(
        github_service,
        "get_settings",
        lambda: Settings(_env_file=None, github_token=None),
    )

    client = github_service.get_client()

    assert "Authorization" not in client.headers


async def test_get_user_repositories_paginates_beyond_first_page(github_mock):
    calls = []

    def handler(request):
        page = request.url.params.get("page", "1")
        calls.append(page)
        if page == "1":
            # Return 100 repos for page 1
            return httpx.Response(200, json=[{"name": f"repo-{i}"} for i in range(100)])
        elif page == "2":
            # Return 25 repos for page 2 (terminates pagination)
            return httpx.Response(
                200, json=[{"name": f"repo-{100 + i}"} for i in range(25)]
            )
        return httpx.Response(200, json=[])

    github_mock(handler)
    repos = await get_user_repositories("prolific-coder")

    assert len(repos) == 125
    assert calls == ["1", "2"]
