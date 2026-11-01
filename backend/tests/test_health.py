import asyncio
from unittest.mock import AsyncMock, patch

import httpx

from app.cache import TTLCache
from app.main import app


def test_health_endpoint_returns_healty_status():
    async def make_request():
        transport = httpx.ASGITransport(app=app)

        async with httpx.AsyncClient(
            transport=transport,
            base_url="https://test",
        ) as client:
            return await client.get("/api/health")

    response = asyncio.run(make_request())

    assert response.status_code == 200

    assert response.json() == {
        "status": "healthy",
        "service": "OpenSourceMate API",
        "version": "0.1.0",
    }


def test_health_diagnostics_success():
    mock_rate_limit = {
        "resources": {
            "core": {"limit": 60, "remaining": 55, "reset": 1700000000},
            "search": {"limit": 10, "remaining": 9, "reset": 1700000000},
        }
    }

    mock_resp = httpx.Response(
        status_code=200,
        json=mock_rate_limit,
        request=httpx.Request("GET", "https://api.github.com/rate_limit"),
    )

    async def make_request():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="https://test") as client:
            return await client.get("/api/health/diagnostics")

    with patch("app.services.github_service.get_client") as mock_get_client:
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_resp)
        mock_get_client.return_value = mock_client

        response = asyncio.run(make_request())

    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "healthy"
    assert data["service"] == "OpenSourceMate API"
    assert data["github"]["reachable"] is True
    assert data["github"]["rate_limit"]["core"]["limit"] == 60
    assert data["github"]["rate_limit"]["core"]["remaining"] == 55
    assert data["github"]["rate_limit"]["search"]["limit"] == 10
    assert "active_entries" in data["cache"]


def test_health_diagnostics_degraded_when_github_fails():
    async def make_request():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="https://test") as client:
            return await client.get("/api/health/diagnostics")

    with patch("app.services.github_service.get_client") as mock_get_client:
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=httpx.ConnectError("Connection refused"))
        mock_get_client.return_value = mock_client

        response = asyncio.run(make_request())

    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "degraded"
    assert data["github"]["reachable"] is False
    assert "Connection refused" in data["github"]["error"]


def test_health_diagnostics_token_masked():
    mock_resp = httpx.Response(
        status_code=200,
        json={"resources": {}},
        request=httpx.Request("GET", "https://api.github.com/rate_limit"),
    )

    async def make_request():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="https://test") as client:
            return await client.get("/api/health/diagnostics")

    with patch("app.services.github_service.get_settings") as mock_settings, \
         patch("app.services.github_service.get_client") as mock_get_client:
        mock_settings.return_value.github_token = "ghp_secretToken1234567890"
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_resp)
        mock_get_client.return_value = mock_client

        response = asyncio.run(make_request())

    assert response.status_code == 200
    data = response.json()
    assert data["github"]["token_configured"] is True
    assert data["github"]["token_preview"] == "ghp_****"
    assert "secretToken" not in str(data)


def test_cache_stats():
    cache = TTLCache(max_entries=5)
    assert cache.stats() == {"active_entries": 0, "total_keys": 0, "max_entries": 5}

    cache.set("a", 1, ttl=60)
    cache.set("b", 2, ttl=60)
    assert cache.stats()["active_entries"] == 2
    assert cache.stats()["total_keys"] == 2


def test_health_endpoint_trailing_slash():
    async def make_request():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="https://test") as client:
            return await client.get("/api/health/")

    response = asyncio.run(make_request())
    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "OpenSourceMate API",
        "version": "0.1.0",
    }
