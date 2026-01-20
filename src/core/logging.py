"""
Structured logging configuration.
JSON logging for production, colored console for development.
"""

import logging
import sys
from contextvars import ContextVar
from datetime import datetime
from typing import Any

import structlog
from structlog.types import EventDict, Processor

from src.core.config import get_settings

settings = get_settings()

# Context variables for request tracking
request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)
user_id_ctx: ContextVar[str | None] = ContextVar("user_id", default=None)


def add_request_context(
    logger: logging.Logger, method_name: str, event_dict: EventDict
) -> EventDict:
    """Add request context to log events."""
    request_id = request_id_ctx.get()
    user_id = user_id_ctx.get()

    if request_id:
        event_dict["request_id"] = request_id
    if user_id:
        event_dict["user_id"] = user_id

    return event_dict


def add_app_context(
    logger: logging.Logger, method_name: str, event_dict: EventDict
) -> EventDict:
    """Add application context to log events."""
    event_dict["app"] = "family-finance"
    event_dict["version"] = settings.APP_VERSION
    event_dict["environment"] = settings.ENVIRONMENT
    return event_dict


def add_timestamp(
    logger: logging.Logger, method_name: str, event_dict: EventDict
) -> EventDict:
    """Add ISO timestamp to log events."""
    event_dict["timestamp"] = datetime.utcnow().isoformat() + "Z"
    return event_dict


def drop_color_message_key(
    logger: logging.Logger, method_name: str, event_dict: EventDict
) -> EventDict:
    """Remove color_message key from event dict."""
    event_dict.pop("color_message", None)
    return event_dict


def setup_logging() -> None:
    """Configure structured logging based on environment."""
    # Determine if we're in production
    is_production = settings.ENVIRONMENT == "production"

    # Shared processors
    shared_processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.PositionalArgumentsFormatter(),
        add_timestamp,
        add_app_context,
        add_request_context,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    if is_production:
        # Production: JSON output
        shared_processors.extend([
            drop_color_message_key,
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ])
    else:
        # Development: Colored console output
        shared_processors.extend([
            structlog.dev.ConsoleRenderer(colors=True),
        ])

    structlog.configure(
        processors=shared_processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Configure standard library logging
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO

    # Root logger
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )

    # Silence noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.DEBUG if settings.DEBUG else logging.WARNING
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Get a structured logger instance."""
    return structlog.get_logger(name)


class RequestLoggingMiddleware:
    """ASGI middleware for request logging."""

    def __init__(self, app):
        self.app = app
        self.logger = get_logger("http")

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        import time
        import uuid

        # Generate request ID
        request_id = str(uuid.uuid4())[:8]
        request_id_ctx.set(request_id)

        # Extract request info
        method = scope["method"]
        path = scope["path"]
        query_string = scope.get("query_string", b"").decode()

        # Get client IP
        client = scope.get("client")
        client_ip = client[0] if client else "unknown"

        start_time = time.perf_counter()
        status_code = 500

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as e:
            self.logger.exception(
                "request_error",
                method=method,
                path=path,
                error=str(e),
            )
            raise
        finally:
            duration_ms = (time.perf_counter() - start_time) * 1000

            # Log request
            log_data: dict[str, Any] = {
                "method": method,
                "path": path,
                "status_code": status_code,
                "duration_ms": round(duration_ms, 2),
                "client_ip": client_ip,
            }

            if query_string:
                log_data["query_string"] = query_string

            # Choose log level based on status code
            if status_code >= 500:
                self.logger.error("request_completed", **log_data)
            elif status_code >= 400:
                self.logger.warning("request_completed", **log_data)
            else:
                self.logger.info("request_completed", **log_data)

            # Clear context
            request_id_ctx.set(None)
            user_id_ctx.set(None)


# Log utility functions
def log_database_query(query: str, duration_ms: float, rows: int = 0):
    """Log a database query."""
    logger = get_logger("database")
    logger.debug(
        "query_executed",
        query=query[:200],  # Truncate long queries
        duration_ms=round(duration_ms, 2),
        rows=rows,
    )


def log_external_api_call(service: str, endpoint: str, duration_ms: float, status: int):
    """Log an external API call."""
    logger = get_logger("external")
    logger.info(
        "api_call",
        service=service,
        endpoint=endpoint,
        duration_ms=round(duration_ms, 2),
        status=status,
    )


def log_security_event(event_type: str, details: dict[str, Any]):
    """Log a security-related event."""
    logger = get_logger("security")
    logger.warning("security_event", event_type=event_type, **details)


def log_business_event(event_type: str, details: dict[str, Any]):
    """Log a business event."""
    logger = get_logger("business")
    logger.info("business_event", event_type=event_type, **details)
