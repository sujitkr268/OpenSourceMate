import math
import re
from collections import Counter
from datetime import UTC, datetime

SCORE_METHOD = "keyword-tfidf"
MAX_TEXT_POINTS = 30
MAX_EMBEDDING_POINTS = 25

_TOKEN = re.compile(r"[a-z0-9][a-z0-9+#.\-]*")


def _tokens(text: str) -> list[str]:
    return [t.strip(".-") for t in _TOKEN.findall((text or "").lower())]


def _skill_entries(user_skills: list) -> dict[str, float]:
    """Accept plain names or {"name", "weight"} dicts; return lower-case name -> weight."""
    entries = {}

    for skill in user_skills:
        if isinstance(skill, dict):
            entries[skill["name"].lower()] = float(skill.get("weight", 1.0))
        else:
            entries[str(skill).lower()] = 1.0

    return entries


def _issue_term_counts(issue: dict, skill_names: set[str]) -> Counter:
    """Weighted mentions of each skill: title counts 3x, labels and repo name 2x, body 1x."""
    fields = (
        (issue.get("title"), 3),
        (" ".join(issue.get("labels", [])), 2),
        (issue.get("repository"), 2),
        (issue.get("body"), 1),
    )
    counts = Counter()

    for text, weight in fields:
        tokens = _tokens(text)
        joined = " " + " ".join(tokens) + " "

        for name in skill_names:
            if " " in name:
                counts[name] += weight * joined.count(f" {name} ")
            else:
                counts[name] += weight * tokens.count(name)

    return counts


def categorize_issue_freshness(
    updated_at_str: str | None,
    now: datetime | None = None,
) -> dict:
    """
    Categorize issue freshness into 'Active', 'Recent', or 'Stale'
    along with days since last update, human-readable label, and is_stale flag.
    """
    if not updated_at_str:
        return {
            "status": "Unknown",
            "days_ago": None,
            "label": "Unknown activity",
            "is_stale": False,
        }

    try:
        updated = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
        current_time = now or datetime.now(UTC)
        days = max(0, (current_time - updated).days)

        if days <= 14:
            status = "Active"
            is_stale = False
        elif days <= 60:
            status = "Recent"
            is_stale = False
        else:
            status = "Stale"
            is_stale = True

        if days == 0:
            label = "Updated today"
        elif days == 1:
            label = "Updated yesterday"
        else:
            label = f"Updated {days}d ago"

        return {
            "status": status,
            "days_ago": days,
            "label": label,
            "is_stale": is_stale,
        }
    except (ValueError, TypeError):
        return {
            "status": "Unknown",
            "days_ago": None,
            "label": "Unknown activity",
            "is_stale": False,
        }


def build_idf(issues: list[dict], user_skills: list) -> dict[str, float]:
    """Inverse document frequency of each skill over the fetched issues.

    A skill that shows up in every issue (the one we searched for) says little
    about which issue fits best, so it gets a lower weight than a rare one.
    """
    names = set(_skill_entries(user_skills))
    document_frequency = Counter()

    for issue in issues:
        for name, count in _issue_term_counts(issue, names).items():
            if count:
                document_frequency[name] += 1

    total = len(issues)

    return {
        name: math.log((total + 1) / (document_frequency[name] + 1)) + 1
        for name in names
    }


def calculate_issue_score(
    issue: dict,
    user_skills: list,
    idf: dict[str, float] | None = None,
    embedding_similarity: float | None = None,
) -> dict:
    """
    Calculate a transparent compatibility score between
    a GitHub issue and a user's skills.
    """

    score = 0
    reasons = []
    skills = _skill_entries(user_skills)

    labels = {label.lower() for label in issue.get("labels", [])}

    # -----------------------------------
    # 1. Skill / language match
    # -----------------------------------

    issue_language = issue.get("language")

    # The language only counts when it is known and in the profile, and
    # a skill the user relies on more is worth more.
    if issue_language and issue_language.lower() in skills:
        score += round(40 * skills[issue_language.lower()])
        reasons.append(f"Your profile includes {issue_language}.")

    # -----------------------------------
    # 1b. Skills mentioned in the title, body, labels or repo name
    # -----------------------------------

    counts = _issue_term_counts(issue, set(skills))
    idf = idf or {}
    matched_skills = []
    text_points = 0.0

    for name, count in counts.items():
        if not count:
            continue

        matched_skills.append(name)
        # Repeated mentions help, with diminishing returns.
        text_points += (
            12 * skills[name] * idf.get(name, 1.0) * (1 + math.log(count)) / 2
        )

    text_points = min(round(text_points), MAX_TEXT_POINTS)

    # Optional semantic score, only present when the embedding model is available.
    if embedding_similarity is not None:
        embedding_points = round(MAX_EMBEDDING_POINTS * embedding_similarity)
        if embedding_points:
            score += embedding_points
            reasons.append("The issue is semantically close to your skills.")

    if text_points:
        score += text_points
        reasons.append("The issue mentions " + ", ".join(sorted(matched_skills)) + ".")

    # -----------------------------------
    # 2. Good first issue
    # -----------------------------------

    if "good first issue" in labels:
        score += 25
        reasons.append("This issue is marked as a good first issue.")

    # -----------------------------------
    # 3. Help wanted
    # -----------------------------------

    if "help wanted" in labels:
        score += 15
        reasons.append("The repository is actively looking for contributors.")

    # -----------------------------------
    # 4. Issue activity
    # -----------------------------------

    updated_at = issue.get("updated_at")

    if updated_at:
        try:
            updated = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))

            days_old = (datetime.now(UTC) - updated).days

            if days_old <= 30:
                score += 10
                reasons.append("This issue has been active recently.")

            elif days_old <= 90:
                score += 5
                reasons.append("This issue has recent activity.")

        except ValueError:
            pass

    # -----------------------------------
    # 5. Comment count
    # -----------------------------------

    comments = issue.get("comments", 0)

    if comments <= 10:
        score += 10
        reasons.append("The issue has a manageable discussion size.")

    # Keep the uncapped value so results that both reach 100 can still be ordered.
    raw_score = score

    # Never exceed 100
    score = min(score, 100)

    freshness = categorize_issue_freshness(updated_at)

    return {
        "score": score,
        "freshness": freshness,
        "raw_score": raw_score,
        "matched_skills": sorted(matched_skills),
        "score_method": (
            "keyword-tfidf+embeddings"
            if embedding_similarity is not None
            else SCORE_METHOD
        ),
        "reasons": reasons,
    }
