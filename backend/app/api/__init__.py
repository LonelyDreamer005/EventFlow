"""
EventFlow — API Package
Registers all versioned API blueprints.
"""

from flask import Flask


def register_blueprints(app: Flask) -> None:
    """Register all API blueprints under /api/v1."""
    from .admin import admin_bp
    from .auth import auth_bp
    from .bookings import bookings_bp
    from .events import events_bp
    from .ticket_types import ticket_types_bp

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(events_bp, url_prefix="/api/v1/events")
    app.register_blueprint(ticket_types_bp, url_prefix="/api/v1")
    app.register_blueprint(bookings_bp, url_prefix="/api/v1/bookings")
    app.register_blueprint(admin_bp, url_prefix="/api/v1/admin")
