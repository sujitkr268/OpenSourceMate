"""Tests for technology grouping and noise language filtering (Issue #130).

Complements Issue #22 and verifies:
- External data file `skill_mappings.json` loading and validation.
- Filtering of noise languages (Jupyter Notebook, Dockerfile, Makefile, etc.).
- Resolution of technology groups and ecosystems (e.g. HTML + CSS -> Web).
- Consolidation of related technologies without duplicate repository counts.
- Query parameter control on the `/api/github/users/{username}/skills` endpoint.
"""

import httpx
import pytest

from app.main import app
from app.services.skill_service import (
    analyze_skills,
    get_ignore_languages,
    is_noise_language,
    load_skill_mappings,
    resolve_group_for_skill,
)


@pytest.fixture(autouse=True)
def reset_mappings_cache():
    load_skill_mappings.cache_clear()


@pytest.fixture
async def api():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


def test_skill_mappings_file_is_valid_and_extensible():
    """Confirms `skill_mappings.json` contains required keys and valid data."""
    mappings = load_skill_mappings()
    assert "ignore_languages" in mappings
    assert "groups" in mappings

    ignore_list = mappings["ignore_languages"]
    assert "Jupyter Notebook" in ignore_list
    assert "Dockerfile" in ignore_list
    assert "Makefile" in ignore_list

    groups = mappings["groups"]
    assert "Web" in groups
    assert "HTML" in groups["Web"]
    assert "CSS" in groups["Web"]

    assert "JavaScript / TypeScript" in groups
    assert "JavaScript" in groups["JavaScript / TypeScript"]
    assert "TypeScript" in groups["JavaScript / TypeScript"]


def test_is_noise_language_helper():
    """Confirms case-insensitive noise language identification."""
    assert is_noise_language("Dockerfile") is True
    assert is_noise_language("dockerfile") is True
    assert is_noise_language("Makefile") is True
    assert is_noise_language("Jupyter Notebook") is True
    assert is_noise_language("CMake") is True

    # Real programming skills are not noise
    assert is_noise_language("Python") is False
    assert is_noise_language("Rust") is False
    assert is_noise_language("TypeScript") is False
    assert is_noise_language("Go") is False
    assert is_noise_language(None) is False


def test_resolve_group_for_skill():
    """Confirms technology to ecosystem group mapping."""
    assert resolve_group_for_skill("HTML") == "Web"
    assert resolve_group_for_skill("CSS") == "Web"
    assert resolve_group_for_skill("scss") == "Web"
    assert resolve_group_for_skill("JavaScript") == "JavaScript / TypeScript"
    assert resolve_group_for_skill("TypeScript") == "JavaScript / TypeScript"
    assert resolve_group_for_skill("C++") == "C / C++"
    assert resolve_group_for_skill("Rust") == "Systems & Embedded"

    # Unmapped languages return None
    assert resolve_group_for_skill("Haskell") is None


def test_ignore_noise_filters_dockerfile_makefile_and_jupyter():
    """Repositories featuring only Dockerfile or Makefile are filtered when ignore_noise=True."""
    repositories = [
        {"full_name": "dev/app", "language": "Python"},
        {"full_name": "dev/infra", "language": "Dockerfile"},
        {"full_name": "dev/build", "language": "Makefile"},
        {"full_name": "dev/analysis", "language": "Jupyter Notebook"},
    ]

    result = analyze_skills(repositories, ignore_noise=True)
    skill_names = [s["name"] for s in result["skills"]]

    assert skill_names == ["Python"]
    assert "Dockerfile" not in skill_names
    assert "Makefile" not in skill_names
    assert "Jupyter Notebook" not in skill_names


def test_ignore_noise_can_be_disabled():
    """When ignore_noise=False, generated/noise languages are included."""
    repositories = [
        {"full_name": "dev/app", "language": "Python"},
        {"full_name": "dev/infra", "language": "Dockerfile"},
    ]

    result = analyze_skills(repositories, ignore_noise=False)
    skill_names = {s["name"] for s in result["skills"]}

    assert "Python" in skill_names
    assert "Dockerfile" in skill_names


