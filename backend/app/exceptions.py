from typing import Any


class APIException(Exception):
    """Base exception for application-specific API errors."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Any = None,
    ) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details
        super().__init__(message)


class InvalidUsernameError(APIException):
    """Raised when a GitHub username fails validation rules."""

    def __init__(self, username: str) -> None:
        super().__init__(
            status_code=400,
            code="INVALID_USERNAME",
            message=(
                f"Invalid GitHub username '{username}'. GitHub usernames must be 1-39 characters, "
                "contain only alphanumeric characters or single hyphens, and cannot start or end with a hyphen."
            ),
            details={"username": username},
        )


class NotFoundError(APIException):
    """Raised when a requested resource is not found."""

    def __init__(self, message: str = "Resource not found", details: Any = None) -> None:
        super().__init__(
            status_code=404,
            code="NOT_FOUND",
            message=message,
            details=details,
        )


class RateLimitExceededError(APIException):
    """Raised when GitHub or internal rate limits are exceeded."""

    def __init__(
        self,
        message: str = "GitHub rate limit reached. Please try again later.",
        reset_at: str | None = None,
    ) -> None:
        super().__init__(
            status_code=429,
            code="RATE_LIMIT_EXCEEDED",
            message=message,
            details={"reset_at": reset_at} if reset_at else None,
        )
