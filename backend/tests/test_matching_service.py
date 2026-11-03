import unittest
from datetime import UTC, datetime, timedelta

from app.services.matching_service import (
    calculate_issue_score,
    categorize_issue_freshness,
)


class TestMatchingService(unittest.TestCase):
    def test_skill_match_increases_score(self):
        issue = {
            "language": "Python",
            "labels": [],
            "updated_at": datetime.now(UTC).isoformat(),
            "comments": 2,
        }

        result = calculate_issue_score(issue, ["Python", "TypeScript"])

        self.assertGreaterEqual(result["score"], 40)
        self.assertTrue(any("Python" in reason for reason in result["reasons"]))

    def test_good_first_issue_and_help_wanted_bonus(self):
        issue = {
            "language": None,
            "labels": ["good first issue", "help wanted"],
            "updated_at": datetime.now(UTC).isoformat(),
            "comments": 1,
        }

        result = calculate_issue_score(issue, ["Python"])

        self.assertGreaterEqual(result["score"], 40)
        self.assertTrue(
            any("good first issue" in reason for reason in result["reasons"])
        )
        self.assertTrue(
            any(
                "help wanted" in reason.lower() or "looking for contributors" in reason
                for reason in result["reasons"]
            )
        )

    def test_recent_activity_bonus(self):
        issue = {
            "language": None,
            "labels": [],
            "updated_at": (datetime.now(UTC) - timedelta(days=5))
            .isoformat()
            .replace("+00:00", "Z"),
            "comments": 20,
        }

        result = calculate_issue_score(issue, ["Python"])

        self.assertGreaterEqual(result["score"], 10)
        self.assertTrue(
            any("active recently" in reason for reason in result["reasons"])
        )

    def test_score_never_exceeds_100(self):
        issue = {
            "language": "Python",
            "labels": ["good first issue", "help wanted"],
            "updated_at": datetime.now(UTC).isoformat(),
            "comments": 0,
        }

        result = calculate_issue_score(issue, ["Python"])

        self.assertLessEqual(result["score"], 100)

    def test_manageable_comment_count_bonus(self):
        issue = {
            "language": None,
            "labels": [],
            "updated_at": (datetime.now(UTC) - timedelta(days=200))
            .isoformat()
            .replace("+00:00", "Z"),
            "comments": 3,
        }

        result = calculate_issue_score(issue, ["Go"])

        self.assertEqual(result["score"], 10)
        self.assertTrue(
            any("manageable discussion" in reason for reason in result["reasons"])
        )

    def test_freshness_active_within_14_days(self):
        now = datetime(2026, 10, 25, 12, 0, 0, tzinfo=UTC)
        recent_date = (now - timedelta(days=3)).isoformat()

        freshness = categorize_issue_freshness(recent_date, now=now)
        self.assertEqual(freshness["status"], "Active")
        self.assertFalse(freshness["is_stale"])
        self.assertEqual(freshness["days_ago"], 3)
        self.assertEqual(freshness["label"], "Updated 3d ago")

    def test_freshness_recent_between_15_and_60_days(self):
        now = datetime(2026, 10, 25, 12, 0, 0, tzinfo=UTC)
        date_30d = (now - timedelta(days=30)).isoformat()

        freshness = categorize_issue_freshness(date_30d, now=now)
        self.assertEqual(freshness["status"], "Recent")
        self.assertFalse(freshness["is_stale"])
        self.assertEqual(freshness["days_ago"], 30)

    def test_freshness_stale_over_60_days(self):
        now = datetime(2026, 10, 25, 12, 0, 0, tzinfo=UTC)
        date_100d = (now - timedelta(days=100)).isoformat()

        freshness = categorize_issue_freshness(date_100d, now=now)
        self.assertEqual(freshness["status"], "Stale")
        self.assertTrue(freshness["is_stale"])
        self.assertEqual(freshness["days_ago"], 100)

    def test_freshness_unknown_on_none_or_invalid(self):
        freshness_none = categorize_issue_freshness(None)
        self.assertEqual(freshness_none["status"], "Unknown")
        self.assertFalse(freshness_none["is_stale"])

        freshness_invalid = categorize_issue_freshness("not-a-date")
        self.assertEqual(freshness_invalid["status"], "Unknown")
        self.assertFalse(freshness_invalid["is_stale"])

    def test_calculate_score_includes_freshness(self):
        issue = {
            "language": "Python",
            "labels": ["good first issue"],
            "updated_at": datetime.now(UTC).isoformat(),
            "comments": 2,
        }

        result = calculate_issue_score(issue, ["Python"])
        self.assertIn("freshness", result)
        self.assertEqual(result["freshness"]["status"], "Active")


