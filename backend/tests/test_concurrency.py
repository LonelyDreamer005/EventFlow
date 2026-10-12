"""
EventFlow — Concurrency Tests

These tests verify that concurrent booking requests NEVER cause overselling.

IMPORTANT: These tests require PostgreSQL (not SQLite) because:
1. SELECT ... FOR UPDATE is a PostgreSQL feature.
2. SQLite handles locking differently and would not catch race conditions.
3. The test must use SEPARATE database connections to simulate concurrency.

Test strategy:
- Create an event with N available tickets.
- Submit M concurrent booking requests (M >> N).
- After all requests complete, verify:
  a. Total confirmed tickets <= N.
  b. ticket_type.available >= 0.
  c. ticket_type.available == capacity - confirmed_quantity.
  d. No negative inventory.

This uses Python threads, each with their own database connection/session,
to simulate real concurrent HTTP clients.
"""

import threading
from decimal import Decimal
from datetime import datetime, timedelta, timezone

import pytest

from app import create_app
from app.extensions import db as _db
from app.models.event import Event, EventStatus
from app.models.ticket_type import TicketType
from app.models.user import User
from app.models.booking import Booking, BookingStatus
from app.models.booking_item import BookingItem


@pytest.mark.concurrency
class TestConcurrentBooking:
    """
    Concurrent booking tests.

    Each test uses its own database session per thread to simulate
    real concurrent clients hitting separate application workers.
    """

    def _make_app(self):
        """Create a fresh application instance for concurrency tests."""
        return create_app("testing")

    def _make_test_data(self, session, capacity: int = 5):
        """Create admin, event, and ticket type with given capacity."""
        admin = User(name="ConcAdmin", email="concadmin@test.com", role="admin")
        admin.set_password("AdminPass123")
        session.add(admin)
        session.flush()

        event = Event(
            title="Concurrency Test Event",
            description="Used for concurrent booking tests to verify no overselling.",
            venue="Test Venue",
            start_at=datetime.now(timezone.utc) + timedelta(days=30),
            end_at=datetime.now(timezone.utc) + timedelta(days=30, hours=3),
            status=EventStatus.PUBLISHED.value,
            created_by=admin.id,
        )
        session.add(event)
        session.flush()

        tt = TicketType(
            event_id=event.id,
            name="Limited",
            price=Decimal("100.00"),
            capacity=capacity,
            available=capacity,
            max_per_booking=capacity,  # allow buying all at once
        )
        session.add(tt)
        session.commit()

        return event, tt, admin

    def test_concurrent_bookings_no_overselling(self, app):
        """
        20 concurrent requests for a ticket with only 5 available.
        Final confirmed count must be exactly 5.
        """
        CAPACITY = 5
        NUM_REQUESTERS = 20

        with app.app_context():
            # Set up test data in a clean session
            event, tt, admin = self._make_test_data(_db.session, capacity=CAPACITY)
            tt_id = tt.id
            event_id = event.id

            # Create 20 customers
            customers = []
            for i in range(NUM_REQUESTERS):
                u = User(
                    name=f"Concurrent User {i}",
                    email=f"concuser{i}@test.com",
                    role="customer",
                )
                u.set_password("Pass1234!")
                _db.session.add(u)
            _db.session.commit()

            customers = User.query.filter(
                User.email.like("concuser%@test.com")
            ).all()

        # ── Thread worker ─────────────────────────────────────────────────────
        results = []  # (user_id, success: bool, error: str | None)
        lock = threading.Lock()

        def book(user_id: int) -> None:
            """Each thread runs in its own application context."""
            thread_app = self._make_app()
            with thread_app.app_context():
                from app.services.booking_service import create_booking, BookingError
                try:
                    booking = create_booking(
                        user_id=user_id,
                        items_data=[{"ticket_type_id": tt_id, "quantity": 1}],
                    )
                    with lock:
                        results.append((user_id, True, None))
                except BookingError as e:
                    with lock:
                        results.append((user_id, False, e.message))
                except Exception as e:
                    with lock:
                        results.append((user_id, False, str(e)))

        # ── Launch all threads simultaneously ─────────────────────────────────
        threads = [
            threading.Thread(target=book, args=(c.id,))
            for c in customers
        ]

        # Start all at once for maximum contention
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=30)  # 30s timeout per thread

        # ── Verify results ────────────────────────────────────────────────────
        with app.app_context():
            successful = [r for r in results if r[1]]
            failed = [r for r in results if not r[1]]

            print(f"\nConcurrency test results:")
            print(f"  Total requests: {NUM_REQUESTERS}")
            print(f"  Successful bookings: {len(successful)}")
            print(f"  Failed (expected): {len(failed)}")

            # CRITICAL ASSERTION 1: Total confirmed <= capacity
            assert len(successful) <= CAPACITY, (
                f"OVERSELLING DETECTED: {len(successful)} bookings confirmed "
                f"but only {CAPACITY} tickets available!"
            )

            # CRITICAL ASSERTION 2: Total confirmed == capacity (all tickets sold)
            assert len(successful) == CAPACITY, (
                f"Expected exactly {CAPACITY} successful bookings, got {len(successful)}"
            )

            # CRITICAL ASSERTION 3: DB state is consistent
            tt_db = TicketType.query.get(tt_id)
            assert tt_db.available == 0, (
                f"Expected available=0 after all tickets sold, got {tt_db.available}"
            )
            assert tt_db.available >= 0, "NEGATIVE INVENTORY DETECTED!"

            # CRITICAL ASSERTION 4: Confirmed booking quantities sum correctly
            confirmed_items = (
                _db.session.query(BookingItem)
                .join(Booking, BookingItem.booking_id == Booking.id)
                .filter(
                    BookingItem.ticket_type_id == tt_id,
                    Booking.status == BookingStatus.CONFIRMED,
                )
                .all()
            )
            total_confirmed_qty = sum(item.quantity for item in confirmed_items)
            assert total_confirmed_qty == CAPACITY, (
                f"Confirmed quantity ({total_confirmed_qty}) != capacity ({CAPACITY})"
            )

            # CRITICAL ASSERTION 5: available == capacity - confirmed
            assert tt_db.available == CAPACITY - total_confirmed_qty

            print(f"  DB available: {tt_db.available} (expected: 0)")
            print(f"  DB confirmed qty: {total_confirmed_qty} (expected: {CAPACITY})")
            print("  ✅ No overselling detected.")

    def test_concurrent_cancellation_no_double_restore(self, app):
        """
        Two concurrent cancellation requests for the same booking.
        Inventory must be restored exactly once, not twice.
        """
        CAPACITY = 3

        with app.app_context():
            event, tt, admin = self._make_test_data(_db.session, capacity=CAPACITY)
            tt_id = tt.id

            customer = User(
                name="Cancel Test User", email="canceluser@test.com", role="customer"
            )
            customer.set_password("Pass1234!")
            _db.session.add(customer)
            _db.session.commit()

            # Create a confirmed booking (use 2 tickets)
            from app.services.booking_service import create_booking
            booking = create_booking(
                user_id=customer.id,
                items_data=[{"ticket_type_id": tt_id, "quantity": 2}],
            )
            booking_id = booking.id
            user_id = customer.id

        # ── Two concurrent cancel requests ────────────────────────────────────
        cancel_results = []
        lock = threading.Lock()

        def cancel(thread_id: int) -> None:
            thread_app = self._make_app()
            with thread_app.app_context():
                from app.services.booking_service import cancel_booking, BookingError
                try:
                    cancel_booking(booking_id=booking_id, user_id=user_id)
                    with lock:
                        cancel_results.append((thread_id, True, None))
                except BookingError as e:
                    with lock:
                        cancel_results.append((thread_id, False, e.message))

        threads = [
            threading.Thread(target=cancel, args=(i,))
            for i in range(2)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=10)

        with app.app_context():
            successes = [r for r in cancel_results if r[1]]
            failures = [r for r in cancel_results if not r[1]]

            print(f"\nCancellation concurrency results:")
            print(f"  Successful cancellations: {len(successes)}")
            print(f"  Rejected (expected): {len(failures)}")

            # Exactly one cancellation must succeed
            assert len(successes) == 1, (
                f"Expected exactly 1 successful cancellation, got {len(successes)}"
            )
            assert len(failures) == 1, (
                f"Expected exactly 1 failed cancellation, got {len(failures)}"
            )

            # Inventory: CAPACITY - 0 booked = full capacity (2 restored)
            tt_db = TicketType.query.get(tt_id)
            assert tt_db.available == CAPACITY, (
                f"Expected available={CAPACITY} after cancel, got {tt_db.available}. "
                "Inventory may have been double-restored!"
            )

            print(f"  DB available: {tt_db.available} (expected: {CAPACITY})")
            print("  ✅ No double inventory restoration detected.")


@pytest.mark.integration
class TestHealthAndMetrics:
    def test_health_endpoint(self, client):
        """Health endpoint returns 200 with DB check."""
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "healthy"
        assert data["checks"]["database"] == "ok"
        assert "uptime_seconds" in data

    def test_metrics_endpoint(self, client):
        """Metrics endpoint returns Prometheus-compatible text."""
        resp = client.get("/metrics")
        assert resp.status_code == 200
        assert "http_requests_total" in resp.data.decode()
