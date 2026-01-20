"""
Health check and readiness endpoints.
Used by Kubernetes, load balancers, and monitoring systems.
"""

import asyncio
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings

settings = get_settings()
from src.infra.database import get_db

router = APIRouter(tags=["Health"])


class HealthStatus(BaseModel):
    status: str
    timestamp: str
    version: str
    environment: str


class ReadinessStatus(BaseModel):
    status: str
    timestamp: str
    checks: dict[str, Any]


class DetailedHealth(BaseModel):
    status: str
    timestamp: str
    version: str
    environment: str
    uptime_seconds: float
    checks: dict[str, Any]


# Track startup time for uptime calculation
_startup_time: datetime | None = None


def set_startup_time():
    """Called on application startup."""
    global _startup_time
    _startup_time = datetime.utcnow()


def get_uptime_seconds() -> float:
    """Get application uptime in seconds."""
    if _startup_time is None:
        return 0.0
    return (datetime.utcnow() - _startup_time).total_seconds()


@router.get(
    "/health",
    response_model=HealthStatus,
    summary="Basic health check",
    description="Simple health check for load balancers. Always returns 200 if the service is running.",
)
async def health_check() -> HealthStatus:
    """
    Basic liveness probe.
    Returns 200 if the application is running.
    """
    return HealthStatus(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )


@router.get(
    "/health/ready",
    response_model=ReadinessStatus,
    summary="Readiness check",
    description="Checks if the service is ready to accept traffic (database connected, etc.)",
)
async def readiness_check(
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> ReadinessStatus:
    """
    Readiness probe - checks all dependencies.
    Returns 503 if any critical dependency is unavailable.
    """
    checks: dict[str, Any] = {}
    all_healthy = True

    # Check database connection
    try:
        result = await db.execute(text("SELECT 1"))
        result.scalar()
        checks["database"] = {"status": "healthy", "latency_ms": 0}
    except Exception as e:
        checks["database"] = {"status": "unhealthy", "error": str(e)}
        all_healthy = False

    # Set response status based on health
    if not all_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return ReadinessStatus(
        status="ready" if all_healthy else "not_ready",
        timestamp=datetime.utcnow().isoformat(),
        checks=checks,
    )


@router.get(
    "/health/live",
    response_model=HealthStatus,
    summary="Liveness check",
    description="Kubernetes liveness probe - checks if the process should be restarted.",
)
async def liveness_check() -> HealthStatus:
    """
    Liveness probe - simple check that the event loop is responsive.
    If this fails, Kubernetes should restart the container.
    """
    # Simple async operation to verify event loop is healthy
    await asyncio.sleep(0)

    return HealthStatus(
        status="alive",
        timestamp=datetime.utcnow().isoformat(),
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )


@router.get(
    "/health/detailed",
    response_model=DetailedHealth,
    summary="Detailed health check",
    description="Comprehensive health check with all system details. Use for debugging.",
)
async def detailed_health_check(
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> DetailedHealth:
    """
    Detailed health check with timing information.
    Useful for debugging and monitoring dashboards.
    """
    import time

    checks: dict[str, Any] = {}
    all_healthy = True

    # Database check with timing
    start = time.perf_counter()
    try:
        result = await db.execute(text("SELECT 1"))
        result.scalar()
        latency = (time.perf_counter() - start) * 1000
        checks["database"] = {
            "status": "healthy",
            "latency_ms": round(latency, 2),
        }
    except Exception as e:
        latency = (time.perf_counter() - start) * 1000
        checks["database"] = {
            "status": "unhealthy",
            "latency_ms": round(latency, 2),
            "error": str(e),
        }
        all_healthy = False

    # Memory usage
    try:
        import psutil

        process = psutil.Process()
        memory_info = process.memory_info()
        checks["memory"] = {
            "status": "healthy",
            "rss_mb": round(memory_info.rss / 1024 / 1024, 2),
            "vms_mb": round(memory_info.vms / 1024 / 1024, 2),
        }

        # Check if memory exceeds threshold (512MB)
        if memory_info.rss > 512 * 1024 * 1024:
            checks["memory"]["status"] = "warning"
            checks["memory"]["message"] = "Memory usage above threshold"
    except ImportError:
        checks["memory"] = {"status": "unknown", "message": "psutil not installed"}

    if not all_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return DetailedHealth(
        status="healthy" if all_healthy else "unhealthy",
        timestamp=datetime.utcnow().isoformat(),
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        uptime_seconds=round(get_uptime_seconds(), 2),
        checks=checks,
    )