if __name__ == "__main__":
    unittest.main()


from app.services.matching_service import build_idf  # noqa: E402


def _issue(title, body="", language="Python", **extra):
    base = {
        "title": title,
        "body": body,
        "repository": "acme/project",
        "labels": ["good first issue"],
        "language": language,
        "comments": 1,
        "updated_at": datetime.now(UTC).isoformat(),
    }
    base.update(extra)
    return base


class TestTextMatching(unittest.TestCase):
    skills = [
        {"name": "Python", "weight": 1.0},
        {"name": "FastAPI", "weight": 0.5},
    ]

    def test_issue_mentioning_a_skill_ranks_above_an_unrelated_one(self):
        related = _issue(
            "Add FastAPI dependency for auth", "Use Depends in the FastAPI router"
        )
        unrelated = _issue("Fix typo in docs")
        idf = build_idf([related, unrelated], self.skills)

        related_result = calculate_issue_score(related, self.skills, idf)
        unrelated_result = calculate_issue_score(unrelated, self.skills, idf)

        self.assertGreater(related_result["raw_score"], unrelated_result["raw_score"])
        self.assertEqual(related_result["matched_skills"], ["fastapi"])
        self.assertEqual(unrelated_result["matched_skills"], [])

    def test_language_only_counts_when_it_is_in_the_profile(self):
        known = calculate_issue_score(_issue("x", language="Python"), self.skills)
        unknown = calculate_issue_score(_issue("x", language="Haskell"), self.skills)
        missing = calculate_issue_score(_issue("x", language=None), self.skills)

        self.assertGreater(known["score"], unknown["score"])
        self.assertEqual(unknown["score"], missing["score"])

    def test_heavier_skill_is_worth_more(self):
        main = calculate_issue_score(_issue("x", language="Python"), self.skills)
        side = calculate_issue_score(_issue("x", language="FastAPI"), self.skills)

        self.assertGreater(main["score"], side["score"])

    def test_rare_skill_has_higher_idf_than_one_in_every_issue(self):
        issues = [
            _issue("Python tweak"),
            _issue("Python bug"),
            _issue("Python and FastAPI route"),
        ]

        idf = build_idf(issues, self.skills)

        self.assertGreater(idf["fastapi"], idf["python"])

    def test_empty_body_and_missing_fields_do_not_crash(self):
        result = calculate_issue_score({"title": None, "body": None}, self.skills)

        self.assertEqual(result["matched_skills"], [])
        self.assertEqual(result["score_method"], "keyword-tfidf")

    def test_plain_skill_names_still_work(self):
        result = calculate_issue_score(_issue("Python cleanup"), ["Python"])

        self.assertIn("python", result["matched_skills"])

    def test_score_stays_capped_at_100_but_raw_score_keeps_order(self):
        strong = _issue(
            "Python FastAPI Python FastAPI",
            "Python FastAPI " * 20,
            labels=["good first issue", "help wanted"],
        )

        result = calculate_issue_score(strong, self.skills)

        self.assertLessEqual(result["score"], 100)
        self.assertGreaterEqual(result["raw_score"], result["score"])
