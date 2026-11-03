# Linting, Formatting, and Pre-Commit Hooks Guide

This document outlines the code quality, linting, formatting, and pre-commit tooling implemented across **OpenSourceMate** for Issue [#113](https://github.com/Muskankr/OpenSourceMate/issues/113).

---

## 1. Tooling Overview

OpenSourceMate enforces consistent code quality, idiomatic formatting, and automated validation across both Python (backend) and TypeScript/React (frontend) codebases.

| Tool | Purpose | Target | Configuration Files |
| :--- | :--- | :--- | :--- |
| **Ruff** | Blazing-fast linter & formatter (PEP 8, import sorting, syntax upgrades) | Backend (`backend/`) | `pyproject.toml`, `backend/pyproject.toml` |
| **Prettier** | Opinionated code formatter | Frontend (`frontend/`), Markdown, JSON, YAML | `.prettierrc`, `.prettierignore`, `frontend/.prettierrc` |
| **ESLint** | Static code analysis & React / Next.js best practices | Frontend (`frontend/`) | `frontend/eslint.config.mjs` |
| **TypeScript** | Static type checking (`tsc --noEmit`) | Frontend (`frontend/`) | `frontend/tsconfig.json` |
| **pre-commit** | Git hook framework running checks automatically before commit | Entire repository | `.pre-commit-config.yaml` |

---

## 2. Pre-Commit Hooks Setup

We use the [pre-commit](https://pre-commit.com/) framework to run automated sanity checks and code formatting before any commit is finalized.

### Installation

1. Ensure the development dependencies are installed in your virtual environment:
   ```bash
   cd backend
   pip install -r requirements-dev.txt
   ```

2. Install git pre-commit hooks:
   ```bash
   pre-commit install
   ```

3. Run against all files manually to verify:
   ```bash
   pre-commit run --all-files
   ```

### Configured Hooks (`.pre-commit-config.yaml`)

- `trailing-whitespace`: Trims accidental trailing whitespace across all source files.
- `end-of-file-fixer`: Ensures files end with a standard UNIX newline.
- `check-yaml`: Validates YAML syntax in configuration and CI workflow files.
- `check-added-large-files`: Prevents accidental commits of large binaries (exceeding 1000 KB).
- `ruff`: Lints Python files with auto-fixing enabled (`--fix`).
- `ruff-format`: Formats Python code adhering to standard PEP 8 88-character column line lengths.
- `prettier`: Formats frontend JavaScript, TypeScript, JSX, TSX, CSS, JSON, and Markdown files.

---

## 3. Backend Code Quality Commands

All backend checks can be run directly using Ruff within the backend environment:

```bash
# Navigate to backend
cd backend

# Run linter
ruff check .

# Automatically apply safe lint fixes
ruff check --fix .

# Check formatting compliance (dry run)
ruff format --check .

# Auto-format all Python code
ruff format .

# Run test suite
pytest
```

---

## 4. Frontend Code Quality Commands

All frontend checks are executed using npm scripts defined in `frontend/package.json`:

```bash
# Navigate to frontend
cd frontend

# Check formatting compliance without making changes
npm run format:check

# Format all files in place
npm run format

# Run Next.js ESLint
npm run lint

# Verify TypeScript types
npx tsc --noEmit

# Run unit and integration tests
npm test -- --ci

# Build production bundle
npm run build
```

---

## 5. CI / CD Pipeline Parity

The GitHub Actions workflow (`.github/workflows/ci.yml`) executes the exact same checks to guarantee parity between local developer environments and pull request verification:

### Frontend CI Job
1. `npm ci`
2. `npm run format:check` (Prettier)
3. `npm run lint` (ESLint)
4. `npx tsc --noEmit` (TypeScript)
5. `npm test -- --ci` (Jest)
6. `npm run build` (Next.js production build)

### Backend CI Job
1. `pip install -r requirements-dev.txt`
2. `ruff check .` (Ruff linter)
3. `ruff format --check .` (Ruff formatter)
4. `python -m pytest -q` (Pytest test suite)
