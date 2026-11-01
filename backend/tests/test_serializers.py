import pytest
from pydantic import ValidationError

from app.schemas.serializers import (
    ErrorDetailSerializer,
    ErrorResponseSerializer,
    ExtendedGitHubUserProfileSerializer,
    GitHubUserProfileSerializer,
    HealthDiagnosticsSerializer,
    HealthResponseSerializer,
    IssueAnalysisRequestSerializer,
    IssueAnalysisResponseSerializer,
    IssueItemSerializer,
    IssueLabelSerializer,
    IssueSearchResponseSerializer,
    MatchedIssueRecommendationSerializer,
    MatchedIssuesResponseSerializer,
    RepositoryItemSerializer,
    RepositoryListSerializer,
    SkillItemSerializer,
    UserSkillsSerializer,
)


def test_health_response_serializer():
    data = {
        "status": "healthy",
        "service": "OpenSourceMate API",
        "version": "0.1.0",
    }
    serializer = HealthResponseSerializer(**data)
    assert serializer.status == "healthy"
    assert serializer.service == "OpenSourceMate API"
    assert serializer.version == "0.1.0"
    assert serializer.model_dump() == data


def test_health_diagnostics_serializer():
    data = {
        "status": "healthy",
        "service": "OpenSourceMate API",
        "version": "0.1.0",
        "github": {"reachable": True, "core": {"remaining": 50}},
        "cache": {"hits": 10, "misses": 2},
    }
    serializer = HealthDiagnosticsSerializer(**data)
    assert serializer.status == "healthy"
    assert serializer.github["reachable"] is True
    assert serializer.cache["hits"] == 10


def test_error_detail_and_response_serializer():
    detail = ErrorDetailSerializer(
        code="INVALID_USERNAME",
        message="Invalid GitHub username format",
        details={"username": "invalid--user"},
    )
    assert detail.code == "INVALID_USERNAME"
    assert detail.details["username"] == "invalid--user"

    envelope = ErrorResponseSerializer(
        error=detail,
        detail="Invalid GitHub username format",
        reset_at="2030-01-01T00:00:00Z",
    )
    dumped = envelope.model_dump()
    assert dumped["error"]["code"] == "INVALID_USERNAME"
    assert dumped["detail"] == "Invalid GitHub username format"
    assert dumped["reset_at"] == "2030-01-01T00:00:00Z"


def test_github_user_profile_serializer():
    data = {
        "username": "torvalds",
        "name": "Linus Torvalds",
        "bio": "Linux creator",
        "avatar_url": "https://avatars.githubusercontent.com/u/1024025",
        "public_repositories": 7,
        "followers": 200000,
        "following": 0,
        "profile_url": "https://github.com/torvalds",
    }
    profile = GitHubUserProfileSerializer(**data)
    assert profile.username == "torvalds"
    assert profile.public_repositories == 7

    extended_data = {
        **data,
        "location": "Portland, OR",
        "company": "Linux Foundation",
        "blog": "https://kernel.org",
        "twitter_username": None,
        "created_at": "2011-09-03T15:26:22Z",
        "public_gists": 0,
    }
    extended = ExtendedGitHubUserProfileSerializer(**extended_data)
    assert extended.location == "Portland, OR"
    assert extended.company == "Linux Foundation"
    assert extended.public_gists == 0


def test_repository_serializers():
    repo_data = {
        "name": "OpenSourceMate",
        "description": "AI contribution assistant",
        "language": "Python",
        "stars": 42,
        "forks": 10,
        "is_fork": False,
        "url": "https://github.com/Muskankr/OpenSourceMate",
        "updated_at": "2026-10-30T00:00:00Z",
    }
    repo = RepositoryItemSerializer(**repo_data)
    assert repo.name == "OpenSourceMate"
    assert repo.stars == 42
    assert repo.is_fork is False

    repo_list = RepositoryListSerializer(
        username="Muskankr",
        repository_count=1,
        repositories=[repo],
    )
    assert repo_list.repository_count == 1
    assert repo_list.repositories[0].name == "OpenSourceMate"


def test_skill_serializers():
    skill = SkillItemSerializer(
        name="TypeScript",
        repository_count=5,
        percentage=50.0,
        type="language",
        weight=1.0,
    )
    assert skill.name == "TypeScript"
    assert skill.percentage == 50.0

    user_skills = UserSkillsSerializer(
        username="developer",
        skills=[skill],
        total_repositories_analyzed=10,
    )
    assert user_skills.total_repositories_analyzed == 10
    assert len(user_skills.skills) == 1


def test_issue_and_matching_serializers():
    label = IssueLabelSerializer(name="good first issue", color="7057ff")
    assert label.name == "good first issue"

    issue = IssueItemSerializer(
        id=12345,
        title="Add documentation for health check",
        url="https://github.com/org/repo/issues/12345",
        repository="org/repo",
        labels=["documentation"],
        comments=2,
        created_at="2026-10-01T00:00:00Z",
        updated_at="2026-10-02T00:00:00Z",
        state="open",
    )
    assert issue.id == 12345
    assert issue.state == "open"

    search_resp = IssueSearchResponseSerializer(
        total_count=1,
        issues=[issue.model_dump()],
    )
    assert search_resp.total_count == 1

    recommendation = MatchedIssueRecommendationSerializer(
        id=12345,
        title="Add documentation for health check",
        url="https://github.com/org/repo/issues/12345",
        repository="org/repo",
        labels=["good first issue"],
        comments=2,
        created_at="2026-10-01T00:00:00Z",
        updated_at="2026-10-02T00:00:00Z",
        matched_skills=["python"],
        score=0.92,
        score_method="keyword-tfidf",
        ai_explanation="Great beginner issue for Python developers",
    )
    assert recommendation.score == 0.92
    assert recommendation.matched_skills == ["python"]

    matched_resp = MatchedIssuesResponseSerializer(
        username="octocat",
        skills=["python"],
        recommendations=[recommendation],
    )
    assert matched_resp.username == "octocat"
    assert len(matched_resp.recommendations) == 1


def test_ai_analysis_serializers():
    req = IssueAnalysisRequestSerializer(
        issue={"id": 1, "title": "Implement cache"},
        user_skills=["python", "fastapi"],
    )
    assert req.user_skills == ["python", "fastapi"]

    resp = IssueAnalysisResponseSerializer(
        fit_score=95,
        complexity="Easy",
        summary="A simple task",
        prerequisites=["Python 3.10+"],
        key_files=["cache.py"],
        suggested_steps=["Add TTL logic"],
        explanation="High match with your Python skills",
    )
    assert resp.fit_score == 95
    assert resp.complexity == "Easy"


def test_serializer_validation_errors():
    with pytest.raises(ValidationError):
        # Missing required fields
        GitHubUserProfileSerializer(username="octocat")  # avatar_url etc missing
