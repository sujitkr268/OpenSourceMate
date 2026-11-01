from typing import Any
from pydantic import BaseModel, Field


# ---------------------------------------------------------
# Error Serializers
# ---------------------------------------------------------
class ErrorDetailSerializer(BaseModel):
    """Detailed error object conforming to the standardized error shape."""

    code: str = Field(
        ...,
        description="Unique machine-readable error code",
        json_schema_extra={"example": "NOT_FOUND"},
    )
    message: str = Field(
        ...,
        description="Human-readable error description",
        json_schema_extra={"example": "GitHub user not found"},
    )
    details: Any = Field(
        default=None,
        description="Optional diagnostic details or validation error list",
    )


class ErrorResponseSerializer(BaseModel):
    """Unified error envelope returned for all API error responses."""

    error: ErrorDetailSerializer
    detail: str = Field(
        ...,
        description="Top-level error message for backward compatibility",
    )
    reset_at: str | None = Field(
        default=None,
        description="ISO timestamp for rate limit resets",
    )


# ---------------------------------------------------------
# Health Check Serializers
# ---------------------------------------------------------
class HealthResponseSerializer(BaseModel):
    """Health check response serializer for GET /api/health and /api/health/."""

    status: str = Field(
        default="healthy",
        description="Current service health status",
        json_schema_extra={"example": "healthy"},
    )
    service: str = Field(
        default="OpenSourceMate API",
        description="Service identifier",
        json_schema_extra={"example": "OpenSourceMate API"},
    )
    version: str = Field(
        default="0.1.0",
        description="API semantic version",
        json_schema_extra={"example": "0.1.0"},
    )


class HealthDiagnosticsSerializer(BaseModel):
    """Diagnostics payload with upstream service connectivity and cache metrics."""

    status: str = Field(
        ...,
        description="Overall health status",
        json_schema_extra={"example": "healthy"},
    )
    service: str = Field(default="OpenSourceMate API", description="Service identifier")
    version: str = Field(default="0.1.0", description="API version")
    github: dict[str, Any] = Field(
        ...,
        description="GitHub API connectivity and rate limit stats",
    )
    cache: dict[str, Any] = Field(..., description="In-memory cache metrics")


# ---------------------------------------------------------
# GitHub User and Repositories Serializers
# ---------------------------------------------------------
class GitHubUserProfileSerializer(BaseModel):
    """User profile response serializer matching standard profile payload."""

    username: str = Field(..., description="GitHub handle/login")
    name: str | None = Field(default=None, description="Display name")
    bio: str | None = Field(default=None, description="User biography")
    avatar_url: str = Field(..., description="URL to avatar image")
    public_repositories: int = Field(
        ..., description="Number of public repositories"
    )
    followers: int = Field(..., description="Follower count")
    following: int = Field(..., description="Following count")
    profile_url: str = Field(..., description="Public GitHub profile URL")


class ExtendedGitHubUserProfileSerializer(GitHubUserProfileSerializer):
    """Extended profile serializer including optional bio and social metadata."""

    location: str | None = Field(default=None, description="Location if provided")
    company: str | None = Field(default=None, description="Company or organization")
    blog: str | None = Field(default=None, description="Personal website or blog")
    twitter_username: str | None = Field(
        default=None, description="Twitter / X username"
    )
    created_at: str | None = Field(
        default=None, description="Account creation timestamp"
    )
    public_gists: int = Field(default=0, description="Public gist count")


class RepositoryItemSerializer(BaseModel):
    """Individual repository summary serializer."""

    name: str = Field(..., description="Repository name")
    description: str | None = Field(default=None, description="Repository description")
    language: str | None = Field(
        default=None, description="Primary programming language"
    )
    stars: int = Field(default=0, description="Star count")
    forks: int = Field(default=0, description="Fork count")
    is_fork: bool = Field(
        default=False, description="Whether this repository is a fork"
    )
    url: str = Field(..., description="HTML URL to repository")
    updated_at: str | None = Field(default=None, description="Last update ISO timestamp")


class RepositoryListSerializer(BaseModel):
    """List of repositories for a user."""

    username: str = Field(..., description="Target GitHub username")
    repository_count: int = Field(
        ..., description="Total repository count returned"
    )
    repositories: list[RepositoryItemSerializer] = Field(
        default_factory=list, description="Repository list"
    )


