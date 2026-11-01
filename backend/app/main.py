from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes.ai import router as ai_router
from app.api.routes.github import router as github_router
from app.api.routes.issues import router as issues_router
from app.api.routes.matching import router as matching_router
from app.exceptions import APIException
from app.schemas.serializers import (
    HealthDiagnosticsSerializer,
    HealthResponseSerializer,
)
from app.services.github_service import (
    GitHubRateLimitError,
    cache,
    close_client,
    get_github_diagnostics,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_client()


app = FastAPI(
    title="OpenSourceMate API",
    description="AI-powered open-source contribution assistant",
    version="0.1.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://open-source-mate-tawny.vercel.app",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def format_error_content(
    code: str,
    message: str,
    details: Any = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a unified error payload satisfying the standard {error: {code, message, details}} schema."""
    content: dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
            "details": details,
        },
        "detail": message,
    }
    if extra:
        content.update(extra)
    return content


# ---------------------------------------------------------
# Exception Handlers
# ---------------------------------------------------------
@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException):
    return JSONResponse(
        status_code=exc.status_code,
        content=format_error_content(
            code=exc.code,
            message=exc.message,
            details=exc.details,
        ),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail_msg = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        408: "REQUEST_TIMEOUT",
        409: "CONFLICT",
        422: "UNPROCESSABLE_ENTITY",
        429: "RATE_LIMIT_EXCEEDED",
        500: "INTERNAL_SERVER_ERROR",
        502: "BAD_GATEWAY",
        503: "SERVICE_UNAVAILABLE",
        504: "GATEWAY_TIMEOUT",
    }
    code = code_map.get(exc.status_code, f"HTTP_{exc.status_code}")
    details = getattr(exc, "details", None)
    return JSONResponse(
        status_code=exc.status_code,
        content=format_error_content(code=code, message=detail_msg, details=details),
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content=format_error_content(
            code="VALIDATION_ERROR",
            message="Request validation failed.",
            details=exc.errors(),
        ),
    )


@app.exception_handler(GitHubRateLimitError)
async def github_rate_limit_handler(request: Request, exc: GitHubRateLimitError):
    reset_at = exc.reset_at.isoformat() if exc.reset_at else None
    return JSONResponse(
        status_code=429,
        content=format_error_content(
            code="RATE_LIMIT_EXCEEDED",
            message="GitHub rate limit reached. Please try again later.",
            details={"reset_at": reset_at},
            extra={"reset_at": reset_at},
        ),
    )


# ---------------------------------------------------------
# Health Endpoints
# ---------------------------------------------------------
@app.get(
    "/api/health",
    response_model=HealthResponseSerializer,
    tags=["Health"],
    summary="Health check",
)
@app.get(
    "/api/health/",
    response_model=HealthResponseSerializer,
    tags=["Health"],
    include_in_schema=False,
)
async def health_check():
    """Health check endpoint returning service status, name and version."""
    return {
        "status": "healthy",
        "service": "OpenSourceMate API",
        "version": "0.1.0",
    }


@app.get(
    "/api/health/diagnostics",
    response_model=HealthDiagnosticsSerializer,
    tags=["Health"],
    summary="Health diagnostics",
)
@app.get(
    "/api/health/diagnostics/",
    response_model=HealthDiagnosticsSerializer,
    tags=["Health"],
    include_in_schema=False,
)
async def health_diagnostics():
    """Detailed diagnostics of upstream GitHub API connectivity and cache statistics."""
    github_info = await get_github_diagnostics()
    cache_info = cache.stats()
    overall_status = "healthy" if github_info.get("reachable", False) else "degraded"

    return {
        "status": overall_status,
        "service": "OpenSourceMate API",
        "version": "0.1.0",
        "github": github_info,
        "cache": cache_info,
    }


# ---------------------------------------------------------
# Routers
# ---------------------------------------------------------
app.include_router(github_router)
app.include_router(issues_router)
app.include_router(ai_router)
app.include_router(matching_router)
