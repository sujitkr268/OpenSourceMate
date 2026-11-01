from fastapi import APIRouter, HTTPException

from app.ai.ai_service import analyze_issue
from app.schemas.serializers import IssueAnalysisRequestSerializer

router = APIRouter(
    prefix="/api/ai",
    tags=["AI"],
)


@router.post("/analyze-issue", summary="AI-powered issue suitability analysis")
async def analyze_github_issue(
    request: IssueAnalysisRequestSerializer,
):
    try:
        analysis = await analyze_issue(
            issue=request.issue,
            user_skills=request.user_skills,
        )

        return analysis

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {exc}",
        )
