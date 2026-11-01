"""Unit tests for skill proficiency indicator computation (Issue #131).

Tests:
- Deterministic proficiency scoring (Learning, Comfortable, Strong)
- Factor calculations: breadth (repo count), depth (code share), and recency (activity)
- Explanations and estimated disclaimers
- analyze_skills integration with repository timestamps
"""

from datetime import datetime, timezone
import pytest

from app.services.skill_service import (
    analyze_skills,
    calculate_proficiency,
)

REF_DATE = datetime(2026, 10, 31, 12, 0, 0, tzinfo=timezone.utc)


def test_proficiency_learning_level():
    """Single repository with low percentage yields Learning level."""
    level, score, reason = calculate_proficiency(
        repository_count=1,
        percentage=8.5,
        latest_updated_at=None,
        now=REF_DATE,
    )
    assert level == "Learning"
    assert 3.0 <= score <= 4.5
    assert "Estimated as Learning" in reason
    assert "1 repository" in reason
    assert "8.5% code share" in reason
    assert "Estimated indicator" in reason


def test_proficiency_comfortable_level():
    """Multi-project usage with moderate code share and activity yields Comfortable."""
    # 2 repos (2 pts) + 25% share (2 pts) + updated 120 days ago (2 pts) = 6 pts -> Comfortable
    level, score, reason = calculate_proficiency(
        repository_count=3,
        percentage=28.0,
        latest_updated_at="2026-06-01T10:00:00Z",
        now=REF_DATE,
    )
    assert level == "Comfortable"
    assert 5.0 <= score <= 7.0
    assert "Estimated as Comfortable" in reason
    assert "3 repositories" in reason
    assert "28.0% code share" in reason
    assert "active within the past year" in reason


def test_proficiency_strong_level():
    """High repo count, dominant percentage, and recent activity yields Strong."""
    # 6 repos (3 pts) + 55% share (3 pts) + updated 15 days ago (3 pts) = 9 pts -> Strong
    level, score, reason = calculate_proficiency(
        repository_count=6,
        percentage=55.0,
        latest_updated_at="2026-10-16T12:00:00Z",
        now=REF_DATE,
    )
    assert level == "Strong"
    assert score >= 8.5
    assert "Estimated as Strong" in reason
    assert "6 repositories" in reason
    assert "55.0% code share" in reason
    assert "active recently" in reason


def test_proficiency_zero_or_negative():
    """Empty or zero metrics fall back safely to Learning."""
    level, score, reason = calculate_proficiency(0, 0)
    assert level == "Learning"
    assert "Estimated as Learning" in reason


def test_proficiency_old_activity():
    """Repos inactive for over a year receive lower recency score."""
    # 5 repos (3 pts) + 50% share (3 pts) + updated 500 days ago (1 pt) = 7 pts -> Strong
    level, score, reason = calculate_proficiency(
        repository_count=5,
        percentage=50.0,
        latest_updated_at="2024-01-01T00:00:00Z",
        now=REF_DATE,
    )
    assert level == "Strong"
    assert "last updated" in reason


def test_analyze_skills_computes_proficiency_with_timestamps():
    """analyze_skills automatically aggregates repo updated_at timestamps into skills."""
    repositories = [
        {
            "name": "project-1",
            "language": "Python",
            "updated_at": "2026-10-20T10:00:00Z",
            "fork": False,
        },
        {
            "name": "project-2",
            "language": "Python",
            "updated_at": "2026-10-28T10:00:00Z",
            "fork": False,
        },
        {
            "name": "toy-app",
            "language": "Go",
            "updated_at": "2023-01-01T00:00:00Z",
            "fork": False,
        },
    ]

    result = analyze_skills(repositories)
    skills = {s["name"]: s for s in result["skills"]}

    assert "Python" in skills
    py = skills["Python"]
    assert py["repository_count"] == 2
    assert py["proficiency"] in ("Comfortable", "Strong")
    assert "proficiency_score" in py
    assert "proficiency_reason" in py
    assert "Python" in py["proficiency_reason"]

    assert "Go" in skills
    go = skills["Go"]
    assert go["repository_count"] == 1
    assert go["proficiency"] == "Learning"
    assert "last updated" in go["proficiency_reason"] or "active" in go["proficiency_reason"]


def test_analyze_skills_without_proficiency():
    """Passing compute_proficiency=False omits proficiency fields."""
    repositories = [{"name": "repo1", "language": "TypeScript"}]
    result = analyze_skills(repositories, compute_proficiency=False)
    assert len(result["skills"]) == 1
    ts = result["skills"][0]
    assert "proficiency" not in ts