# ---------------------------------------------------------
# Skill Analysis Serializers
# ---------------------------------------------------------
class SkillItemSerializer(BaseModel):
    """Individual skill breakdown serializer."""

    name: str = Field(..., description="Skill / technology name")
    repository_count: int = Field(
        ..., description="Number of repositories using this skill"
    )
    percentage: float = Field(..., description="Skill percentage weight")
    type: str | None = Field(
        default=None, description="Skill classification, e.g. language or framework"
    )
    weight: float | None = Field(
        default=None, description="Calculated skill weight"
    )
    proficiency: str | None = Field(
        default=None,
        description="Estimated proficiency level: Learning, Comfortable, or Strong (Issue #131)",
    )
    proficiency_score: float | None = Field(
        default=None,
        description="Calculated proficiency score from 0.0 to 10.0 (Issue #131)",
    )
    proficiency_reason: str | None = Field(
        default=None,
        description="Explanation of how the proficiency estimate was computed (Issue #131)",
    )


class UserSkillsSerializer(BaseModel):
    """Skill analysis output serializer."""

    username: str = Field(..., description="GitHub username analyzed")
    skills: list[SkillItemSerializer] = Field(
        default_factory=list, description="Extracted skills"
    )
    total_repositories_analyzed: int = Field(
        ..., description="Total count of analyzed repositories"
    )


# ---------------------------------------------------------
# Issues & Matching Serializers
# ---------------------------------------------------------
class IssueLabelSerializer(BaseModel):
    """Issue label serializer."""

    name: str = Field(..., description="Label name")
    color: str | None = Field(default=None, description="Hex color")


class IssueItemSerializer(BaseModel):
    """Normalized GitHub issue item serializer."""

    id: int = Field(..., description="GitHub Issue ID")
    title: str = Field(..., description="Issue title")
    url: str = Field(..., description="Web link to issue")
    repository: str = Field(..., description="Full repository name (owner/repo)")
    labels: list[str | dict[str, Any]] = Field(
        default_factory=list, description="Attached labels"
    )
    comments: int = Field(default=0, description="Comment count")
    created_at: str = Field(..., description="Created ISO timestamp")
    updated_at: str = Field(..., description="Updated ISO timestamp")
    state: str = Field(default="open", description="Issue state")


class IssueSearchResponseSerializer(BaseModel):
    """Search results envelope for GitHub issues."""

    total_count: int = Field(..., description="Total count of matching issues")
    issues: list[dict[str, Any]] = Field(
        default_factory=list, description="List of matched issue objects"
    )


class MatchedIssueRecommendationSerializer(BaseModel):
    """Personalized issue recommendation serializer."""

    id: int = Field(..., description="Issue ID")
    title: str = Field(..., description="Issue title")
    url: str = Field(..., description="Issue HTML URL")
    repository: str = Field(..., description="Repository identifier")
    labels: list[str] = Field(default_factory=list, description="Issue labels")
    comments: int = Field(default=0, description="Comment count")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    matched_skills: list[str] = Field(
        default_factory=list, description="Skills that matched this issue"
    )
    score: float = Field(..., description="Matching relevance score")
    score_method: str = Field(
        default="keyword-tfidf", description="Scoring methodology"
    )
    ai_explanation: str | None = Field(
        default=None, description="Optional AI explanation"
    )


class MatchedIssuesResponseSerializer(BaseModel):
    """Personalized issue recommendations response."""

    username: str = Field(..., description="Analyzed username")
    skills: list[str] = Field(
        default_factory=list, description="Matched skills used for queries"
    )
    recommendations: list[MatchedIssueRecommendationSerializer] = Field(
        default_factory=list, description="Ranked list of recommended issues"
    )


# ---------------------------------------------------------
# AI Analysis Serializers
# ---------------------------------------------------------
class IssueAnalysisRequestSerializer(BaseModel):
    """Request payload for AI issue deep-dive analysis."""

    issue: dict[str, Any] = Field(
        ..., description="Raw or parsed GitHub issue dictionary"
    )
    user_skills: list[str] = Field(
        default_factory=list, description="List of user skills"
    )


class IssueAnalysisResponseSerializer(BaseModel):
    """AI analysis result serializer."""

    fit_score: int | float | None = Field(
        default=None, description="Estimated developer fit score"
    )
    complexity: str | None = Field(
        default=None, description="Difficulty assessment"
    )
    summary: str | None = Field(default=None, description="Summary of the issue")
    prerequisites: list[str] = Field(
        default_factory=list, description="Required technical prerequisites"
    )
    key_files: list[str] = Field(
        default_factory=list, description="Suggested files to inspect"
    )
    suggested_steps: list[str] = Field(
        default_factory=list, description="Step-by-step implementation guide"
    )
    explanation: str | None = Field(
        default=None, description="Comprehensive AI explanation"
    )
