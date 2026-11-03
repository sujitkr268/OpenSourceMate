from app.services.github_service import GITHUB_API_URL, github_get

MAX_BODY_LENGTH = 1000


async def search_github_issues(
    language: str | None = None,
    label: str | None = None,
    keyword: str | None = None,
    per_page: int = 20,
):
    query_parts = [
        "is:issue",
        "is:open",
    ]

    if language:
        query_parts.append(f"language:{language}")

    if label:
        query_parts.append(f'label:"{label}"')

    if keyword:
        query_parts.append(keyword)

    query = " ".join(query_parts)

    url = f"{GITHUB_API_URL}/search/issues"

    params = {
        "q": query,
        "per_page": min(per_page, 100),
    }

    response = await github_get(url, params=params)

    response.raise_for_status()

    data = response.json()

    issues = []

    for issue in data["items"]:
        issues.append(
            {
                "id": issue["id"],
                "title": issue["title"],
                "repository": issue["repository_url"].split("/repos/")[-1],
                "url": issue["html_url"],
                "state": issue["state"],
                "labels": [label["name"] for label in issue["labels"]],
                "comments": issue["comments"],
                "created_at": issue["created_at"],
                "updated_at": issue["updated_at"],
                "user": issue["user"]["login"],
                "body": (issue.get("body") or "")[:MAX_BODY_LENGTH],
                "language": language,
            }
        )

    return {
        "total_count": data["total_count"],
        "issues": issues,
    }
