from fastapi import APIRouter, HTTPException, Query

from app.schemas.serializers import IssueSearchResponseSerializer
from app.services.github_service import GitHubRateLimitError
from app.services.issue_service import search_github_issues

router = APIRouter(
    prefix="/api/issues",
    tags=["Issues"],
)


@router.get(
    "/search",
    response_model=IssueSearchResponseSerializer,
    summary="Search good first issues on GitHub",
)
async def search_issues(
    language: str | None = Query(default=None),
    label: str | None = Query(default=None),
    keyword: str | None = Query(default=None),
    per_page: int = Query(default=20, ge=1, le=100),
):
    try:
        data = await search_github_issues(
            language=language,
            label=label,
            keyword=keyword,
            per_page=per_page,
        )

        return {
            "total_count": data["total_count"],
            "issues": data["issues"],
        }

    except GitHubRateLimitError:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search GitHub issues: {exc}",
        )
