import json
import re
from typing import Any

from openai import AsyncOpenAI
from pydantic_settings import BaseSettings, SettingsConfigDict


class AISettings(BaseSettings):
    ai_api_key: str | None = None
    ai_model: str | None = "gpt-4o-mini"
    gemini_api_key: str | None = None
    osm_max_explanation_words: int = 50

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = AISettings()

# Safe client initialization without logging sensitive credentials
client: AsyncOpenAI | None = None
if settings.ai_api_key:
    # Ensure api_key is non-empty after stripping
    clean_key = settings.ai_api_key.strip()
    if clean_key:
        client = AsyncOpenAI(api_key=clean_key)


def build_template_explanation(issue: dict[str, Any], user_skills: list[str]) -> str:
    """
    Generate a deterministic, grounded explanation for why an issue matches
    a developer's profile using only retrieved metadata. Zero hallucination guarantee.
    """
    repo = issue.get("repository", "this repository")
    lang = issue.get("language")
    labels = [str(lbl).lower() for lbl in issue.get("labels", [])]
    title = issue.get("title", "")
    comments = issue.get("comments", 0)

    # Detect skills that match the issue's language or title
    matched_skills: list[str] = []
    normalized_skills = {s.lower(): s for s in user_skills}

    if lang and lang.lower() in normalized_skills:
        matched_skills.append(normalized_skills[lang.lower()])

    title_words = set(re.findall(r"\b[A-Za-z0-9_+#.-]+\b", title.lower()))
    for s_lower, s_orig in normalized_skills.items():
        if s_lower in title_words and s_orig not in matched_skills:
            matched_skills.append(s_orig)

    is_good_first = any(
        "good first issue" in lbl or "good-first-issue" in lbl for lbl in labels
    )
    is_help_wanted = any("help wanted" in lbl or "help-wanted" in lbl for lbl in labels)
    is_docs = any("doc" in lbl for lbl in labels)

    reasons: list[str] = []

    if matched_skills:
        skills_str = ", ".join(matched_skills[:2])
        reasons.append(f"directly leverages your experience with {skills_str}")
    elif lang:
        reasons.append(f"is written in {lang}")

    if is_good_first:
        reasons.append("is curated as a beginner-friendly 'good first issue'")
    elif is_help_wanted:
        reasons.append("is actively seeking community contributors")
    elif is_docs:
        reasons.append("focuses on documentation improvements")

    if comments == 0:
        reasons.append(
            "has no discussion yet, giving you a fresh opportunity to contribute"
        )
    elif comments < 4:
        reasons.append(
            f"has active discussion ({comments} comments) with room to collaborate"
        )

    if reasons:
        explanation = f"This issue in {repo} " + ", and ".join(reasons) + "."
    else:
        explanation = f"This open issue in {repo} aligns with your open-source exploration profile."

    return explanation


async def generate_issue_match_explanation(
    issue: dict[str, Any],
    user_skills: list[str],
) -> dict[str, Any]:
    """
    Generate a concise, grounded explanation for why an issue matches the user.
    Uses LLM when configured, otherwise falls back to a deterministic grounded template.
    Guarantees no API keys are ever logged or exposed.
    """
    fallback_text = build_template_explanation(issue, user_skills)

    # If no LLM client or model configured, return grounded template safely
    if not client or not settings.ai_model:
        return {
            "explanation": fallback_text,
            "is_ai_generated": False,
            "matched_skills": [
                s
                for s in user_skills
                if (
                    issue.get("language")
                    and s.lower() == issue.get("language", "").lower()
                )
                or s.lower() in issue.get("title", "").lower()
            ],
            "difficulty_level": "beginner"
            if any("good first" in str(lbl).lower() for lbl in issue.get("labels", []))
            else "intermediate",
        }

    # Constrained grounded prompt guarding against hallucination
    grounded_issue_payload = {
        "title": issue.get("title", ""),
        "repository": issue.get("repository", ""),
        "language": issue.get("language", "Unknown"),
        "labels": issue.get("labels", [])[:5],
        "comments": issue.get("comments", 0),
    }

    prompt = f"""You are an open-source contribution mentor.
Write a 1-2 sentence grounded explanation of why this GitHub issue matches the developer.
DO NOT hallucinate libraries, features, or technologies not listed below.
Keep the output under {settings.osm_max_explanation_words} words.

Developer Skills: {json.dumps(user_skills[:6])}
Issue Data: {json.dumps(grounded_issue_payload)}

Return plain text only (no quotes, no markdown headings)."""

    try:
        response = await client.chat.completions.create(
            model=settings.ai_model,
            messages=[
                {
                    "role": "system",
                    "content": "You provide concise, factual matching explanations for developers based strictly on the provided context.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=100,
            temperature=0.2,
        )

        content = response.choices[0].message.content
        if not content or not content.strip():
            return {
                "explanation": fallback_text,
                "is_ai_generated": False,
                "matched_skills": [],
                "difficulty_level": "intermediate",
            }

        cleaned = content.strip().replace("\n", " ")
        # Cap length to prevent unbounded outputs
        words = cleaned.split()
        if len(words) > settings.osm_max_explanation_words:
            cleaned = " ".join(words[: settings.osm_max_explanation_words]) + "..."

        return {
            "explanation": cleaned,
            "is_ai_generated": True,
            "matched_skills": [
                s
                for s in user_skills
                if (
                    issue.get("language")
                    and s.lower() == issue.get("language", "").lower()
                )
                or s.lower() in issue.get("title", "").lower()
            ],
            "difficulty_level": "beginner"
            if any("good first" in str(lbl).lower() for lbl in issue.get("labels", []))
            else "intermediate",
        }

    except Exception:
        # Never log API keys or internal stacktraces that might contain credentials
        # Safely fall back to the grounded template
        return {
            "explanation": fallback_text,
            "is_ai_generated": False,
            "matched_skills": [],
            "difficulty_level": "intermediate",
        }


async def analyze_issue(
    issue: dict,
    user_skills: list[str],
) -> dict:
    """Analyze full issue suitability with detailed steps and difficulty."""
    if not client or not settings.ai_model:
        return {
            "difficulty": (
                "beginner"
                if any(
                    "good first" in str(lbl).lower() for lbl in issue.get("labels", [])
                )
                else "intermediate"
            ),
            "required_skills": [issue.get("language")] if issue.get("language") else [],
            "skill_matches": [
                s
                for s in user_skills
                if issue.get("language")
                and s.lower() == issue.get("language", "").lower()
            ],
            "why_it_matches": build_template_explanation(issue, user_skills),
            "recommended_steps": [
                "Review the GitHub issue description and guidelines",
                "Set up the repository locally according to its README",
                "Work on the fix and submit a draft pull request",
            ],
            "potential_challenges": [
                "Verify repository contribution guidelines before opening a pull request"
            ],
        }

    prompt = f"""
You are an open-source contribution assistant.
Analyze whether the GitHub issue is suitable for the developer.

Developer skills:
{json.dumps(user_skills)}

GitHub issue:
{json.dumps(issue)}

Return ONLY valid JSON with this structure:
{{
    "difficulty": "beginner|intermediate|advanced",
    "required_skills": [],
    "skill_matches": [],
    "why_it_matches": "",
    "recommended_steps": [],
    "potential_challenges": []
}}
Do not invent repository information that is not present in the provided issue data.
"""

    response = await client.chat.completions.create(
        model=settings.ai_model,
        messages=[
            {
                "role": "system",
                "content": "You analyze open-source GitHub issues for developers.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
    )

    content = response.choices[0].message.content
    if not content:
        raise ValueError("AI returned an empty response.")

    return json.loads(content)
