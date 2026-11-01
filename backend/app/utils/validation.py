import re
from app.exceptions import InvalidUsernameError

GITHUB_USERNAME_REGEX = re.compile(
    r"^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$"
)


def is_valid_github_username(username: str | None) -> bool:
    """Check if a username satisfies GitHub username conventions.

    GitHub username requirements:
    - 1 to 39 characters long.
    - May contain alphanumeric characters or single hyphens.
    - Cannot begin or end with a hyphen.
    - Cannot contain consecutive hyphens.
    """
    if not username:
        return False
    clean = username.strip()
    return bool(GITHUB_USERNAME_REGEX.fullmatch(clean))


def validate_github_username(username: str | None) -> str:
    """Validate and return normalized GitHub username, raising InvalidUsernameError if invalid."""
    if not username or not is_valid_github_username(username):
        raise InvalidUsernameError(username=username or "")
    return username.strip()
