from fastapi import APIRouter, HTTPException, Query

from app.services.github_service import (
    GitHubRateLimitError,
    get_user_repositories,
)
from app.services.skill_service import analyze_skills
from app.services.issue_service import search_github_issues
from app.services.embedding_service import similarities
from app.services.matching_service import build_idf, calculate_issue_score
from app.ai.ai_service import generate_issue_match_explanation
from app.utils.validation import validate_github_username


router = APIRouter(
    prefix="/api/matching",
    tags=["Matching"],
)


@router.get("/users/{username}/issues")
async def get_matched_issues(
    username: str,
    exclude_stale: bool = Query(default=False),
):
    validated_username = validate_github_username(username)
    repositories = await get_user_repositories(validated_username)

    if repositories is None:
        raise HTTPException(
            status_code=404,
            detail="GitHub user not found",
        )

    skill_data = analyze_skills(repositories)

    user_skills = [
        skill["name"]
        for skill in skill_data["skills"]
    ]

    # Relative weight of each skill, so a main language counts for more than a side one.
    max_count = max(
        (skill["repository_count"] for skill in skill_data["skills"]),
        default=1,
    )
    weighted_skills = [
        {
            "name": skill["name"],
            "weight": skill["repository_count"] / max_count,
        }
        for skill in skill_data["skills"]
    ]

    if not user_skills:
        return {
            "username": validated_username,
            "skills": [],
            "recommendations": [],
        }

    found_issues = []

    # Search issues for the user's top skills.
    for skill in user_skills[:5]:
        try:
            result = await search_github_issues(
                language=skill,
                label="good first issue",
                per_page=10,
            )

            found_issues.extend(result["issues"])

        except GitHubRateLimitError:
            # Every remaining search would fail too, so tell the caller.
            raise

        except Exception:
            # One failed language search should not
            # break the entire recommendation request.
            continue

    # IDF is computed over everything fetched, so a skill that every
    # result mentions counts for less than a rare one.
    idf = build_idf(found_issues, weighted_skills)

    # None unless OSM_USE_EMBEDDINGS is on and sentence-transformers is installed.
    semantic = similarities(weighted_skills, found_issues)

    all_issues = []

    for index, issue in enumerate(found_issues):
        match = calculate_issue_score(
            issue,
            weighted_skills,
            idf,
            semantic[index] if semantic is not None else None,
        )

        all_issues.append(
            {
                **issue,
                "match_score": match["score"],
                "match_reasons": match["reasons"],
                "matched_skills": match["matched_skills"],
                "score_method": match["score_method"],
                "freshness": match.get("freshness"),
                "_raw_score": match["raw_score"],
            }
        )

    # Remove duplicate issues, keeping the best score.
    unique_issues = {}

    for issue in all_issues:
        current = unique_issues.get(issue["id"])

        if current is None or issue["_raw_score"] > current["_raw_score"]:
            unique_issues[issue["id"]] = issue

    recommendations = list(unique_issues.values())

    # Optionally exclude stale issues (>60 days inactive)
    if exclude_stale:
        recommendations = [
            iss for iss in recommendations
            if not (iss.get("freshness") and iss["freshness"].get("is_stale"))
        ]

    # Highest compatibility first.
    recommendations.sort(
        key=lambda issue: issue["_raw_score"],
        reverse=True,
    )

    top_recommendations = recommendations[:20]
    for issue in top_recommendations:
        issue.pop("_raw_score", None)
        explanation_data = await generate_issue_match_explanation(issue, user_skills)
        issue["explanation"] = explanation_data["explanation"]
        issue["is_ai_generated"] = explanation_data["is_ai_generated"]
        issue["why_it_matches"] = explanation_data["explanation"]

    return {
        "username": validated_username,
        "skills": user_skills,
        "recommendations": top_recommendations,
    }


@router.post("/explain")
async def explain_recommendation(payload: dict):
    """
    Dedicated endpoint to generate or re-generate an explanation for an issue
    and developer skill combination.
    """
    issue = payload.get("issue", {})
    user_skills = payload.get("user_skills", [])
    if not issue:
        raise HTTPException(status_code=400, detail="Missing issue data")
    return await generate_issue_match_explanation(issue, user_skills)