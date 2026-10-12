# =============================================================================
# EventFlow Backend — Multi-Stage Production Dockerfile
# Stage 1: Build & install dependencies
# Stage 2: Minimal unprivileged runtime image
# =============================================================================

# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build tools if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# System dependencies: curl for container health check, libpq5 for PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Security: Create non-root system user
RUN groupadd -g 10001 appuser && \
    useradd -u 10001 -g appuser -s /bin/bash -m appuser

# Copy installed Python packages from builder stage
COPY --from=builder /install /usr/local

WORKDIR /app

# Copy application source code
COPY app/ ./app/
COPY wsgi.py gunicorn.conf.py ./

# Create instance directory for SQLite or file storage and grant permissions
RUN mkdir -p /app/instance && chown -R appuser:appuser /app

# Switch to unprivileged user
USER appuser

# Python environment settings
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    FLASK_ENV=production \
    PORT=5000

EXPOSE 5000

# Container liveness & readiness health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Production WSGI server
CMD ["gunicorn", "--config", "gunicorn.conf.py", "wsgi:app"]
