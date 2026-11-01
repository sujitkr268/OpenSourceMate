from unittest.mock import AsyncMock, patch
import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.utils.validation import is_valid_github_username, validate_github_username
from app.exceptions import InvalidUsernameError

client = TestClient(app)


def test_is_valid_github_username():
    # Valid usernames
    assert is_valid_github_username("octocat") is True
    assert is_valid_github_username("a") is True
    assert is_valid_github_username("a-b") is True
    assert is_valid_github_username("Babin123456") is True
    assert is_valid_github_username("user-name-123") is True
    assert is_valid_github_username("a" * 39) is True

    # Invalid usernames
    assert is_valid_github_username("") is False
    assert is_valid_github_username(None) is False
    assert is_valid_github_username("-octocat") is False  # starts with hyphen
    assert is_valid_github_username("octocat-") is False  # ends with hyphen
    assert is_valid_github_username("octo--cat") is False  # consecutive hyphens
    assert is_valid_github_username("a" * 40) is False  # too long
    assert is_valid_github_username("octo cat") is False  # whitespace
    assert is_valid_github_username("octocat!") is False  # special character
    assert is_valid_github_username("octo@cat") is False  # special character


def test_validate_github_username_raises():
    with pytest.raises(InvalidUsernameError) as exc_info:
        validate_github_username("-bad-username-")
    assert exc_info.value.status_code == 400
    assert exc_info.value.code == "INVALID_USERNAME"
    assert "Invalid GitHub username" in exc_info.value.message


def test_invalid_username_returns_unified_error_format_400():
    invalid_usernames = ["-leadinghyphen", "trailinghyphen-", "double--hyphen", "has space", "a" * 45]

    for username in invalid_usernames:
        resp = client.get(f"/api/github/users/{username}")
        assert resp.status_code == 400
        data = resp.json()
        assert "error" in data
        assert data["error"]["code"] == "INVALID_USERNAME"
        assert "message" in data["error"]
        assert "detail" in data


def test_repositories_invalid_username_returns_400():
    resp = client.get("/api/github/users/-invalid-/repositories")
    assert resp.status_code == 400
    data = resp.json()
    assert data["error"]["code"] == "INVALID_USERNAME"


def test_skills_invalid_username_returns_400():
    resp = client.get("/api/github/users/--invalid--/skills")
    assert resp.status_code == 400
    data = resp.json()
    assert data["error"]["code"] == "INVALID_USERNAME"


def test_matching_invalid_username_returns_400():
    resp = client.get("/api/matching/users/-invalid/issues")
    assert resp.status_code == 400
    data = resp.json()
    assert data["error"]["code"] == "INVALID_USERNAME"


def test_not_found_returns_unified_error_format_404():
    with patch("app.api.routes.github.get_github_user", AsyncMock(return_value=None)):
        resp = client.get("/api/github/users/nonexistentuser")
    assert resp.status_code == 404
    data = resp.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert data["error"]["message"] == "GitHub user not found"
    assert data["detail"] == "GitHub user not found"


def test_validation_error_returns_unified_error_format_422():
    # per_page le=100 in issues search; passing 500 causes RequestValidationError
    resp = client.get("/api/issues/search?per_page=500")
    assert resp.status_code == 422
    data = resp.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert data["error"]["message"] == "Request validation failed."
    assert "details" in data["error"]
    assert len(data["error"]["details"]) > 0


def test_rate_limit_returns_unified_error_format_429():
    from app.services.github_service import GitHubRateLimitError
    from datetime import datetime, timezone

    reset_time = datetime(2030, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    with patch(
        "app.api.routes.github.get_github_user",
        AsyncMock(side_effect=GitHubRateLimitError(reset_at=reset_time)),
    ):
        resp = client.get("/api/github/users/octocat")

    assert resp.status_code == 429
    data = resp.json()
    assert "error" in data
    assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
    assert "GitHub rate limit reached" in data["error"]["message"]
    assert data["reset_at"] == "2030-01-01T00:00:00+00:00"
    assert data["detail"] == "GitHub rate limit reached. Please try again later."
