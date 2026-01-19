# =============================================================================
# FamilyFinance - Production Dockerfile (Multi-stage)
# Target: <150MB startup RAM, <512MB under load
# =============================================================================

# STAGE 1: Builder (Dependency compilation)
FROM python:3.11-slim-bookworm AS builder

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install build dependencies for compiled packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for cache optimization
COPY requirements.txt .

# Install dependencies in user space for easy copy
RUN pip install --user --no-warn-script-location -r requirements.txt


# STAGE 2: Runtime (Clean production image)
FROM python:3.11-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-privileged user for security
RUN useradd -m -u 1000 -s /bin/bash appuser

# Copy installed packages from builder
COPY --from=builder /root/.local /home/appuser/.local

# Copy application code
COPY ./src /app/src
COPY ./alembic.ini /app/alembic.ini
COPY ./migrations /app/migrations

# Set correct permissions
RUN chown -R appuser:appuser /app

# Configure environment
ENV PATH=/home/appuser/.local/bin:$PATH

# Switch to non-root user
USER appuser

# Health check (native, no curl overhead)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health', timeout=2).raise_for_status()" || exit 1

# Expose port
EXPOSE 8000

# Run with Gunicorn (process manager) + Uvicorn (async workers)
# Limited to 2 workers to respect server CPU constraints
CMD ["gunicorn", "src.main:app", \
     "-w", "2", \
     "-k", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--capture-output", \
     "--enable-stdio-inheritance"]
