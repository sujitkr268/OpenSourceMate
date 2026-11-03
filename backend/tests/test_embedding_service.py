import unittest
from datetime import UTC, datetime

from app.services import embedding_service
from app.services.matching_service import calculate_issue_score
from evaluation import evaluate


class FakeModel:
    """Maps texts to 2-d vectors: 'python' texts point one way, 'rust' texts the other."""

    def encode(self, texts):
        vectors = []
        for text in texts:
            lowered = text.lower()
            vectors.append(
                [1.0 if "python" in lowered else 0.0, 1.0 if "rust" in lowered else 0.0]
            )
        return vectors


def _issue(title):
    return {
        "title": title,
        "body": "",
        "labels": [],
        "language": None,
        "comments": 1,
        "updated_at": datetime.now(UTC).isoformat(),
    }


class TestEmbeddingService(unittest.TestCase):
    def test_returns_none_when_flag_is_off(self):
        self.assertIsNone(embedding_service.similarities(["Python"], [_issue("x")]))

    def test_falls_back_to_none_when_package_is_missing(self):
        import os

        os.environ["OSM_USE_EMBEDDINGS"] = "true"
        embedding_service._model = None
        embedding_service._model_failed = True  # as if the import failed
        try:
            self.assertIsNone(embedding_service.similarities(["Python"], [_issue("x")]))
        finally:
            os.environ.pop("OSM_USE_EMBEDDINGS", None)
            embedding_service._model_failed = False

    def test_similarity_follows_the_model(self):
        issues = [_issue("Python bug"), _issue("Rust bug"), _issue("")]

        scores = embedding_service.similarities(["Python"], issues, model=FakeModel())

        self.assertEqual(scores, [1.0, 0.0, 0.0])

    def test_no_issues_gives_empty_list(self):
        self.assertEqual(
            embedding_service.similarities(["Python"], [], model=FakeModel()), []
        )

    def test_embedding_similarity_adds_points_and_changes_the_method(self):
        issue = _issue("Unrelated wording")

        plain = calculate_issue_score(issue, ["Python"])
        semantic = calculate_issue_score(issue, ["Python"], None, 0.8)

        self.assertEqual(plain["score_method"], "keyword-tfidf")
        self.assertEqual(semantic["score_method"], "keyword-tfidf+embeddings")
        self.assertEqual(semantic["raw_score"] - plain["raw_score"], 20)


class TestEvaluation(unittest.TestCase):
    def test_baseline_beats_the_old_score_on_the_labelled_set(self):
        import json

        profiles = json.loads(evaluate.DATA.read_text(encoding="utf-8"))["profiles"]
        self.assertEqual(sum(len(p["issues"]) for p in profiles), 30)

        old, new = [], []
        for profile in profiles:
            ranked = evaluate.rankings(profile)
            old.append(evaluate.ndcg_at_k(ranked["old"]))
            new.append(evaluate.ndcg_at_k(ranked["baseline"]))

        self.assertGreater(sum(new) / len(new), sum(old) / len(old))

    def test_metrics_on_a_perfect_ranking(self):
        ranked = [{"relevance": 2}] * 5 + [{"relevance": 0}] * 5

        self.assertEqual(evaluate.precision_at_k(ranked), 1.0)
        self.assertAlmostEqual(evaluate.ndcg_at_k(ranked), 1.0)