def test_standard_mode_annotates_group_attribute():
    """Standard mode keeps individual languages and decorates each with group name."""
    repositories = [
        {"full_name": "dev/web-one", "language": "HTML"},
        {"full_name": "dev/web-two", "language": "CSS"},
        {"full_name": "dev/script", "language": "TypeScript"},
        {"full_name": "dev/backend", "language": "Python"},
    ]

    result = analyze_skills(repositories, group_related=False)
    skills_by_name = {s["name"]: s for s in result["skills"]}

    assert skills_by_name["HTML"]["group"] == "Web"
    assert skills_by_name["CSS"]["group"] == "Web"
    assert skills_by_name["TypeScript"]["group"] == "JavaScript / TypeScript"
    assert skills_by_name["Python"]["group"] is None


def test_group_related_consolidates_web_technologies():
    """When group_related=True, HTML + CSS in a repository consolidate into 'Web'."""
    repositories = [
        {"full_name": "dev/site-1", "language": "HTML"},
        {"full_name": "dev/site-2", "language": "CSS"},
    ]
    details = {
        "dev/site-1": {"languages": {"HTML": 80, "CSS": 20}, "dependencies": []},
        "dev/site-2": {"languages": {"CSS": 100}, "dependencies": []},
    }

    result = analyze_skills(
        repositories, repo_details=details, group_related=True
    )
    skills = result["skills"]

    # "Web" should be consolidated with repository_count = 2 (each repo counts once)
    web_skill = next((s for s in skills if s["name"] == "Web"), None)
    assert web_skill is not None
    assert web_skill["type"] == "ecosystem"
    assert web_skill["repository_count"] == 2
    assert web_skill["percentage"] == 100.0
    assert "HTML" in web_skill["subskills"]
    assert "CSS" in web_skill["subskills"]


def test_group_related_consolidates_javascript_and_typescript():
    """JavaScript and TypeScript are unified into one ecosystem with subskills list."""
    repositories = [
        {"full_name": "dev/frontend", "language": "TypeScript"},
        {"full_name": "dev/legacy", "language": "JavaScript"},
        {"full_name": "dev/api", "language": "Go"},
    ]

    result = analyze_skills(repositories, group_related=True)
    skills_by_name = {s["name"]: s for s in result["skills"]}

    assert "JavaScript / TypeScript" in skills_by_name
    js_ts = skills_by_name["JavaScript / TypeScript"]
    assert js_ts["type"] == "ecosystem"
    assert js_ts["repository_count"] == 2
    assert set(js_ts["subskills"]) == {"JavaScript", "TypeScript"}

    # Unrelated Go is still present as language
    assert "Go" in skills_by_name
    assert skills_by_name["Go"]["type"] == "language"


async def test_skills_endpoint_group_related_query_param(api, github_mock):
    """GET /api/github/users/{username}/skills?group_related=true returns consolidated groups."""
    repos = [
        {"name": "blog", "language": "HTML", "fork": False},
        {"name": "styles", "language": "CSS", "fork": False},
        {"name": "server", "language": "Rust", "fork": False},
    ]

    def mock_router(request: httpx.Request):
        url = str(request.url)
        if "/repos" in url:
            return httpx.Response(200, json=repos)
        return httpx.Response(200, json={})

    github_mock(mock_router)

    # Standard call without group_related
    resp_std = await api.get("/api/github/users/webdev/skills")
    assert resp_std.status_code == 200
    std_data = resp_std.json()
    std_names = [s["name"] for s in std_data["skills"]]
    assert "HTML" in std_names
    assert "CSS" in std_names

    # Grouped call with group_related=true
    resp_grp = await api.get("/api/github/users/webdev/skills?group_related=true")
    assert resp_grp.status_code == 200
    grp_data = resp_grp.json()
    grp_names = [s["name"] for s in grp_data["skills"]]
    assert "Web" in grp_names
    assert "HTML" not in grp_names
    assert "CSS" not in grp_names

    web_entry = next(s for s in grp_data["skills"] if s["name"] == "Web")
    assert web_entry["type"] == "ecosystem"
    assert set(web_entry["subskills"]) == {"CSS", "HTML"}
