"""
Prometheus metrics endpoint.
Exposes application metrics in Prometheus format.
"""

import time
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import Any

from fastapi import APIRouter, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

router = APIRouter(tags=["Metrics"])


class MetricsCollector:
    """Simple in-memory metrics collector for Prometheus."""

    def __init__(self):
        self._counters: dict[str, int] = defaultdict(int)
        self._histograms: dict[str, list[float]] = defaultdict(list)
        self._gauges: dict[str, float] = {}

    def inc_counter(self, name: str, labels: dict[str, str] | None = None, value: int = 1):
        """Increment a counter metric."""
        key = self._make_key(name, labels)
        self._counters[key] += value

    def observe_histogram(self, name: str, value: float, labels: dict[str, str] | None = None):
        """Record a histogram observation."""
        key = self._make_key(name, labels)
        self._histograms[key].append(value)

    def set_gauge(self, name: str, value: float, labels: dict[str, str] | None = None):
        """Set a gauge value."""
        key = self._make_key(name, labels)
        self._gauges[key] = value

    def _make_key(self, name: str, labels: dict[str, str] | None) -> str:
        """Create a unique key for the metric."""
        if not labels:
            return name
        label_str = ",".join(f'{k}="{v}"' for k, v in sorted(labels.items()))
        return f"{name}{{{label_str}}}"

    def export(self) -> str:
        """Export metrics in Prometheus format."""
        lines = []

        # Export counters
        for key, value in self._counters.items():
            lines.append(f"{key} {value}")

        # Export gauges
        for key, value in self._gauges.items():
            lines.append(f"{key} {value}")

        # Export histograms (simplified - just count and sum)
        histogram_aggregates: dict[str, dict[str, Any]] = {}
        for key, values in self._histograms.items():
            base_name = key.split("{")[0]
            if base_name not in histogram_aggregates:
                histogram_aggregates[base_name] = {"count": 0, "sum": 0.0, "buckets": defaultdict(int)}
            histogram_aggregates[base_name]["count"] += len(values)
            histogram_aggregates[base_name]["sum"] += sum(values)

            # Count values in standard buckets
            buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
            for v in values:
                for b in buckets:
                    if v <= b:
                        histogram_aggregates[base_name]["buckets"][b] += 1

        for name, data in histogram_aggregates.items():
            buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
            cumulative = 0
            for b in buckets:
                cumulative += data["buckets"][b]
                lines.append(f'{name}_bucket{{le="{b}"}} {cumulative}')
            lines.append(f'{name}_bucket{{le="+Inf"}} {data["count"]}')
            lines.append(f"{name}_sum {data['sum']}")
            lines.append(f"{name}_count {data['count']}")

        return "\n".join(lines)


# Global metrics collector
metrics = MetricsCollector()


class MetricsMiddleware(BaseHTTPMiddleware):
    """Middleware to collect HTTP request metrics."""

    async def dispatch(self, request: Request, call_next):
        # Skip metrics endpoint to avoid recursion
        if request.url.path == "/metrics":
            return await call_next(request)

        start_time = time.perf_counter()

        response = await call_next(request)

        # Record request duration
        duration = time.perf_counter() - start_time
        labels = {
            "method": request.method,
            "path": self._normalize_path(request.url.path),
            "status": str(response.status_code),
        }

        metrics.inc_counter("http_requests_total", labels)
        metrics.observe_histogram("http_request_duration_seconds", duration, labels)

        return response

    def _normalize_path(self, path: str) -> str:
        """Normalize path to avoid high cardinality from IDs."""
        import re

        # Replace UUIDs
        path = re.sub(
            r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
            "{id}",
            path,
            flags=re.IGNORECASE,
        )
        # Replace numeric IDs
        path = re.sub(r"/\d+", "/{id}", path)
        return path


@asynccontextmanager
async def track_db_operation(operation: str):
    """Context manager to track database operation timing."""
    start = time.perf_counter()
    try:
        yield
    finally:
        duration = time.perf_counter() - start
        metrics.observe_histogram(
            "db_operation_duration_seconds",
            duration,
            {"operation": operation},
        )


@router.get(
    "/metrics",
    summary="Prometheus metrics",
    description="Exposes application metrics in Prometheus format",
    response_class=Response,
)
async def prometheus_metrics() -> Response:
    """
    Prometheus metrics endpoint.
    Returns metrics in Prometheus text format.
    """
    # Add some system metrics
    try:
        import psutil

        process = psutil.Process()
        memory_info = process.memory_info()
        metrics.set_gauge("process_resident_memory_bytes", memory_info.rss)
        metrics.set_gauge("process_virtual_memory_bytes", memory_info.vms)
        metrics.set_gauge("process_cpu_percent", process.cpu_percent())
    except ImportError:
        pass

    output = metrics.export()
    return Response(
        content=output,
        media_type="text/plain; version=0.0.4; charset=utf-8",
    )


# Convenience functions for application code
def increment_counter(name: str, labels: dict[str, str] | None = None):
    """Increment a counter metric from application code."""
    metrics.inc_counter(name, labels)


def record_histogram(name: str, value: float, labels: dict[str, str] | None = None):
    """Record a histogram value from application code."""
    metrics.observe_histogram(name, value, labels)


def set_gauge(name: str, value: float, labels: dict[str, str] | None = None):
    """Set a gauge value from application code."""
    metrics.set_gauge(name, value, labels)
