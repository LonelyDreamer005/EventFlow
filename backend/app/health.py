"""
EventFlow — Health Check Endpoint

GET /health
Returns application and database dependency status.
"""

import time

from flask import Blueprint, jsonify

from .extensions import db

health_bp = Blueprint("health", __name__)

_start_time = time.time()


@health_bp.route("/health")
def health():
    """
    Application health check.

    Returns 200 if the application is healthy (including DB connectivity).
    Returns 503 if the database is unreachable.

    Response format:
    {
        "status": "healthy" | "degraded",
        "uptime_seconds": <float>,
        "checks": {
            "database": "ok" | "error"
        }
    }
    """
    uptime = round(time.time() - _start_time, 2)
    db_status = "ok"
    overall = "healthy"

    try:
        # Lightweight DB connectivity check — does not read user data
        db.session.execute(db.text("SELECT 1"))
    except Exception:
        db_status = "error"
        overall = "degraded"

    response = {
        "status": overall,
        "uptime_seconds": uptime,
        "checks": {
            "database": db_status,
        },
    }
    http_status = 200 if overall == "healthy" else 503
    return jsonify(response), http_status
