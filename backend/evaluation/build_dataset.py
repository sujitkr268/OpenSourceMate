"""Regenerates labelled_issues.json. The labels below are written by hand.

relevance: 2 = fits the profile, 1 = generic or mildly relevant, 0 = unrelated.
The issues are examples written for this evaluation, not scraped from GitHub.
"""

import json
from pathlib import Path


def issue(issue_id, title, body, language, relevance, repo):
    return {
        "id": issue_id,
        "title": title,
        "body": body,
        "language": language,
        "labels": ["good first issue"],
        "comments": 1,
        "repository": repo,
        "updated_at": "2026-10-20T00:00:00Z",
        "relevance": relevance,
    }


PROFILES = [
    {
        "name": "python-fastapi",
        "skills": [
            {"name": "Python", "weight": 1.0},
            {"name": "FastAPI", "weight": 0.6},
            {"name": "Docker", "weight": 0.3},
        ],
        "issues": [
            issue(
                101,
                "Add pagination to the /items endpoint",
                "The FastAPI router returns every row. Add limit and offset query params with Pydantic validation.",
                "Python",
                2,
                "acme/fastapi-shop",
            ),
            issue(
                102,
                "Dockerfile builds as root",
                "Use a non-root user in the Dockerfile for the Python API image.",
                "Python",
                2,
                "acme/api-service",
            ),
            issue(
                103,
                "Typo in README install section",
                "The pip command has a typo.",
                "Python",
                1,
                "acme/api-service",
            ),
            issue(
                104,
                "Add dark mode toggle",
                "Add a theme switch to the React settings page.",
                "Python",
                0,
                "acme/web-dashboard",
            ),
            issue(
                105,
                "Write unit tests for the auth dependency",
                "Cover the FastAPI Depends function that validates JWT tokens with pytest.",
                "Python",
                2,
                "acme/fastapi-shop",
            ),
            issue(
                106,
                "Update CI to Node 20",
                "The GitHub Action still uses Node 16 for the frontend build.",
                "Python",
                0,
                "acme/web-dashboard",
            ),
            issue(
                107,
                "Handle empty request body in parser",
                "The Python parser raises KeyError when the body is empty.",
                "Python",
                2,
                "acme/parser",
            ),
            issue(
                108,
                "Translate docs to Spanish",
                "Help translate the user guide.",
                "Python",
                0,
                "acme/docs",
            ),
            issue(
                109,
                "Rename a variable for clarity",
                "Rename tmp to result in utils.py.",
                "Python",
                1,
                "acme/utils",
            ),
            issue(
                110,
                "Add a Rust benchmark for the tokenizer",
                "Write criterion benchmarks for the tokenizer crate.",
                "Python",
                0,
                "acme/tokenizer",
            ),
        ],
    },
    {
        "name": "react-typescript",
        "skills": [
            {"name": "TypeScript", "weight": 1.0},
            {"name": "React", "weight": 0.9},
            {"name": "Tailwind CSS", "weight": 0.4},
        ],
        "issues": [
            issue(
                201,
                "Button loses focus ring in the React navbar",
                "The Tailwind focus classes are overridden. Restore the focus-visible ring on the nav buttons.",
                "TypeScript",
                2,
                "acme/web-ui",
            ),
            issue(
                202,
                "Type the useFetch hook",
                "The React hook returns any. Add generics in TypeScript.",
                "TypeScript",
                2,
                "acme/web-ui",
            ),
            issue(
                203,
                "Fix flaky Django migration test",
                "The migration test depends on ordering.",
                "TypeScript",
                0,
                "acme/backend",
            ),
            issue(
                204,
                "Add loading skeleton to the dashboard",
                "Show a skeleton while the React Query data loads.",
                "TypeScript",
                2,
                "acme/dashboard",
            ),
            issue(
                205,
                "Typo in CONTRIBUTING",
                "Fix spelling in the contributing guide.",
                "TypeScript",
                1,
                "acme/dashboard",
            ),
            issue(
                206,
                "Add Kubernetes manifests",
                "Provide helm charts for the deployment.",
                "TypeScript",
                0,
                "acme/infra",
            ),
            issue(
                207,
                "Migrate class components to hooks",
                "Convert the remaining React class components to function components with TypeScript props.",
                "TypeScript",
                2,
                "acme/legacy-ui",
            ),
            issue(
                208,
                "Improve README badges",
                "Add build status badges.",
                "TypeScript",
                1,
                "acme/web-ui",
            ),
            issue(
                209,
                "Add a Go linter config",
                "Add golangci-lint to the CI.",
                "TypeScript",
                0,
                "acme/tools",
            ),
            issue(
                210,
                "Make the Tailwind config share colors",
                "Move repeated hex colors into the Tailwind theme.",
                "TypeScript",
                2,
                "acme/web-ui",
            ),
        ],
    },
    {
        "name": "data-ml",
        "skills": [
            {"name": "Python", "weight": 1.0},
            {"name": "PyTorch", "weight": 0.7},
            {"name": "pandas", "weight": 0.5},
        ],
        "issues": [
            issue(
                301,
                "Add a learning-rate scheduler option",
                "Expose a cosine schedule in the PyTorch training loop config.",
                "Python",
                2,
                "acme/trainer",
            ),
            issue(
                302,
                "pandas read_csv warns about mixed types",
                "Set dtype explicitly when the pandas loader reads the dataset.",
                "Python",
                2,
                "acme/data-tools",
            ),
            issue(
                303,
                "Typo in docstring",
                "Fix a typo in utils.",
                "Python",
                1,
                "acme/data-tools",
            ),
            issue(
                304,
                "Add React chart component",
                "Build a bar chart in the web UI.",
                "Python",
                0,
                "acme/web",
            ),
            issue(
                305,
                "Seed all random generators",
                "Seed numpy and PyTorch so experiments are reproducible.",
                "Python",
                2,
                "acme/trainer",
            ),
            issue(
                306,
                "Update the Docker base image",
                "Bump the base image tag.",
                "Python",
                1,
                "acme/trainer",
            ),
            issue(
                307,
                "Add Swift package support",
                "Add Package.swift for iOS users.",
                "Python",
                0,
                "acme/sdk",
            ),
            issue(
                308,
                "Handle NaN rows in the preprocessing step",
                "pandas drops rows silently. Log and count the dropped NaN rows.",
                "Python",
                2,
                "acme/data-tools",
            ),
            issue(
                309,
                "Rename config keys",
                "Make config keys consistent.",
                "Python",
                1,
                "acme/trainer",
            ),
            issue(
                310,
                "Add Java sample",
                "Add a Java client example.",
                "Python",
                0,
                "acme/sdk",
            ),
        ],
    },
]

if __name__ == "__main__":
    target = Path(__file__).with_name("labelled_issues.json")
    note = (
        "Hand-labelled examples written for this evaluation (not scraped from GitHub). "
        "relevance: 2 = fits the profile, 1 = generic or mildly relevant, 0 = unrelated."
    )
    target.write_text(
        json.dumps({"note": note, "profiles": PROFILES}, indent=1), encoding="utf-8"
    )
