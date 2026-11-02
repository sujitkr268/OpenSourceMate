from fastapi import APIRouter, HTTPException

from app.config import get_settings
from app.schemas.serializers import (
    ExtendedGitHubUserProfileSerializer,
    GitHubUserProfileSerializer,
    RepositoryListSerializer,
    UserSkillsSerializer,
)
from app.services.github_service import (
    get_github_user,
    get_repository_details,
    get_user_repositories,
)
from app.services.skill_service import analyze_skills
from app.utils.validation import validate_github_username

router = APIRouter(
    prefix="/api/github",
    tags=["GitHub"],
)


@router.get(
    "/users/{username}",
    response_model=ExtendedGitHubUserProfileSerializer,
    summary="Get GitHub user profile",
)
async def get_user(username: str):
    validated_username = validate_github_username(username)
    user = await get_github_user(validated_username)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="GitHub user not found",
        )

    return {
        "username": user["login"],
        "name": user.get("name"),
        "bio": user.get("bio"),
        "avatar_url": user["avatar_url"],
        "public_repositories": user.get("public_repos", 0),
        "followers": user.get("followers", 0),
        "following": user.get("following", 0),
        "profile_url": user["html_url"],
        "location": user.get("location"),
        "company": user.get("company"),
        "blog": user.get("blog"),
        "twitter_username": user.get("twitter_username"),
        "created_at": user.get("created_at"),
        "public_gists": user.get("public_gists", 0),
    }


@router.get(
    "/users/{username}/repositories",
    response_model=RepositoryListSerializer,
    summary="Get GitHub user repositories",
)
async def get_repositories(username: str):
    validated_username = validate_github_username(username)
    repositories = await get_user_repositories(validated_username)

    if repositories is None:
        raise HTTPException(
            status_code=404,
            detail="GitHub user not found",
        )

    settings = get_settings()
    per_page = getattr(settings, "github_repos_per_page", 100)
    cap = getattr(settings, "github_max_repos_cap", 300)
    pages = (len(repositories) + per_page - 1) // per_page if repositories else 0
    has_more = len(repositories) >= cap

    return {
        "username": validated_username,
        "repository_count": len(repositories),
        "total_pages_fetched": max(1, pages) if repositories else 0,
        "has_more": has_more,
        "repositories": [
            {
                "name": repo["name"],
                "description": repo.get("description"),
                "language": repo.get("language"),
                "stars": repo.get("stargazers_count", 0),
                "forks": repo.get("forks_count", 0),
                "is_fork": repo.get("fork", False),
                "url": repo.get("html_url"),
                "updated_at": repo.get("updated_at"),
            }
            for repo in repositories
        ],
    }


@router.get(
    "/users/{username}/skills",
    response_model=UserSkillsSerializer,
    response_model_exclude_none=True,
    summary="Analyze GitHub user technical skills",
)
async def get_user_skills(
    username: str,
    include_forks: bool = False,
    ignore_noise: bool = True,
    group_related: bool = False,
    include_proficiency: bool = True,
):
    validated_username = validate_github_username(username)
    repositories = await get_user_repositories(validated_username)

    if repositories is None:
        raise HTTPException(
            status_code=404,
            detail="GitHub user not found",
        )

    details = await get_repository_details(repositories)
    result = analyze_skills(
        repositories,
        include_forks=include_forks,
        repo_details=details,
        ignore_noise=ignore_noise,
        group_related=group_related,
        compute_proficiency=include_proficiency,
    )

    return {
        "username": validated_username,
        **result,
    }
