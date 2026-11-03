"""Optional embedding similarity for issue matching.

Off by default. It is used only when the OSM_USE_EMBEDDINGS env flag is on AND
the sentence-transformers package is installed (see requirements-optional.txt).
Otherwise callers get None and the keyword/TF-IDF score is used on its own.
"""

import os

MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_METHOD = "keyword-tfidf+embeddings"

_model = None
_model_failed = False


def embeddings_enabled() -> bool:
    return os.getenv("OSM_USE_EMBEDDINGS", "").strip().lower() in {"1", "true", "yes"}


def _load_model():
    global _model, _model_failed

    if _model is not None or _model_failed:
        return _model

    try:
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer(MODEL_NAME)
    except Exception:
        # Package missing or model download failed: fall back to the baseline.
        _model_failed = True

    return _model


def profile_text(user_skills: list) -> str:
    names = [s["name"] if isinstance(s, dict) else str(s) for s in user_skills]
    return "Developer skilled in " + ", ".join(names)


def issue_text(issue: dict) -> str:
    return " ".join(
        part
        for part in (
            issue.get("title"),
            issue.get("body"),
            " ".join(issue.get("labels", [])),
        )
        if part
    )


def similarities(
    user_skills: list, issues: list[dict], model=None
) -> list[float] | None:
    """Cosine similarity (0-1) between the profile and each issue, or None if unavailable.

    `model` can be passed in for tests; it only needs an `encode(list[str])` method.
    """
    if not issues:
        return []

    if model is None:
        if not embeddings_enabled():
            return None
        model = _load_model()
        if model is None:
            return None

    texts = [profile_text(user_skills)] + [issue_text(issue) for issue in issues]
    vectors = model.encode(texts)

    profile = [float(x) for x in vectors[0]]
    profile_norm = sum(x * x for x in profile) ** 0.5

    scores = []

    for vector in vectors[1:]:
        values = [float(x) for x in vector]
        norm = sum(x * x for x in values) ** 0.5

        if not norm or not profile_norm:
            scores.append(0.0)
            continue

        dot = sum(a * b for a, b in zip(profile, values, strict=False))
        scores.append(max(0.0, dot / (profile_norm * norm)))

    return scores
