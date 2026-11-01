"""Response and request serializers for OpenSourceMate API.

Provides DRF-style serializers implemented with Pydantic for request validation,
response serialization, OpenAPI schema documentation, and consistent error handling.
"""

from app.schemas.serializers import (
    ErrorDetailSerializer,
    ErrorResponseSerializer,
    HealthDiagnosticsSerializer,
    HealthResponseSerializer,
    GitHubUserProfileSerializer,
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

__all__ = [
    "ErrorDetailSerializer",
    "ErrorResponseSerializer",
    "HealthDiagnosticsSerializer",
    "HealthResponseSerializer",
    "GitHubUserProfileSerializer",
    "IssueAnalysisRequestSerializer",
    "IssueAnalysisResponseSerializer",
    "IssueItemSerializer",
    "IssueLabelSerializer",
    "IssueSearchResponseSerializer",
    "MatchedIssueRecommendationSerializer",
    "MatchedIssuesResponseSerializer",
    "RepositoryItemSerializer",
    "RepositoryListSerializer",
    "SkillItemSerializer",
    "UserSkillsSerializer",
]
