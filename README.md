# OpenSourceMate

[![CI](https://github.com/Muskankr/OpenSourceMate/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Muskankr/OpenSourceMate/actions/workflows/ci.yml)


> **Find open-source opportunities that match your skills.**

OpenSourceMate is an AI-powered open-source contribution discovery platform that analyzes a developer's public GitHub profile and technical experience to help identify meaningful contribution opportunities.

The project is being developed with a focus on making open-source contribution discovery easier for developers and newcomers.

---

## ✨ Current Features

### 🔎 GitHub Profile Analysis

Enter a public GitHub username and OpenSourceMate retrieves useful profile information such as:

* GitHub username
* Name and bio
* Public repository count
* Followers and following
* Link to the GitHub profile

### 🧠 Technical Skill Analysis

OpenSourceMate analyzes the user's public GitHub repositories to identify technical skills and shows:

* Detected technologies/languages
* Repository count associated with each skill
* Skill distribution
* Number of repositories analyzed

### 🎯 Contribution Discovery — Coming Next

The next stage of OpenSourceMate is focused on connecting a developer's technical profile with open GitHub issues.

Planned capabilities include:

* Skill-based issue matching
* Personalized issue recommendations
* Contribution compatibility analysis
* Beginner-friendly issue discovery
* Repository and issue context
* Contribution opportunity ranking

> Features marked as planned are part of the project's roadmap and may not be available yet.

---

## 🏗️ Project Structure

```text
OpenSourceMate/
│
├── backend/
│   ├── API and server-side logic
│   ├── GitHub integration
│   ├── developer profile analysis
│   └── skill analysis
│
├── frontend/
│   ├── Next.js application
│   ├── GitHub profile analyzer UI
│   ├── technical skill visualization
│   └── contribution discovery interface
│
└── README.md
```

## Screenshots
# Dashboard
<img width="1302" height="726" alt="image" src="https://github.com/user-attachments/assets/ba5ac505-b7c3-4c32-a438-afe194e31942" />

# How it works?
<img width="1257" height="723" alt="image" src="https://github.com/user-attachments/assets/908d7b73-7283-4903-83bf-4e0950fa2ee9" />

# Analyze Profile
<img width="1213" height="727" alt="image" src="https://github.com/user-attachments/assets/a115a54f-6359-4db9-83d1-647e28e4167a" />

---

## 🛠️ Tech Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

### Backend

* Python
* FastAPI
* Uvicorn
* Pydantic

### AI / Data

The backend is being developed with an AI/data ecosystem that includes technologies such as:

* Google GenAI
* OpenAI-compatible tooling
* Sentence Transformers
* Transformers
* spaCy
* PyTorch

### Developer & Integration Tools

* GitHub APIs
* GitPython
* REST APIs

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

* Git
* Node.js
* npm
* Python 3.x

---

## 1. Clone the repository

```bash
git clone https://github.com/Muskankr/OpenSourceMate.git
cd OpenSourceMate
```

---

## 2. Run the frontend

```bash
cd frontend
npm install
```

Configure environment variables (optional for local development, defaults to `http://localhost:8000`):

### Windows (PowerShell)

```powershell
Copy-Item .env.example .env.local
```

### macOS / Linux

```bash
cp .env.example .env.local
```

Start the frontend development server:

```bash
npm run dev
```

The frontend will be available at:

```text
http://localhost:3000
```

---

## 3. Run the backend

Open a second terminal:

```bash
cd backend
```

Create and activate a virtual environment:

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### macOS / Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

Configure environment variables (optional, see [Environment Variables](#-environment-variables)):

### Windows (PowerShell)

```powershell
Copy-Item .env.example .env
```

### macOS / Linux

```bash
cp .env.example .env
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI backend server:

```bash
uvicorn app.main:app --reload --port 8000
```

The backend API will be available at:

```text
http://localhost:8000
```

Interactive OpenAPI documentation (Swagger UI) is accessible at `http://localhost:8000/docs`.

### Run the backend tests

The tests mock the GitHub API, so no network or token is needed.

```bash
pip install -r requirements-dev.txt
pytest --cov=app
```

> Backend setup is currently evolving. More detailed setup instructions and environment configuration will be documented as the project develops.

---

## 📡 API Endpoints & Error Handling

All backend responses are serialized with Pydantic serializers, and error responses conform to a unified error shape.

### Health Check

```http
GET /api/health/
GET /api/health
```

Returns the service health status and version.

**Response (`200 OK`):**

```json
{
  "status": "healthy",
  "service": "OpenSourceMate API",
  "version": "0.1.0"
}
```

```http
GET /api/health/diagnostics
```

Returns detailed diagnostic metrics including GitHub API connectivity and cache performance.

### Unified Error Format

All error responses across all API endpoints return a standardized JSON structure with machine-readable error codes and human-readable messages:

```json
{
  "error": {
    "code": "INVALID_USERNAME",
    "message": "Invalid GitHub username '-octocat'. GitHub usernames must be 1-39 characters, contain only alphanumeric characters or single hyphens, and cannot start or end with a hyphen.",
    "details": {
      "username": "-octocat"
    }
  },
  "detail": "Invalid GitHub username '-octocat'. GitHub usernames must be 1-39 characters, contain only alphanumeric characters or single hyphens, and cannot start or end with a hyphen."
}
```

Common error codes:
* `INVALID_USERNAME` (HTTP 400): Username violates GitHub format constraints.
* `NOT_FOUND` (HTTP 404): Requested GitHub user or resource not found.
* `VALIDATION_ERROR` (HTTP 422): Request parameters or body payload failed schema validation.
* `RATE_LIMIT_EXCEEDED` (HTTP 429): Upstream GitHub rate limit reached; includes `reset_at` timestamp.
* `INTERNAL_SERVER_ERROR` (HTTP 500): Unhandled exception during processing.

---

## 🔐 Environment Variables

OpenSourceMate uses environment variables to configure the Next.js frontend and FastAPI backend.

### Key Guidelines

- **Zero-credential local setup**: All variables have safe defaults. You can run the entire frontend and backend locally without supplying any external API keys or tokens.
- **Optional features**: Integrations such as higher GitHub API rate limits and AI-assisted issue analysis are optional. If you wish to test or develop these features, you must provide your own credentials.
- **Secret security**: **Never commit `.env` or `.env.local` files, API keys, passwords, or personal access tokens to Git.** These files are ignored by `.gitignore`.

### Template Setup Instructions

Each component includes a `.env.example` template with supported variables. Copy the templates to initialize your local environment files:

#### From the Repository Root

**Windows (PowerShell):**

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env.local
```

**macOS / Linux:**

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

#### From Component Directories

If you are already inside the `backend/` or `frontend/` directory:

- **Backend (`backend/`):**
  - Windows (PowerShell): `Copy-Item .env.example .env`
  - macOS / Linux: `cp .env.example .env`
- **Frontend (`frontend/`):**
  - Windows (PowerShell): `Copy-Item .env.example .env.local`
  - macOS / Linux: `cp .env.example .env.local`

> **Note for Frontend:** Next.js loads local overrides from `.env.local`. Do not name the frontend file `.env` if you want local development overrides to follow Next.js conventions.

### Supported Environment Variables

| Variable | Location | Required? | Description |
|---|---|---|---|
| `ENVIRONMENT` | `backend/.env` | No | Target runtime environment: `development` (default), `production`, or `testing`. Controls security assertions and defaults. |
| `DEBUG` | `backend/.env` | No | Enables FastAPI debug mode. In development, defaults to `True`. In production, strictly defaults to `False` (setting `True` in production fails loudly). |
| `SECRET_KEY` | `backend/.env` | Dev: No, Prod: **Yes** | Cryptographic secret key. In development, a default dev key is used. In production, **strictly required** (minimum 16 characters); startup fails loudly if unset or default. |
| `ALLOWED_HOSTS` | `backend/.env` | No | Comma-separated list of allowed HTTP Host headers for `TrustedHostMiddleware`. Safe default: `*` (permits all hosts). In production, configure exact domain names. |
| `CORS_ORIGINS` | `backend/.env` | No | Comma-separated list of allowed frontend origins. Default: `http://localhost:3000,http://127.0.0.1:3000,https://open-source-mate-tawny.vercel.app`. |
| `CORS_ALLOW_CREDENTIALS` | `backend/.env` | No | Boolean indicating whether cross-origin cookies and authorization headers are supported. Safe default: `False`. |
| `CORS_ALLOW_METHODS` | `backend/.env` | No | Comma-separated list of permitted HTTP methods. Default: `*`. |
| `CORS_ALLOW_HEADERS` | `backend/.env` | No | Comma-separated list of permitted HTTP headers. Default: `*`. |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | No | Base URL of the FastAPI backend server accessed by the Next.js frontend. Safe default: `http://localhost:8000`. No credentials needed. |
| `GITHUB_TOKEN` | `backend/.env` | No | GitHub Personal Access Token (classic or fine-grained). Raises GitHub REST API rate limits from 60 to 5,000 requests/hour. Safe default: empty (unauthenticated requests). To obtain one, navigate to GitHub **Settings > Developer Settings > Personal access tokens** and generate a token (public read-only access is sufficient). |
| `GITHUB_CACHE_TTL` | `backend/.env` | No | In-memory cache duration (in seconds) for GitHub profile and repository API responses. Safe default: `300` (5 minutes). Set to `0` to disable in-memory caching during development. No credentials needed. |
| `AI_API_KEY` | `backend/.env` | No | OpenAI API key used for optional AI-powered issue analysis (`/api/ai/analyze-issue`). Safe default: empty (AI analysis endpoints return graceful fallback recommendations without errors). To obtain one, generate an API key at [platform.openai.com](https://platform.openai.com/). |
| `AI_MODEL` | `backend/.env` | No | Model name passed to OpenAI when `AI_API_KEY` is set. Safe default: `gpt-4o-mini`. No credentials needed. |

> **Dev vs. Production Separation:**
> - In **development** (`ENVIRONMENT=development`), `DEBUG` defaults to `True` and an insecure default `SECRET_KEY` is allowed so developers can run `uvicorn app.main:app --reload` immediately without configuration.
> - In **production** (`ENVIRONMENT=production`), the application enforces strict production invariants: `DEBUG` must be `False`, and `SECRET_KEY` must be a high-entropy string of at least 16 characters. If `SECRET_KEY` is unset, empty, or using the default key, the application **fails loudly on startup** with a descriptive `ValueError`.
> - Never expose server-side credentials or API keys in the frontend (`NEXT_PUBLIC_*`). Only public configuration (such as the backend API URL) should be placed in `frontend/.env.local`.

**Never commit API keys, passwords, tokens, or other secrets to Git.**

---

## 🧩 How It Works

The current workflow is:

```text
                GitHub Username
                       │
                       ▼
              GitHub Profile API
                       │
                       ▼
             Profile Information
                       │
                       ▼
            Public Repositories
                       │
                       ▼
             Technical Analysis
                       │
                       ▼
                Skill Profile
                       │
                       ▼
        Contribution Discovery
             (Roadmap)
```

The planned contribution-discovery layer will extend this pipeline:

```text
Developer Profile
       │
       ▼
Technical Skills
       │
       ▼
Open GitHub Issues
       │
       ▼
Compatibility Analysis
       │
       ▼
Personalized Opportunities
```

---

## 🤝 Contributing

* See the [Label Guide](docs/LABELS.md) to find an issue that fits your skills.

OpenSourceMate is being built as an open-source project, and contributions are welcome.

Before contributing:

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Test your changes locally.
5. Commit your work with a clear commit message.
6. Push your branch.
7. Open a pull request.

Example:

```bash
git checkout -b feature/your-feature
```

Make your changes and then:

```bash
git add .
git commit -m "feat: add your feature"
git push origin feature/your-feature
```

Then open a pull request describing:

* What you changed
* Why you changed it
* How you tested it
* Any relevant screenshots or examples

For detailed guidelines on setup, branch naming, PR conventions, and coding standards, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 🐛 Issues & Feature Requests

Found a bug or have an idea?

Open an issue and include:

* A clear title
* Description of the problem or feature
* Steps to reproduce, when applicable
* Expected behavior
* Actual behavior
* Screenshots or logs when useful

For larger changes, discuss the idea before starting implementation.

---

## 🔒 Security

Please do not report security vulnerabilities through public issues.

A dedicated security reporting process will be documented as the project matures.

Never include:

* API keys
* Access tokens
* Passwords
* Personal credentials
* Private repository information

in issues or pull requests.

---

## 📚 Project Vision

Open-source contribution can be difficult to navigate, especially for developers who are unsure:

* Which projects match their skills?
* Which issues are suitable for their experience?
* How difficult is an issue?
* What does a repository actually need?
* Where should they start?

OpenSourceMate aims to reduce that discovery barrier by connecting a developer's existing technical experience with meaningful open-source contribution opportunities.

---

## 🌱 Contributing Areas

There are many potential areas for contributors:

| Area                 | Examples                                 |
| -------------------- | ---------------------------------------- |
| Frontend             | UI, UX, accessibility, responsive design |
| Backend              | APIs, validation, architecture           |
| AI/ML                | matching, embeddings, ranking            |
| GitHub Integration   | repositories, issues, metadata           |
| Testing              | unit, integration, E2E                   |
| Documentation        | guides, examples, architecture           |
| DevOps               | CI/CD, deployment, automation            |
| Developer Experience | onboarding, contributor tools            |

---

## 📄 License

This project is licensed under the **MIT License**.

See the `LICENSE` file for details.

---

## ⭐ Support the Project

If you find OpenSourceMate useful or are interested in its development:

* ⭐ Star the repository
* 🐛 Report bugs
* 💡 Suggest features
* 🔧 Submit pull requests
* 📖 Improve documentation

Every contribution helps make open-source participation easier for developers.

---

## 👩‍💻 Author

**Muskan Kumari**

GitHub: [@Muskankr](https://github.com/Muskankr)

---

<p align="center">
  Built to make open-source contribution discovery easier.
</p>
