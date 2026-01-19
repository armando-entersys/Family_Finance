"""
FamilyFinance API - Main Application Entry Point.

Assembles middleware, routes, and lifecycle events.
Follows Clean Architecture principles.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from src.core.config import get_settings
from src.core.exceptions import setup_exception_handlers
from src.core.logging import setup_logging, get_logger, RequestLoggingMiddleware
from src.core.middleware import setup_middleware, UserContextMiddleware
from src.infra.database import close_db

# Import routers
from src.api.v1.endpoints.auth import router as auth_router
from src.api.v1.endpoints.trx import router as trx_router
from src.api.v1.endpoints.stats import router as stats_router
from src.api.v1.endpoints.goals import router as goals_router
from src.api.v1.endpoints.debts import router as debts_router
from src.api.v1.endpoints.settings import router as settings_router
from src.api.v1.endpoints.health import router as health_router, set_startup_time
from src.api.v1.endpoints.metrics import router as metrics_router, MetricsMiddleware

settings = get_settings()
logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup
    setup_logging()
    set_startup_time()
    logger.info(
        "application_startup",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )
    yield
    # Shutdown
    logger.info("application_shutdown")
    await close_db()


def create_application() -> FastAPI:
    """
    Application factory.
    Creates and configures the FastAPI application.
    """
    app = FastAPI(
        title=settings.app_name,
        description="Family Finance Management API",
        version="1.0.0",
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        lifespan=lifespan,
    )

    # Configure middleware
    configure_middleware(app)

    # Setup exception handlers
    setup_exception_handlers(app)

    # Register routes
    register_routes(app)

    return app


def configure_middleware(app: FastAPI) -> None:
    """Configure application middleware stack."""

    # TrustedHost - Prevent Host header attacks
    if settings.is_production:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=settings.ALLOWED_HOSTS,
        )

    # Setup custom middleware (CORS, rate limiting, security headers, etc.)
    setup_middleware(app)

    # GZip - Compress responses > 1KB
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Metrics middleware
    app.add_middleware(MetricsMiddleware)

    # User context middleware (extracts user from JWT)
    app.add_middleware(UserContextMiddleware)

    # Request logging middleware
    app.add_middleware(RequestLoggingMiddleware)


def register_routes(app: FastAPI) -> None:
    """Register API routes."""

    # Health and metrics endpoints (root level)
    app.include_router(health_router)
    app.include_router(metrics_router)

    # API v1 routes
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(trx_router, prefix="/api/v1")
    app.include_router(stats_router, prefix="/api/v1")
    app.include_router(goals_router, prefix="/api/v1")
    app.include_router(debts_router, prefix="/api/v1")
    app.include_router(settings_router, prefix="/api/v1")


# Create application instance
app = create_application()
