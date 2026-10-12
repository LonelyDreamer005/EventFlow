"""
EventFlow — pytest Configuration and Fixtures

This module provides shared fixtures for all test categories:
  - unit: fast tests with no external dependencies
  - integration: tests requiring a running PostgreSQL database
  - concurrency: concurrent booking tests (subset of integration)

IMPORTANT: Integration tests require a dedicated test database.
Set TEST_DATABASE_URL in your .env or environment before running.

Example:
    TEST_DATABASE_URL=postgresql://eventflow_user:password@localhost:5432/eventflow_test
"""

import os
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest

from app import create_app
from app.extensions import db as _db
from app.models.event import Event, EventStatus
from app.models.ticket_type import TicketType
from app.models.user import User

# Load test env before creating app
os.environ.setdefault("FLASK_ENV", "testing")
if not os.environ.get("TEST_DATABASE_URL") and not os.environ.get("POSTGRES_HOST"):
    os.environ["TEST_DATABASE_URL"] = "sqlite:///eventflow_test.db"


@pytest.fixture(scope="session")
def app():
    """Create a test Flask application instance (session-scoped)."""
    flask_app = create_app("testing")
    flask_app.config["TESTING"] = True
    flask_app.config["RATELIMIT_ENABLED"] = False

    with flask_app.app_context():
        _db.create_all()
        yield flask_app
        _db.drop_all()


@pytest.fixture(scope="function")
def db(app):
    """
    Provide a clean database for each test function.
    Cleans all tables before and after each test function.
    """
    with app.app_context():
        _db.session.remove()
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()

        yield _db

        _db.session.remove()
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()


@pytest.fixture(scope="function")
def client(app, db):
    """Flask test client with database isolation."""
    return app.test_client()


# ── User fixtures ─────────────────────────────────────────────────────────────


@pytest.fixture
def customer_user(db):
    """A registered customer user."""
    user = User(name="Test Customer", email="customer@test.com", role="customer")
    user.set_password("TestPassword123")
    db.session.add(user)
    db.session.flush()
    return user


@pytest.fixture
def admin_user(db):
    """A registered admin user."""
    user = User(name="Test Admin", email="admin@test.com", role="admin")
    user.set_password("AdminPassword123")
    db.session.add(user)
    db.session.flush()
    return user


@pytest.fixture
def customer_token(client, customer_user):
    """JWT access token for the customer user."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "customer@test.com", "password": "TestPassword123"},
    )
    assert resp.status_code == 200, f"Login failed: {resp.get_json()}"
    return resp.get_json()["access_token"]


@pytest.fixture
def admin_token(client, admin_user):
    """JWT access token for the admin user."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "AdminPassword123"},
    )
    assert resp.status_code == 200, f"Admin login failed: {resp.get_json()}"
    return resp.get_json()["access_token"]


# ── Event fixtures ────────────────────────────────────────────────────────────


@pytest.fixture
def published_event(db, admin_user):
    """A published event with a future start date."""
    event = Event(
        title="Test Concert",
        description="An amazing test concert event with great music.",
        venue="Test Arena",
        start_at=datetime.now(UTC) + timedelta(days=30),
        end_at=datetime.now(UTC) + timedelta(days=30, hours=3),
        status=EventStatus.PUBLISHED.value,
        created_by=admin_user.id,
    )
    db.session.add(event)
    db.session.flush()
    return event


@pytest.fixture
def draft_event(db, admin_user):
    """A draft event (not visible to customers)."""
    event = Event(
        title="Draft Event",
        description="This event is not yet published and has a long description.",
        venue="Draft Venue",
        start_at=datetime.now(UTC) + timedelta(days=60),
        end_at=datetime.now(UTC) + timedelta(days=60, hours=2),
        status=EventStatus.DRAFT.value,
        created_by=admin_user.id,
    )
    db.session.add(event)
    db.session.flush()
    return event


@pytest.fixture
def cancelled_event(db, admin_user):
    """A cancelled event."""
    event = Event(
        title="Cancelled Event",
        description="This event was cancelled and no longer accepts bookings.",
        venue="Cancelled Venue",
        start_at=datetime.now(UTC) + timedelta(days=10),
        end_at=datetime.now(UTC) + timedelta(days=10, hours=2),
        status=EventStatus.CANCELLED.value,
        created_by=admin_user.id,
    )
    db.session.add(event)
    db.session.flush()
    return event


# ── Ticket type fixtures ──────────────────────────────────────────────────────


@pytest.fixture
def ticket_type_regular(db, published_event):
    """Regular ticket type with 10 available tickets."""
    tt = TicketType(
        event_id=published_event.id,
        name="Regular",
        price=Decimal("50.00"),
        capacity=10,
        available=10,
        max_per_booking=5,
    )
    db.session.add(tt)
    db.session.flush()
    return tt


@pytest.fixture
def ticket_type_vip(db, published_event):
    """VIP ticket type with 3 available tickets."""
    tt = TicketType(
        event_id=published_event.id,
        name="VIP",
        price=Decimal("200.00"),
        capacity=3,
        available=3,
        max_per_booking=2,
    )
    db.session.add(tt)
    db.session.flush()
    return tt


@pytest.fixture
def scarce_ticket_type(db, published_event):
    """Ticket type with only 5 available — used for concurrency tests."""
    tt = TicketType(
        event_id=published_event.id,
        name="Scarce",
        price=Decimal("100.00"),
        capacity=5,
        available=5,
        max_per_booking=5,
    )
    db.session.add(tt)
    db.session.flush()
    return tt
