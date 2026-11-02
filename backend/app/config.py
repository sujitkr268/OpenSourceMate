from functools import lru_cache
import json
from typing import Any, Literal
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables with dev/prod separation."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # -------------------------------------------------------------------------
    # Core Environment & Security
    # -------------------------------------------------------------------------
    environment: str = "development"
    debug: bool | None = None
    secret_key: str = "dev-insecure-secret-key-change-in-production"

    # -------------------------------------------------------------------------
    # Network, Hosts & CORS
    # -------------------------------------------------------------------------
    allowed_hosts: list[str] = ["*"]
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://open-source-mate-tawny.vercel.app",
    ]
    cors_allow_credentials: bool = False
    cors_allow_methods: list[str] = ["*"]
    cors_allow_headers: list[str] = ["*"]

    # -------------------------------------------------------------------------
    # GitHub Integration
    # -------------------------------------------------------------------------
    # Optional. Raises GitHub rate limit from 60 to 5,000 requests/hour.
    github_token: str | None = None

    # How long (in seconds) GitHub responses are cached in memory. 0 to disable.
    github_cache_ttl: int = 300

    # GitHub repository pagination configuration (Issue #129)
    # Maximum number of repository pages to fetch per user analysis.
    github_max_repo_pages: int = 3

    # Items per page requested from GitHub API (maximum allowed by GitHub is 100).
    github_repos_per_page: int = 100

    # Sensible upper bound on the total number of repositories analyzed per profile.
    github_max_repos_cap: int = 300

    # -------------------------------------------------------------------------
    # AI Analysis Configuration
    # -------------------------------------------------------------------------
    ai_api_key: str | None = None
    ai_model: str = "gpt-4o-mini"

    # -------------------------------------------------------------------------
    # Validators
    # -------------------------------------------------------------------------
    @field_validator(
        "allowed_hosts",
        "cors_origins",
        "cors_allow_methods",
        "cors_allow_headers",
        mode="before",
    )
    @classmethod
    def parse_list_or_csv(cls, value: Any) -> list[str]:
        """Support comma-separated strings, JSON arrays, and native lists."""
        if isinstance(value, str):
            clean = value.strip()
            if not clean:
                return []
            if clean.startswith("[") and clean.endswith("]"):
                try:
                    parsed = json.loads(clean)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except json.JSONDecodeError:
                    pass
            return [item.strip() for item in clean.split(",") if item.strip()]
        if isinstance(value, (list, tuple, set)):
            return [str(item).strip() for item in value if str(item).strip()]
        return value

    @model_validator(mode="after")
    def validate_dev_prod_rules(self) -> "Settings":
        """Enforce strict production invariants and sane development defaults."""
        env_norm = (self.environment or "development").strip().lower()
        is_prod = env_norm in ("production", "prod")

        # 1. Resolve debug default based on environment if not explicitly set
        if self.debug is None:
            self.debug = False if is_prod else True

        # 2. Strict production enforcement
        if is_prod:
            # Debug must not be True in production
            if self.debug is True:
                raise ValueError("DEBUG must be set to False in production mode.")

            # SECRET_KEY must be provided, non-default, and sufficiently long
            insecure_defaults = {
                "",
                "dev-insecure-secret-key-change-in-production",
                "changeme",
                "secret",
                "secret_key",
                "insecure",
            }
            raw_key = (self.secret_key or "").strip()
            if not raw_key or raw_key.lower() in insecure_defaults or len(raw_key) < 16:
                raise ValueError(
                    "SECRET_KEY must be set to a secure, unique string (minimum 16 characters) in production mode."
                )

        return self

    # -------------------------------------------------------------------------
    # Helper Properties
    # -------------------------------------------------------------------------
    @property
    def is_production(self) -> bool:
        return (self.environment or "").strip().lower() in ("production", "prod")

    @property
    def is_development(self) -> bool:
        return (self.environment or "").strip().lower() in ("development", "dev")

    @property
    def is_testing(self) -> bool:
        return (self.environment or "").strip().lower() in ("testing", "test")


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()
