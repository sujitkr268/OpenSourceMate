from collections import Counter
from datetime import datetime, timezone

# Topic -> skill name. Topics come back with the repo list, so they cost no extra request.
TOPIC_SKILLS = {
    "react": "React",
    "reactjs": "React",
    "nextjs": "Next.js",
    "next-js": "Next.js",
    "vue": "Vue",
    "vuejs": "Vue",
    "angular": "Angular",
    "svelte": "Svelte",
    "django": "Django",
    "flask": "Flask",
    "fastapi": "FastAPI",
    "express": "Express",
    "nodejs": "Node.js",
    "pytorch": "PyTorch",
    "tensorflow": "TensorFlow",
    "machine-learning": "Machine Learning",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "flutter": "Flutter",
    "react-native": "React Native",
    "tailwindcss": "Tailwind CSS",
    "graphql": "GraphQL",
}

# Dependency (lower case package name) -> skill name, for package.json and Python manifests.
DEPENDENCY_SKILLS = {
    "react": "React",
    "next": "Next.js",
    "vue": "Vue",
    "@angular/core": "Angular",
    "svelte": "Svelte",
    "express": "Express",
    "tailwindcss": "Tailwind CSS",
    "react-native": "React Native",
    "graphql": "GraphQL",
    "django": "Django",
    "flask": "Flask",
    "fastapi": "FastAPI",
    "torch": "PyTorch",
    "pytorch": "PyTorch",
    "tensorflow": "TensorFlow",
    "scikit-learn": "scikit-learn",
    "pandas": "pandas",
    "numpy": "NumPy",
}


def _is_fork(repository: dict) -> bool:
    return bool(repository.get("fork"))


