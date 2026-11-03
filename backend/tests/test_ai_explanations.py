from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.ai.ai_service import (
    build_template_explanation,
    generate_issue_match_explanation,
    settings,
)
from app.main import app


@pytest.fixture
def sample_issue():
    return {
        "id": 101,
        "title": "Fix memory leak in Python connection pool",
        "repository": "psf/requests",
        "url": "https://github.com/psf/requests/issues/101",
        "language": "Python",
        "labels": ["good first issue", "bug"],
        "comments": 2,
    }


def test_build_template_explanation_with_matching_language(sample_issue):
    explanation = build_template_explanation(sample_issue, ["Python", "FastAPI"])
    assert "psf/requests" in explanation
    assert "Python" in explanation
    assert "good first issue" in explanation
    assert "active discussion" in explanation


def test_build_template_explanation_with_title_skill_match():
    issue = {
        "title": "Add Docker Compose configuration",
        "repository": "org/repo",
        "language": "Go",
        "labels": ["help wanted"],
        "comments": 0,
    }
    explanation = build_template_explanation(issue, ["Docker", "Kubernetes"])
    assert "Docker" in explanation
    assert "community contributors" in explanation
    assert "fresh opportunity" in explanation


def test_build_template_explanation_fallback_when_no_skills_match():
    issue = {
        "title": "Update README contributors list",
        "repository": "vuejs/core",
        "language": "TypeScript",
        "labels": ["documentation"],
        "comments": 1,
    }
    explanation = build_template_explanation(issue, ["Rust", "C++"])
    assert "vuejs/core" in explanation
    assert "documentation" in explanation


@pytest.mark.asyncio
async def test_generate_explanation_without_api_key(sample_issue):
    # With no API key configured, should gracefully return grounded template
    with patch("app.ai.ai_service.client", None):
        result = await generate_issue_match_explanation(sample_issue, ["Python"])
        assert result["is_ai_generated"] is False
        assert "psf/requests" in result["explanation"]
        assert "Python" in result["explanation"]
        assert result["difficulty_level"] == "beginner"


@pytest.mark.asyncio
async def test_generate_explanation_with_mocked_llm(sample_issue):
    mock_choice = MagicMock()
    mock_choice.message.content = (
        "This Python issue in psf/requests directly matches your core skills "
        "and is flagged as a beginner-friendly good first issue."
    )
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    with patch("app.ai.ai_service.client", mock_client):
        result = await generate_issue_match_explanation(sample_issue, ["Python"])
        assert result["is_ai_generated"] is True
        assert "psf/requests" in result["explanation"]
        assert mock_client.chat.completions.create.called


@pytest.mark.asyncio
async def test_generate_explanation_falls_back_when_llm_fails(sample_issue):
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        side_effect=RuntimeError("Rate limit reached")
    )

    with patch("app.ai.ai_service.client", mock_client):
        result = await generate_issue_match_explanation(sample_issue, ["Python"])
        # Graceful fallback to template text
        assert result["is_ai_generated"] is False
        assert "psf/requests" in result["explanation"]
        assert "Python" in result["explanation"]


@pytest.mark.asyncio
async def test_explanation_output_length_is_capped(sample_issue):
    long_response = "word " * 150
    mock_choice = MagicMock()
    mock_choice.message.content = long_response
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    with patch("app.ai.ai_service.client", mock_client):
        result = await generate_issue_match_explanation(sample_issue, ["Python"])
        assert result["is_ai_generated"] is True
        # Output should be capped with ellipsis
        words = result["explanation"].split()
        assert len(words) <= settings.osm_max_explanation_words + 1
        assert result["explanation"].endswith("...")


@pytest.mark.asyncio
async def test_security_api_keys_never_leaked_in_output(sample_issue):
    secret_key = "sk-super-secret-key-12345"
    with patch("app.ai.ai_service.settings.ai_api_key", secret_key):
        result = await generate_issue_match_explanation(sample_issue, ["Python"])
        assert secret_key not in result["explanation"]
        assert secret_key not in str(result)


@pytest.mark.asyncio
async def test_matching_route_includes_explanations():
    mock_repos = [
        {"name": "repo1", "language": "Python", "stargazers_count": 5},
    ]
    mock_search = {
        "total_count": 1,
        "issues": [
            {
                "id": 555,
                "title": "Improve documentation for quickstart",
                "repository": "pallets/flask",
                "url": "https://github.com/pallets/flask/issues/555",
                "state": "open",
                "labels": ["good first issue"],
                "comments": 1,
                "created_at": "2026-10-15T00:00:00Z",
                "updated_at": "2026-10-20T00:00:00Z",
                "language": "Python",
            }
        ],
    }

    with (
        patch(
            "app.api.routes.matching.get_user_repositories",
            AsyncMock(return_value=mock_repos),
        ),
        patch(
            "app.api.routes.matching.search_github_issues",
            AsyncMock(return_value=mock_search),
        ),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/matching/users/testuser/issues")
            assert response.status_code == 200
            data = response.json()
            assert len(data["recommendations"]) > 0
            rec = data["recommendations"][0]
            assert "explanation" in rec
            assert "is_ai_generated" in rec
            assert "pallets/flask" in rec["explanation"]


@pytest.mark.asyncio
async def test_dedicated_explain_endpoint(sample_issue):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/matching/explain",
            json={"issue": sample_issue, "user_skills": ["Python"]},
        )
        assert response.status_code == 200
        data = response.json()
        assert "explanation" in data
        assert "psf/requests" in data["explanation"]
