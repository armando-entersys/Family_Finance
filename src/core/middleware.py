"""
FastAPI middleware components.
Security headers, CORS, rate limiting, etc.
"""

import time
import uuid
from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from src.core.config import get_settings

settings = get_settings()
from src.core.logging import get_logger, request_id_ctx, user_id_ctx

logger = get_logger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
            "magnetometer=(), microphone=(), payment=(), usb=()"
        )

        # Remove server header
        response.headers.pop("server", None)

        # Add request ID to response headers
        request_id = request_id_ctx.get()
        if request_id:
            response.headers["X-Request-ID"] = request_id

        return response


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Generate and track request IDs."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check for existing request ID from headers
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            request_id = str(uuid.uuid4())[:8]

        # Set context variable
        request_id_ctx.set(request_id)

        # Add to request state
        request.state.request_id = request_id

        response = await call_next(request)

        # Add to response headers
        response.headers["X-Request-ID"] = request_id

        return response


class TimingMiddleware(BaseHTTPMiddleware):
    """Add server timing header to responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start_time) * 1000

        response.headers["Server-Timing"] = f"total;dur={duration_ms:.2f}"

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiting."""

    def __init__(self, app, requests_per_minute: int = 100):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests: dict[str, list[float]] = {}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/health/ready", "/health/live"]:
            return await call_next(request)

        # Get client IP
        client_ip = self._get_client_ip(request)
        current_time = time.time()

        # Clean old entries and check rate
        if client_ip in self.requests:
            # Remove requests older than 1 minute
            self.requests[client_ip] = [
                t for t in self.requests[client_ip]
                if current_time - t < 60
            ]

            if len(self.requests[client_ip]) >= self.requests_per_minute:
                logger.warning(
                    "rate_limit_exceeded",
                    client_ip=client_ip,
                    requests=len(self.requests[client_ip]),
                )
                return Response(
                    content='{"detail": "Rate limit exceeded"}',
                    status_code=429,
                    media_type="application/json",
                    headers={"Retry-After": "60"},
                )
        else:
            self.requests[client_ip] = []

        # Record request
        self.requests[client_ip].append(current_time)

        return await call_next(request)

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request, handling proxies."""
        # Check X-Forwarded-For header
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Return first IP in the chain
            return forwarded_for.split(",")[0].strip()

        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fall back to direct client IP
        if request.client:
            return request.client.host

        return "unknown"


def setup_middleware(app: FastAPI) -> None:
    """Configure all middleware for the application."""

    # CORS - must be first
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Total-Count"],
    )

    # Rate limiting (in production, use Redis-based solution)
    if settings.ENVIRONMENT != "development":
        app.add_middleware(
            RateLimitMiddleware,
            requests_per_minute=100,
        )

    # Security headers
    app.add_middleware(SecurityHeadersMiddleware)

    # Request ID tracking
    app.add_middleware(RequestIDMiddleware)

    # Timing header
    app.add_middleware(TimingMiddleware)


class UserContextMiddleware:
    """Middleware to extract user context from JWT token."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Try to extract user from Authorization header
        headers = dict(scope.get("headers", []))
        auth_header = headers.get(b"authorization", b"").decode()

        if auth_header.startswith("Bearer "):
            try:
                from src.core.security import decode_access_token
                token = auth_header[7:]
                payload = decode_access_token(token)
                if payload and "sub" in payload:
                    user_id_ctx.set(payload["sub"])
            except Exception:
                pass

        await self.app(scope, receive, send)
