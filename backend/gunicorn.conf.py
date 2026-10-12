"""
EventFlow — Gunicorn Production Configuration

Reference: https://docs.gunicorn.org/en/stable/configure.html
"""

import os

# ── Binding ───────────────────────────────────────────────────────────────────
bind = "0.0.0.0:5000"

# ── Workers ───────────────────────────────────────────────────────────────────
# Formula: 2 * CPU cores + 1 (adjust for container resources)
workers = int(os.environ.get("GUNICORN_WORKERS", "4"))
worker_class = "sync"
threads = 1  # sync worker: 1 thread per worker

# ── Timeouts ─────────────────────────────────────────────────────────────────
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "120"))
graceful_timeout = 30
keepalive = 5

# ── Logging ──────────────────────────────────────────────────────────────────
accesslog = "-"  # stdout
errorlog = "-"  # stderr
loglevel = os.environ.get("LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# ── Process ───────────────────────────────────────────────────────────────────
preload_app = True
forwarded_allow_ips = "*"  # Trust X-Forwarded-For from reverse proxy
