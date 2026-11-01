from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

USER = {
    "login": "octocat",
    "name": "The Octocat",
    "bio": "hi",
    "avatar_url": "https://example.com/a.png",
    "public_repos": 3,
    "followers": 10,
    "following": 2,
    "html_url": "https://github.com/octocat",
    "location": "San Francisco, CA",
    "company": "@github",
    "blog": "https://github.blog",
    "twitter_username": "github",
    "created_at": "2011-01-25T18:44:36Z",
    "public_gists": 8,
}


def make_repo(name, language, fork=False):
    return {
        "name": name,
        "description": None,
        "language": language,
        "stargazers_count": 1,
        "forks_count": 0,
        "fork": fork,
        "html_url": f"https://github.com/octocat/{name}",
        "updated_at": "2024-01-01T00:00:00Z",
    }


def patch_user(value):
    return patch(
        "app.api.routes.github.get_github_user", AsyncMock(return_value=value)
    )


def patch_repos(value):
    return patch(
        "app.api.routes.github.get_user_repositories",
        AsyncMock(return_value=value),
    )


def test_health():
    assert client.get("/api/health").json()["status"] == "healthy"


def test_get_user_valid():
    with patch_user(USER):
        response = client.get("/api/github/users/octocat")
    assert response.status_code == 200
    assert response.json() == {
        "username": "octocat",
        "name": "The Octocat",
        "bio": "hi",
        "avatar_url": "https://example.com/a.png",
        "public_repositories": 3,
        "followers": 10,
        "following": 2,
        "profile_url": "https://github.com/octocat",
        "location": "San Francisco, CA",
        "company": "@github",
        "blog": "https://github.blog",
        "twitter_username": "github",
        "created_at": "2011-01-25T18:44:36Z",
        "public_gists": 8,
    }


def test_get_user_sparse_profile():
    sparse_user = {
        "login": "minimalist",
        "name": None,
        "bio": None,
        "avatar_url": "https://example.com/min.png",
        "public_repos": 0,
        "followers": 0,
        "following": 0,
        "html_url": "https://github.com/minimalist",
        "location": None,
        "company": None,
        "blog": None,
        "twitter_username": None,
        "created_at": "2022-01-01T00:00:00Z",
        "public_gists": 0,
    }
    with patch_user(sparse_user):
        response = client.get("/api/github/users/minimalist")
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "minimalist"
    assert data["name"] is None
    assert data["bio"] is None
    assert data["location"] is None
    assert data["company"] is None
    assert data["blog"] is None
    assert data["twitter_username"] is None
    assert data["created_at"] == "2022-01-01T00:00:00Z"
    assert data["public_gists"] == 0


def test_get_user_missing_optional_keys():
    bare_user = {
        "login": "barebones",
        "avatar_url": "https://example.com/b.png",
        "public_repos": 1,
        "followers": 0,
        "following": 0,
        "html_url": "https://github.com/barebones",
    }
    with patch_user(bare_user):
        response = client.get("/api/github/users/barebones")
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "barebones"
    assert data["name"] is None
    assert data["bio"] is None
    assert data["location"] is None
    assert data["company"] is None
    assert data["blog"] is None
    assert data["twitter_username"] is None
    assert data["created_at"] is None
    assert data["public_gists"] == 0


def test_get_user_not_found():
    with patch_user(None):
        response = client.get("/api/github/users/ghost")
    assert response.status_code == 404
    assert response.json()["detail"] == "GitHub user not found"


def test_get_repositories_valid_with_fork_and_no_language():
    repos = [make_repo("a", "Python"), make_repo("b", None, fork=True)]
    with patch_repos(repos):
        response = client.get("/api/github/users/octocat/repositories")
    body = response.json()
    assert response.status_code == 200
    assert body["repository_count"] == 2
    assert body["repositories"][0]["language"] == "Python"
    assert body["repositories"][1]["is_fork"] is True
    assert body["repositories"][1]["language"] is None


def test_get_repositories_zero():
    with patch_repos([]):
        response = client.get("/api/github/users/octocat/repositories")
    assert response.status_code == 200
    assert response.json()["repository_count"] == 0
    assert response.json()["repositories"] == []


def test_get_repositories_not_found():
    with patch_repos(None):
        response = client.get("/api/github/users/ghost/repositories")
    assert response.status_code == 404


def test_skills_valid():
    repos = [make_repo("a", "Python"), make_repo("b", "Python"), make_repo("c", "Go")]
    with patch_repos(repos):
        response = client.get("/api/github/users/octocat/skills")
    body = response.json()
    assert response.status_code == 200
    assert body["username"] == "octocat"
    assert body["total_repositories_analyzed"] == 3
    # type, weight, and proficiency indicators are additive fields; the original keys are unchanged.
    skill_0 = body["skills"][0]
    assert skill_0["name"] == "Python"
    assert skill_0["repository_count"] == 2
    assert skill_0["percentage"] == 66.67
    assert skill_0["type"] == "language"
    assert skill_0["weight"] == 1.0
    assert skill_0["proficiency"] in ("Learning", "Comfortable", "Strong")
    assert isinstance(skill_0["proficiency_score"], float)
    assert "Estimated as" in skill_0["proficiency_reason"]


def test_skills_zero_repos():
    with patch_repos([]):
        response = client.get("/api/github/users/octocat/skills")
    assert response.json() == {
        "username": "octocat",
        "skills": [],
        "total_repositories_analyzed": 0,
    }


def test_skills_all_languages_none():
    with patch_repos([make_repo("a", None), make_repo("b", None)]):
        response = client.get("/api/github/users/octocat/skills")
    assert response.json()["skills"] == []
    assert response.json()["total_repositories_analyzed"] == 2


def test_skills_not_found():
    with patch_repos(None):
        response = client.get("/api/github/users/ghost/skills")
    assert response.status_code == 404
