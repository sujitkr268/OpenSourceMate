# Contributing to OpenSourceMate

Thank you for your interest in contributing to **OpenSourceMate**! OpenSourceMate is an open-source platform that analyzes developer profiles to recommend relevant open-source contribution opportunities. We welcome contributions from developers of all skill levels.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Prerequisites](#prerequisites)
- [Project Architecture](#project-architecture)
- [Getting Started & Local Setup](#getting-started--local-setup)
  - [1. Fork and Clone](#1-fork-and-clone)
  - [2. Backend Setup (FastAPI)](#2-backend-setup-fastapi)
  - [3. Frontend Setup (Next.js)](#3-frontend-setup-nextjs)
- [Environment Configuration](#environment-configuration)
- [Running Tests](#running-tests)
- [Development Workflow](#development-workflow)
  - [Claiming an Issue](#claiming-an-issue)
  - [Branch Naming Conventions](#branch-naming-conventions)
  - [Commit Message Guidelines](#commit-message-guidelines)
  - [Submitting a Pull Request](#submitting-a-pull-request)
- [Code Style & Standards](#code-style--standards)
- [Community & Getting Help](#community--getting-help)

---

## Not sure where to start? Read the [Label Guide](docs/LABELS.md).

## Code of Conduct

We are committed to providing a friendly, safe, and welcoming environment for everyone, regardless of experience level, gender, sexual orientation, disability, personal appearance, body size, race, ethnicity, age, religion, or nationality.

- Be respectful and considerate of different viewpoints and experiences.
- Accept constructive criticism gracefully.
- Focus on what is best for the community and project.
- Show empathy toward other contributors.

---

## Prerequisites

Before contributing, ensure you have the following installed on your system:

- **Git** (v2.20+)
- **Python** (v3.10 or higher)
- **Node.js** (v18.0 or higher)
- **npm** (v9.0 or higher) or compatible package manager

---

## Project Architecture

OpenSourceMate is organized as a monorepo with separate frontend and backend directories:

```text
OpenSourceMate/
├── backend/                  # FastAPI REST API
│   ├── app/
│   │   ├── api/routes/       # Route definitions (github, matching, issues, ai)
│   │   ├── services/         # Business logic (matching, skills, github client)
│   │   └── main.py           # Application entry point
│   ├── tests/                # Automated pytest unit test suite
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Backend environment variables template
├── frontend/                 # Next.js 15 (React 19, TypeScript, Tailwind CSS)
│   ├── app/                  # App Router pages and global layouts
│   ├── components/           # Reusable UI components
│   ├── public/               # Static assets
│   ├── package.json          # Node dependencies & scripts
│   └── .env.example          # Frontend environment variables template
├── CONTRIBUTING.md           # Contributor guidelines
└── README.md                 # Project overview and documentation
```

---

## Getting Started & Local Setup

### 1. Fork and Clone

1. Fork the repository on GitHub: [Muskankr/OpenSourceMate](https://github.com/Muskankr/OpenSourceMate)
2. Clone your fork to your local machine:
   ```bash
   git clone https://github.com/<your-username>/OpenSourceMate.git
   cd OpenSourceMate
   ```
3. Add the upstream remote to stay synchronized:
   ```bash
   git remote add upstream https://github.com/Muskankr/OpenSourceMate.git
   git fetch upstream
   ```

### 2. Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   - **macOS / Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
   - **Windows (Command Prompt / PowerShell):**
     ```bash
     python -m venv venv
     .\venv\Scripts\activate
     ```
3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment configuration:
   ```bash
   cp .env.example .env     # On Windows: copy .env.example .env
   ```
5. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The backend API will be available at `http://localhost:8000`. Interactive OpenAPI documentation is accessible at `http://localhost:8000/docs`.

### 3. Frontend Setup (Next.js)

1. In a new terminal window, navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Copy the environment configuration:
   ```bash
   cp .env.example .env.local     # On Windows: copy .env.example .env.local
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## Environment Configuration

### Backend (`backend/.env`)

- `GITHUB_TOKEN`: _(Optional)_ GitHub Personal Access Token (classic or fine-grained with read access to public repos). Highly recommended to avoid GitHub API rate limiting during development.
- `GITHUB_CACHE_TTL`: Cache duration in seconds (default `300`).
- `AI_API_KEY`: _(Optional)_ For AI features.

### Frontend (`frontend/.env.local`)

- `NEXT_PUBLIC_API_URL`: Backend API base URL (defaults to `http://localhost:8000`).

---

## Running Tests

OpenSourceMate includes automated unit tests.

To run the backend tests:

```bash
cd backend
pytest
```

Or using Python's built-in test runner:

```bash
python -m unittest discover -s tests
```

To run Frontend lint and build: \
From the repository root:

```bash
cd frontend
npm install
npm run lint
```

To verify the production build:

```bash
npm run build
```

**Before opening a pull request**

- Run the backend test suite when your changes affect backend behavior.
- Run frontend lint when your changes affect frontend code.
- Run relevant tests for any shared functionality you modify.
- Add regression tests for bug fixes when practical.
- Report any checks you could not run, including the reason, in your pull request description.

Do not claim that a check passed unless you actually ran it successfully.

---

## Development Workflow

### Claiming an Issue

We welcome first-time contributors and experienced developers alike.

1. Browse the repository's open issues and look for tasks that match your interests and experience. Start with issues labeled `good first issue` or help wanted, when available.

2. Read the issue description and existing discussion. Check whether someone is already working on it.

3. Comment on the issue to express your interest. Briefly describe how you plan to approach the task and ask any questions you have.

4. Wait for a maintainer to confirm or acknowledge your assignment before beginning substantial work. This helps prevent duplicated effort; commenting alone does not guarantee assignment.

5. Once confirmed, create a feature branch from the latest main and reference the issue in your pull request.

If you can no longer work on a claimed issue, let the maintainers know so someone else can take it.

---

### Branch Naming Conventions

Always create a new branch from `main` with a descriptive prefix and topic:

- `feat/<short-description>`: New features or enhancements (e.g. `feat/issue-filters`)
- `fix/<short-description>`: Bug fixes (e.g. `fix/rate-limit-handling`)
- `docs/<short-description>`: Documentation changes (e.g. `docs/contributing-guide`)
- `test/<short-description>`: Adding or improving tests (e.g. `test/matching-service`)
- `refactor/<short-description>`: Code refactoring without behavioral changes

```bash
git checkout -b feat/your-feature-name
```

### Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new user-facing feature or enhancement
- `fix:` A bug fix
- `docs:` Documentation updates
- `test:` Adding or updating tests
- `refactor:` Code improvements that do not fix a bug or add a feature
- `style:` Formatting, whitespace, or missing semicolon changes
- `chore:` Tooling, dependency, or configuration updates

Examples:

- `feat(ui): add mobile navigation menu and drawer`
- `fix(backend): handle 403 GitHub API rate limits gracefully`
- `docs: add comprehensive CONTRIBUTING.md guide`

### Submitting a Pull Request

1. Push your branch to your GitHub fork:
   ```bash
   git push origin feat/your-feature-name
   ```
2. Open a Pull Request from your branch to `Muskankr/OpenSourceMate:main`.
3. Provide a clear and detailed PR description:
   - What changes were made and why
   - Related issues (use keywords like `Fixes #123` or `Closes #456`)
   - How the changes were tested locally
   - Screenshots or GIFs for any UI changes
4. Respond to feedback and make any requested revisions.

---

## Code Style, Linting & Pre-Commit Hooks

We enforce automated code formatting and static analysis using pre-commit, Ruff (backend), and Prettier/ESLint (frontend).

### Setting Up Pre-Commit Hooks

1. Install development dependencies and the pre-commit git hook:

   ```bash
   cd backend
   pip install -r requirements-dev.txt
   pre-commit install
   ```

2. Run pre-commit across all files manually:
   ```bash
   pre-commit run --all-files
   ```

Pre-commit runs automatically before each commit, checking for trailing whitespace, newline endings, valid YAML, Ruff linting/formatting, and Prettier formatting.

### Backend (Python / FastAPI)

- **Linter & Formatter**: [Ruff](https://docs.astral.sh/ruff/) configured in `pyproject.toml`.
- Run linter: `ruff check backend` (or `ruff check --fix backend`)
- Run formatter: `ruff format backend` (or `ruff format --check backend`)
- Run tests: `pytest`

### Frontend (Next.js / TypeScript)

- **Formatter**: [Prettier](https://prettier.io/) configured in `.prettierrc`.
  - Format files: `npm run format`
  - Check formatting: `npm run format:check`
- **Linter**: ESLint configured with Next.js rules (`npm run lint`).
- **Type Checking**: TypeScript compiler (`npx tsc --noEmit`).
- **Tests**: Jest test suite (`npm test -- --ci`).

For full details, refer to the [Linting and Formatting Guide](docs/linting-and-formatting.md).

---

## Code Style & Standards

- **Python**: Follow [PEP 8](https://peps.python.org/pep-0008/) style guidelines. Use type hints where appropriate.
- **TypeScript / React**: Use functional components with TypeScript types. Ensure code passes `npm run lint` with zero errors.
- **Tailwind CSS**: Follow mobile-first responsive utilities and adhere to the project's dark theme palette.

---

## Community & Getting Help

If you have questions, run into issues, or want to discuss ideas:

- Open an [Issue](https://github.com/Muskankr/OpenSourceMate/issues) on GitHub.
- Clearly describe your question or suggestion.

Thank you for contributing to OpenSourceMate!
