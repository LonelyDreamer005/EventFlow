"""
EventFlow — Booking Tests

Tests booking creation, validation, inventory deduction, cancellation,
ownership privacy, and the critical double-cancellation prevention.
"""

import pytest
from decimal import Decimal


@pytest.mark.integration
class TestBookingCreation:
    def test_book_tickets_success(
        self, client, customer_token, ticket_type_regular
    ):
        """Customer can book available tickets."""
        resp = client.post(
            "/api/v1/bookings",
            json={"items": [{"ticket_type_id": ticket_type_regular.id, "quantity": 2}]},
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["booking"]["status"] == "confirmed"
        assert data["booking"]["reference"].startswith("EF-")
        assert len(data["booking"]["items"]) == 1
        assert data["booking"]["items"][0]["quantity"] == 2
        assert Decimal(data["booking"]["total_amount"]) == Decimal("100.00")

    def test_booking_decrements_inventory(
        self, client, customer_token, ticket_type_regular, db
    ):
        """After booking, available count decreases."""
        initial_available = ticket_type_regular.available  # 10

        resp = client.post(
            "/api/v1/bookings",
            json={"items": [{"ticket_type_id": ticket_type_regular.id, "quantity": 3}]},
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert resp.status_code == 201

        db.session.refresh(ticket_type_regular)
        assert ticket_type_regular.available == initial_available - 3

    def test_booking_freezes_price(
        self, client, customer_token, admin_token, ticket_type_regular, db
    ):
        """
        Booking item stores price at booking time.
        Later price changes must NOT alter booking history.
        """
        resp = client.post(
            "/api/v1/bookings",
            json={"items": [{"ticket_type_id": ticket_type_regular.id, "quantity": 1}]},
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert resp.status_code == 201
        original_price = resp.get_json()["booking"]["items"][0]["unit_price"]

        # Admin changes the price
        client.patch(
            f"/api/v1/ticket-types/{ticket_type_regular.id}",
            json={"price": "999.00"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        # Re-fetch the booking — price must still be original
        booking_id = resp.get_json()["booking"]["id"]
        resp2 = client.get(
            f"/api/v1/bookings/{booking_id}",
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert resp2.status_code == 200
        assert resp2.get_json()["booking"]["items"][0]["unit_price"] == original_price

    def test_book_unauthenticated(self, client, ticket_type_regular):
        """Unauthenticated users cannot book — 401."""
        resp = client.post(
            "/api/v1/bookings",
            json={"items": [{"ticket_type_id": ticket_type_regular.id, "quantity": 1}]},
        )
        assert resp.status_code == 401

    def test_book_insufficient_inventory(
        self, client, customer_token, ticket_type_vip, db
    ):
        """Cannot book more tickets than available — 409."""
        ticket_type_vip.available = 1
        db.session.commit()
        resp = client.post(
            "/api/v1/bookings",
            json={"items": [{"ticket_type_id": ticket_type_vip.id, "quantity": 2}]},
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert resp.status_code == 409
        assert "insufficient" in resp.get_json()["error"].lower()

    def test_book_cancelled_event(
        self, client, customer_token, db, admin_user
    ):
        """Cannot book tickets for a cancelled event."""
        from app.models.event import Event, EventStatus
        from app.models.ticket_type import TicketType
        from datetime import datetime, timedelta, timezone

        event = Event(
            title="Cancelled Event Test",
            description="Used to test that cancelled events reject bookings.",
            venue="Test Venue",
            start_at=datetime.now(timezone.utc) + timedelta(days=10),
            end_at=datetime.now(timezone.utc) + timedelta(days=10, hours=2),
            status=EventStatus.CANCELLED.value,
            created_by=admin_user.id,
        )
        db.session.add(event)
        db.session.flush()

        tt = TicketType(
            event_id=event.id,
            name="Regular",
            price=Decimal("50.00"),
            capacity=100,
            available=100,
        )
        db.session.add(tt)
        db.session.flush()

        resp = client.post(
            "/api/v1/bookings",
            json={"items": [{"ticket_type_id": tt.id, "quantity": 1}]},
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert resp.status_code == 409

    def test_book_exceeds_max_per_booking(
        self, client, customer_token, ticket_type_vip
    ):
        """Cannot exceed max_per_booking limit for a single ticket type."""
        # VIP has max_per_booking=2, capacity=3
        resp = client.post(
            "/api/v1/bookings",
            json={"items": [{"ticket_type_id": ticket_type_vip.id, "quantity": 3}]},
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert resp.status_code == 400
        assert "maximum" in resp.get_json()["error"].lower()

    def test_book_nonexistent_ticket_type(self, client, customer_token):
        """Booking a nonexistent ticket type returns 404."""
        resp = client.post(
            "/api/v1/bookings",
            json={"items": [{"ticket_type_id": 99999, "quantity": 1}]},
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert resp.status_code == 404


@pytest.mark.integration
class TestBookingHistory:
    def test_list_own_bookings(
        self, client, customer_token, ticket_type_regular
    ):
        """Customer can list their own bookings."""
        # Create a booking
        client.post(
            "/api/v1/bookings",
            json={"items": [{"ticket_type_id": ticket_type_regular.id, "quantity": 1}]},
            headers={"Authorization": f"Bearer {customer_token}"},
        )

        resp = client.get(
            "/api/v1/bookings",
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["total"] >= 1

    def test_customer_cannot_see_other_users_bookings(
        self, client, customer_token, ticket_type_regular, db, admin_user
    ):
        """
        A customer cannot access another user's booking by ID.
        The response must be 404 (not 403) to prevent booking ID enumeration.
        """
        from app.models.user import User
        from app.models.booking import Booking

        # Create a second customer
        other_user = User(
            name="Other Customer", email="other@test.com", role="customer"
        )
        other_user.set_password("OtherPass123")
        db.session.add(other_user)
        db.session.flush()

        # Book using the second customer directly via service
        from app.services.booking_service import create_booking

        booking = create_booking(
            user_id=other_user.id,
            items_data=[{"ticket_type_id": ticket_type_regular.id, "quantity": 1}],
        )

        # First customer tries to access other's booking
        resp = client.get(
            f"/api/v1/bookings/{booking.id}",
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert resp.status_code == 404

    def test_admin_can_see_all_bookings(
        self, client, admin_token, customer_token, ticket_type_regular
    ):
        """Admin can list all bookings across users."""
        # Customer makes a booking
        client.post(
            "/api/v1/bookings",
            json={"items": [{"ticket_type_id": ticket_type_regular.id, "quantity": 1}]},
            headers={"Authorization": f"Bearer {customer_token}"},
        )

        resp = client.get(
            "/api/v1/bookings",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["total"] >= 1


@pytest.mark.integration
class TestBookingCancellation:
    def test_cancel_booking_success(
        self, client, customer_token, ticket_type_regular, db
    ):
        """Customer can cancel their own confirmed booking."""
        initial_available = ticket_type_regular.available

        book_resp = client.post(
            "/api/v1/bookings",
            json={"items": [{"ticket_type_id": ticket_type_regular.id, "quantity": 2}]},
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert book_resp.status_code == 201
        booking_id = book_resp.get_json()["booking"]["id"]

        # Verify inventory was decremented
        db.session.refresh(ticket_type_regular)
        assert ticket_type_regular.available == initial_available - 2

        # Cancel the booking
        cancel_resp = client.post(
            f"/api/v1/bookings/{booking_id}/cancel",
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert cancel_resp.status_code == 200
        assert cancel_resp.get_json()["booking"]["status"] == "cancelled"

        # Verify inventory was restored
        db.session.refresh(ticket_type_regular)
        assert ticket_type_regular.available == initial_available

    def test_cancel_already_cancelled(
        self, client, customer_token, ticket_type_regular, db
    ):
        """
        Cancelling a booking that is already cancelled must return 409.
        Critically, inventory must NOT be restored a second time.
        """
        initial_available = ticket_type_regular.available

        # Book
        book_resp = client.post(
            "/api/v1/bookings",
            json={"items": [{"ticket_type_id": ticket_type_regular.id, "quantity": 2}]},
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        booking_id = book_resp.get_json()["booking"]["id"]

        # First cancel
        resp1 = client.post(
            f"/api/v1/bookings/{booking_id}/cancel",
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert resp1.status_code == 200

        # Second cancel — must be rejected
        resp2 = client.post(
            f"/api/v1/bookings/{booking_id}/cancel",
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert resp2.status_code == 409

        # Inventory must be the same as initial (not over-restored)
        db.session.refresh(ticket_type_regular)
        assert ticket_type_regular.available == initial_available

    def test_cancel_another_users_booking_returns_404(
        self, client, customer_token, ticket_type_regular, db, admin_user
    ):
        """A customer cannot cancel another user's booking."""
        from app.models.user import User
        from app.services.booking_service import create_booking

        other = User(name="Other", email="other2@test.com", role="customer")
        other.set_password("Pass1234!")
        db.session.add(other)
        db.session.flush()

        booking = create_booking(
            user_id=other.id,
            items_data=[{"ticket_type_id": ticket_type_regular.id, "quantity": 1}],
        )

        resp = client.post(
            f"/api/v1/bookings/{booking.id}/cancel",
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert resp.status_code == 404
