"""
EventFlow Backend — Application Factory
"""

import os

from flask import Flask
from flask_cors import CORS

from .config import get_config
from .extensions import db, jwt, limiter, migrate
from .errors import register_error_handlers
from .health import health_bp
from .metrics import metrics_bp, start_metrics_middleware
from .api import register_blueprints


def create_app(config_name: str | None = None) -> Flask:
    """
    Application factory.

    Args:
        config_name: One of 'development', 'testing', 'production'.
                     Defaults to FLASK_ENV environment variable, falling back
                     to 'development'.

    Returns:
        Configured Flask application instance.
    """
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")

    app = Flask(__name__)

    # ── Load configuration ────────────────────────────────────────────────────
    config = get_config(config_name)
    app.config.from_object(config)

    # ── Initialize extensions ─────────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    limiter.init_app(app)

    # ── CORS ──────────────────────────────────────────────────────────────────
    origins = app.config.get("CORS_ORIGINS", [])
    CORS(
        app,
        resources={r"/api/*": {"origins": origins}},
        supports_credentials=True,
    )

    # ── Register blueprints ───────────────────────────────────────────────────
    register_blueprints(app)
    app.register_blueprint(health_bp)
    app.register_blueprint(metrics_bp)

    # ── Error handlers ────────────────────────────────────────────────────────
    register_error_handlers(app)

    # ── Prometheus middleware ─────────────────────────────────────────────────
    start_metrics_middleware(app)

    # ── CLI commands ──────────────────────────────────────────────────────────
    _register_cli_commands(app)

    return app


def _register_cli_commands(app: Flask) -> None:
    """Register custom Flask CLI commands."""

    @app.cli.command("create-admin")
    def create_admin():
        """Bootstrap the first administrator account."""
        import getpass
        from .models.user import User
        from .extensions import db

        print("=" * 50)
        print("EventFlow — Create Administrator Account")
        print("=" * 50)
        name = input("Full name: ").strip()
        email = input("Email address: ").strip().lower()
        password = getpass.getpass("Password (hidden): ")
        confirm = getpass.getpass("Confirm password (hidden): ")

        if password != confirm:
            print("ERROR: Passwords do not match. Aborting.")
            return

        if len(password) < 8:
            print("ERROR: Password must be at least 8 characters.")
            return

        with app.app_context():
            existing = User.query.filter_by(email=email).first()
            if existing:
                print(f"ERROR: A user with email '{email}' already exists.")
                return

            admin = User(name=name, email=email, role="admin")
            admin.set_password(password)
            db.session.add(admin)
            db.session.commit()
            print(f"\n✅ Administrator account created successfully.")
            print(f"   Name:  {admin.name}")
            print(f"   Email: {admin.email}")
            print(f"   Role:  {admin.role}")
            print(f"   ID:    {admin.id}")

    @app.cli.command("seed-events")
    def seed_events():
        """Create sample events for development/demo purposes."""
        from datetime import datetime, timedelta, timezone
        from decimal import Decimal
        from .models.user import User
        from .models.event import Event, EventStatus
        from .models.ticket_type import TicketType
        from .extensions import db

        with app.app_context():
            admin = User.query.filter_by(role="admin").first()
            if not admin:
                print("ERROR: No admin user found. Run 'flask create-admin' first.")
                return

            now = datetime.now(timezone.utc)
            sample_events = [
                {
                    "title": "Tech Summit 2026",
                    "description": "The premier technology conference bringing together developers, architects, and innovators from across the globe.",
                    "venue": "Convention Center, Silicon Valley",
                    "start_at": now + timedelta(days=30),
                    "end_at": now + timedelta(days=31),
                    "status": EventStatus.PUBLISHED,
                    "tickets": [
                        {"name": "Regular", "price": "299.00", "capacity": 500},
                        {"name": "Premium", "price": "599.00", "capacity": 100},
                        {"name": "VIP", "price": "1299.00", "capacity": 20},
                    ],
                },
                {
                    "title": "Jazz Night at the Garden",
                    "description": "An enchanting evening of live jazz music featuring internationally renowned artists in an open-air garden setting.",
                    "venue": "Botanical Garden Amphitheater",
                    "start_at": now + timedelta(days=14),
                    "end_at": now + timedelta(days=14, hours=4),
                    "status": EventStatus.PUBLISHED,
                    "tickets": [
                        {"name": "Regular", "price": "49.00", "capacity": 300},
                        {"name": "Premium", "price": "99.00", "capacity": 50},
                    ],
                },
                {
                    "title": "DevOps World 2026",
                    "description": "Hands-on workshops and talks on CI/CD, Kubernetes, cloud-native architecture, and platform engineering.",
                    "venue": "Grand Exhibition Hall, Downtown",
                    "start_at": now + timedelta(days=60),
                    "end_at": now + timedelta(days=62),
                    "status": EventStatus.PUBLISHED,
                    "tickets": [
                        {"name": "Regular", "price": "399.00", "capacity": 400},
                        {"name": "Premium", "price": "799.00", "capacity": 80},
                        {"name": "VIP", "price": "1599.00", "capacity": 10},
                    ],
                },
            ]

            for ev_data in sample_events:
                existing = Event.query.filter_by(title=ev_data["title"]).first()
                if existing:
                    print(f"Skipping '{ev_data['title']}' (already exists)")
                    continue

                tickets_data = ev_data.pop("tickets")
                event = Event(created_by=admin.id, **ev_data)
                db.session.add(event)
                db.session.flush()  # get event.id

                for t in tickets_data:
                    tt = TicketType(
                        event_id=event.id,
                        name=t["name"],
                        price=Decimal(t["price"]),
                        capacity=t["capacity"],
                        available=t["capacity"],
                    )
                    db.session.add(tt)

            db.session.commit()
            print("✅ Sample events seeded successfully.")
