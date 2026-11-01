from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    # Optional. Raises the GitHub rate limit from 60 to 5000 requests/hour.
    github_token: str | None = None

    # How long (in seconds) GitHub profile and repository responses are
    # cached in memory. Set to 0 to turn caching off.
    github_cache_ttl: int = 300

    # GitHub repository pagination configuration (Issue #129)
    # Maximum number of repository pages to fetch per user analysis.
    github_max_repo_pages: int = 3

    # Items per page requested from GitHub API (maximum allowed by GitHub is 100).
    github_repos_per_page: int = 100

    # Sensible upper bound on the total number of repositories analyzed per profile.
    github_max_repos_cap: int = 300


@lru_cache
def get_settings() -> Settings:
    return Settings()