def calculate_proficiency(
    repository_count: int,
    percentage: float,
    latest_updated_at: str | datetime | None = None,
    now: datetime | None = None,
    skill_name: str | None = None,
) -> tuple[str, float, str]:
    """Compute estimated proficiency level (Learning, Comfortable, Strong), numerical score,
    and explanation rationale from repository count, share of code, and recent activity (Issue #131).

    Parameters:
    - repository_count: Number of repositories featuring the skill (breadth).
    - percentage: Percentage share of analyzed repositories or code (depth).
    - latest_updated_at: ISO timestamp or datetime of most recent activity featuring this skill.
    - now: Optional reference datetime for deterministic testing.
    - skill_name: Optional skill name for personalized explanation phrasing.

    Returns:
        (level, score, reason)
        where level is 'Learning', 'Comfortable', or 'Strong'.
    """
    if repository_count <= 0 or percentage <= 0:
        prefix = f" in {skill_name}" if skill_name else ""
        return (
            "Learning",
            3.3,
            f"Estimated as Learning{prefix}: early stage exploration with limited repositories.",
        )

    # 1. Breadth Score: Number of repositories (1.0 to 3.0 pts)
    if repository_count >= 5:
        breadth_pts = 3.0
    elif repository_count >= 2:
        breadth_pts = 2.0
    else:
        breadth_pts = 1.0

    # 2. Depth Score: Code share percentage (1.0 to 3.0 pts)
    if percentage >= 40.0:
        depth_pts = 3.0
    elif percentage >= 15.0:
        depth_pts = 2.0
    else:
        depth_pts = 1.0

    # 3. Recency Score: Commit/update recency (1.0 to 3.0 pts)
    current_time = now or datetime.now(timezone.utc)
    recency_pts = 1.5  # Neutral default if no timestamp is provided
    days_ago: int | None = None

    if latest_updated_at:
        try:
            if isinstance(latest_updated_at, datetime):
                dt = latest_updated_at
            else:
                cleaned = str(latest_updated_at).replace("Z", "+00:00")
                dt = datetime.fromisoformat(cleaned)

            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)

            delta = current_time - dt
            days_ago = max(0, delta.days)

            if days_ago <= 90:
                recency_pts = 3.0
            elif days_ago <= 365:
                recency_pts = 2.0
            else:
                recency_pts = 1.0
        except Exception:
            recency_pts = 1.5

    total_points = breadth_pts + depth_pts + recency_pts
    score = round((total_points / 9.0) * 10.0, 1)

    if total_points >= 7.0:
        level = "Strong"
    elif total_points >= 5.0:
        level = "Comfortable"
    else:
        level = "Learning"

    repo_word = "repository" if repository_count == 1 else "repositories"
    activity_phrase = ""
    if days_ago is not None:
        if days_ago <= 90:
            activity_phrase = f", active recently ({days_ago} days ago)"
        elif days_ago <= 365:
            activity_phrase = ", active within the past year"
        else:
            months = max(1, days_ago // 30)
            activity_phrase = f", last updated {months} months ago"

    name_phrase = f" in {skill_name}" if skill_name else ""
    reason = (
        f"Estimated as {level}{name_phrase}: used in {repository_count} {repo_word} "
        f"({percentage}% code share){activity_phrase}. "
        "Estimated indicator based on public repository activity."
    )

    return (level, score, reason)


def analyze_skills(
    repositories: list[dict],
    include_forks: bool = False,
    repo_details: dict[str, dict] | None = None,
    compute_proficiency: bool = True,
) -> dict:
    """Build a skill list from a user's repositories, calculating estimated proficiency per skill (Issue #131).

    repo_details maps a repo full_name to optional extra data fetched separately:
    {"languages": {"Python": 1234}, "dependencies": ["react", "next"]}.
    Missing details are fine, the repo then only contributes its main language and topics.
    """
    repo_details = repo_details or {}
    analyzed = [r for r in repositories if include_forks or not _is_fork(r)]

    languages = Counter()
    frameworks = Counter()
    latest_update_by_skill: dict[str, str] = {}

    for repository in analyzed:
        repo_updated_at = repository.get("updated_at")
        details = repo_details.get(repository.get("full_name") or "", {})
        repo_languages = details.get("languages") or {}

        # /languages knows about every language in the repo, not just the main one.
        if repo_languages:
            for language in repo_languages:
                languages[language] += 1
                if repo_updated_at:
                    if (
                        language not in latest_update_by_skill
                        or str(repo_updated_at) > str(latest_update_by_skill[language])
                    ):
                        latest_update_by_skill[language] = str(repo_updated_at)
        elif repository.get("language"):
            lang = repository["language"]
            languages[lang] += 1
            if repo_updated_at:
                if (
                    lang not in latest_update_by_skill
                    or str(repo_updated_at) > str(latest_update_by_skill[lang])
                ):
                    latest_update_by_skill[lang] = str(repo_updated_at)

        repo_skills = set()

        for dependency in details.get("dependencies") or []:
            skill = DEPENDENCY_SKILLS.get(str(dependency).lower())
            if skill:
                repo_skills.add(skill)

        for topic in repository.get("topics") or []:
            skill = TOPIC_SKILLS.get(str(topic).lower())
            if skill:
                repo_skills.add(skill)

        # A repo counts once per skill, even if both a dependency and a topic point at it.
        for skill in repo_skills:
            frameworks[skill] += 1
            if repo_updated_at:
                if (
                    skill not in latest_update_by_skill
                    or str(repo_updated_at) > str(latest_update_by_skill[skill])
                ):
                    latest_update_by_skill[skill] = str(repo_updated_at)

    language_total = sum(languages.values())
    skills = []

    for name, count in languages.most_common():
        pct = round((count / language_total) * 100, 2)
        skill_entry = {
            "name": name,
            "type": "language",
            "repository_count": count,
            "percentage": pct,
        }
        if compute_proficiency:
            level, score, reason = calculate_proficiency(
                count, pct, latest_update_by_skill.get(name), skill_name=name
            )
            skill_entry["proficiency"] = level
            skill_entry["proficiency_score"] = score
            skill_entry["proficiency_reason"] = reason

        skills.append(skill_entry)

    for name, count in frameworks.most_common():
        pct = round((count / len(analyzed)) * 100, 2)
        skill_entry = {
            "name": name,
            "type": "framework",
            "repository_count": count,
            "percentage": pct,
        }
        if compute_proficiency:
            level, score, reason = calculate_proficiency(
                count, pct, latest_update_by_skill.get(name), skill_name=name
            )
            skill_entry["proficiency"] = level
            skill_entry["proficiency_score"] = score
            skill_entry["proficiency_reason"] = reason

        skills.append(skill_entry)

    max_count = max((s["repository_count"] for s in skills), default=0)

    for skill in skills:
        skill["weight"] = round(skill["repository_count"] / max_count, 2)

    return {
        "skills": skills,
        "total_repositories_analyzed": len(analyzed),
    }
