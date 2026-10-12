"""
EventFlow — Prometheus Metrics

Exposes /metrics endpoint for Prometheus scraping.
Instruments all HTTP requests with count and duration histograms.
"""

import time

from flask import Blueprint, Response, request
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Histogram,
    generate_latest,
    multiprocess,
    CollectorRegistry,
)

metrics_bp = Blueprint("metrics", __name__)

# ── Metric definitions ────────────────────────────────────────────────────────
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total number of HTTP requests",
    ["method", "endpoint", "status_code"],
)

REQUEST_DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
)

BOOKING_CREATED = Counter(
    "eventflow_bookings_created_total",
    "Total confirmed bookings created",
)

BOOKING_CANCELLED = Counter(
    "eventflow_bookings_cancelled_total",
    "Total bookings cancelled",
)

BOOKING_FAILED_INVENTORY = Counter(
    "eventflow_bookings_failed_inventory_total",
    "Booking attempts rejected due to insufficient inventory",
)


@metrics_bp.route("/metrics")
def metrics():
    """Prometheus metrics scrape endpoint."""
    return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)


def start_metrics_middleware(app) -> None:
    """
    Register before/after request hooks to record HTTP metrics.
    Uses a request-local start time to compute duration.
    """

    @app.before_request
    def _before():
        request._metrics_start = time.perf_counter()

    @app.after_request
    def _after(response):
        # Normalize endpoint: use rule path if available, else 'unknown'
        endpoint = request.url_rule.rule if request.url_rule else "unknown"
        duration = time.perf_counter() - getattr(request, "_metrics_start", time.perf_counter())

        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=endpoint,
            status_code=str(response.status_code),
        ).inc()

        REQUEST_DURATION.labels(
            method=request.method,
            endpoint=endpoint,
        ).observe(duration)

        return response
