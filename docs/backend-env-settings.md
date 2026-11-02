# Backend Environment Settings & Dev/Prod Separation

## Overview

This document outlines the environment configuration architecture and dev/prod separation mechanisms implemented in the OpenSourceMate FastAPI backend.

---

## Configuration Architecture (`app/config.py`)

Backend settings are managed using `pydantic-settings` via the `Settings` class:

* Loads variables from environment variables or an optional `.env` file.
* Case-insensitive matching (`case_sensitive=False`).
* Cached via `@lru_cache` in `get_settings()` to avoid redundant filesystem reads.
* Custom validators automatically parse comma-delimited strings or JSON arrays for lists (`ALLOWED_HOSTS`, `CORS_ORIGINS`, etc.).

---

## Environment Separation

| Setting | Development (`ENVIRONMENT=development`) | Production (`ENVIRONMENT=production`) |
|---|---|---|
| `DEBUG` | Defaults to `True` | Defaults to `False` (fails if explicitly set to `True`) |
| `SECRET_KEY` | Insecure dev key allowed | **Strictly required** (minimum 16 characters; fails loudly if unset) |
| `ALLOWED_HOSTS` | Defaults to `["*"]` | Should specify production domains (enforced by `TrustedHostMiddleware`) |
| `CORS_ORIGINS` | Localhost + production frontend URLs | Can be customized via environment variables |

---

## Startup Validation & Loud Failure

When `ENVIRONMENT=production` or `ENVIRONMENT=prod`:
1. If `SECRET_KEY` is missing, blank, or matches known insecure defaults (`dev-insecure-secret-key-change-in-production`, `changeme`, etc.), or is under 16 characters in length, `Settings` raises a `ValueError` immediately on startup:
   ```text
   ValueError: SECRET_KEY must be set to a secure, unique string (minimum 16 characters) in production mode.
   ```
2. If `DEBUG=True` is provided, startup fails with:
   ```text
   ValueError: DEBUG must be set to False in production mode.
   ```

---

## Middleware Integration (`app/main.py`)

* **CORS**: `CORSMiddleware` dynamically consumes `settings.cors_origins`, `settings.cors_allow_credentials`, `settings.cors_allow_methods`, and `settings.cors_allow_headers`.
* **Trusted Hosts**: If `settings.allowed_hosts` is specified and does not contain `"*"`, `TrustedHostMiddleware` is automatically registered to protect against HTTP Host Header injection attacks.

---

## Running Verification

```bash
cd backend
pytest tests/test_settings.py -v
```
All unit tests verify development defaults, production invariant enforcement, and list parsing behavior.
