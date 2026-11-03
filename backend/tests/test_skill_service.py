import unittest

from app.services.skill_service import analyze_skills


class TestSkillService(unittest.TestCase):
    def test_analyze_skills_aggregates_languages(self):
        repositories = [
            {"language": "Python"},
            {"language": "Python"},
            {"language": "TypeScript"},
            {"language": None},
        ]

        result = analyze_skills(repositories)

        self.assertEqual(result["total_repositories_analyzed"], 4)
        self.assertEqual(result["skills"][0]["name"], "Python")
        self.assertEqual(result["skills"][0]["repository_count"], 2)
        self.assertEqual(result["skills"][0]["percentage"], 66.67)
        self.assertEqual(result["skills"][1]["name"], "TypeScript")
        self.assertEqual(result["skills"][1]["repository_count"], 1)

    def test_analyze_skills_with_empty_repositories(self):
        result = analyze_skills([])

        self.assertEqual(result["skills"], [])
        self.assertEqual(result["total_repositories_analyzed"], 0)

    def test_analyze_skills_with_no_languages(self):
        repositories = [
            {"language": None},
            {"language": None},
        ]

        result = analyze_skills(repositories)

        self.assertEqual(result["skills"], [])
        self.assertEqual(result["total_repositories_analyzed"], 2)


if __name__ == "__main__":
    unittest.main()


class TestSkillDetection(unittest.TestCase):
    def test_forks_are_excluded_by_default_and_included_on_request(self):
        repositories = [
            {"full_name": "me/own", "language": "Python"},
            {"full_name": "me/forked", "language": "Go", "fork": True},
        ]

        default = analyze_skills(repositories)
        with_forks = analyze_skills(repositories, include_forks=True)

        self.assertEqual([s["name"] for s in default["skills"]], ["Python"])
        self.assertEqual(default["total_repositories_analyzed"], 1)
        self.assertEqual({s["name"] for s in with_forks["skills"]}, {"Python", "Go"})
        self.assertEqual(with_forks["total_repositories_analyzed"], 2)

    def test_frameworks_come_from_dependencies(self):
        repositories = [
            {"full_name": "me/web", "language": "JavaScript"},
            {"full_name": "me/api", "language": "Python"},
        ]
        details = {
            "me/web": {
                "languages": {"JavaScript": 10},
                "dependencies": ["react", "next"],
            },
            "me/api": {"languages": {"Python": 10}, "dependencies": ["Django"]},
        }

        result = analyze_skills(repositories, repo_details=details)
        names = {s["name"]: s for s in result["skills"]}

        for expected in ("React", "Next.js", "Django"):
            self.assertEqual(names[expected]["type"], "framework")
        self.assertEqual(names["Python"]["type"], "language")

    def test_topics_map_to_skills_without_double_counting(self):
        repositories = [
            {
                "full_name": "me/web",
                "language": "JavaScript",
                "topics": ["reactjs", "react", "unknown"],
            },
        ]

        result = analyze_skills(repositories)
        react = [s for s in result["skills"] if s["name"] == "React"]

        self.assertEqual(len(react), 1)
        self.assertEqual(react[0]["repository_count"], 1)

    def test_languages_endpoint_data_adds_secondary_languages(self):
        repositories = [{"full_name": "me/mixed", "language": "Python"}]
        details = {
            "me/mixed": {"languages": {"Python": 90, "Shell": 10}, "dependencies": []}
        }

        result = analyze_skills(repositories, repo_details=details)

        self.assertEqual({s["name"] for s in result["skills"]}, {"Python", "Shell"})

    def test_weight_is_relative_to_the_strongest_skill(self):
        repositories = [
            {"language": "Python"},
            {"language": "Python"},
            {"language": "Rust"},
        ]

        skills = analyze_skills(repositories)["skills"]

        self.assertEqual(skills[0]["weight"], 1.0)
        self.assertEqual(skills[1]["weight"], 0.5)
