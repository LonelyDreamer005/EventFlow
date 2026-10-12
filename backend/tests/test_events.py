"""
EventFlow — Events API Tests

Tests event CRUD, status transitions, public/admin visibility,
ticket type management, and validation.
"""

import pytest
from datetime import datetime, timedelta, timezone


def _future_dates():
    start = datetime.now(timezone.utc) + timedelta(days=30)
    end = start + timedelta(hours=3)
    return start.isoformat(), end.isoformat()


@pytest.mark.integration
class TestPublicEventAccess:
    def test_list_events_public(self, client, published_event):
        """Public users can see published events."""
        resp = client.get("/api/v1/events")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["total"] >= 1
        titles = [e["title"] for e in data["events"]]
        assert published_event.title in titles

    def test_list_events_excludes_draft(self, client, draft_event):
        """Draft events are not visible to public."""
        resp = client.get("/api/v1/events")
        assert resp.status_code == 200
        titles = [e["title"] for e in resp.get_json()["events"]]
        assert draft_event.title not in titles

    def test_list_events_excludes_cancelled(self, client, cancelled_event):
        """Cancelled events are not visible to public."""
        resp = client.get("/api/v1/events")
        assert resp.status_code == 200
        titles = [e["title"] for e in resp.get_json()["events"]]
        assert cancelled_event.title not in titles

    def test_get_published_event(self, client, published_event):
        """Public users can fetch a published event by ID."""
        resp = client.get(f"/api/v1/events/{published_event.id}")
        assert resp.status_code == 200
        assert resp.get_json()["event"]["id"] == published_event.id

    def test_get_draft_event_returns_404(self, client, draft_event):
        """Public users cannot access draft events (returns 404)."""
        resp = client.get(f"/api/v1/events/{draft_event.id}")
        assert resp.status_code == 404

    def test_get_nonexistent_event(self, client):
        """Nonexistent event returns 404."""
        resp = client.get("/api/v1/events/99999")
        assert resp.status_code == 404

    def test_list_events_search(self, client, published_event):
        """Search by title filters results."""
        resp = client.get(f"/api/v1/events?search={published_event.title[:5]}")
        assert resp.status_code == 200
        titles = [e["title"] for e in resp.get_json()["events"]]
        assert published_event.title in titles

    def test_list_events_pagination(self, client, published_event):
        """Pagination metadata is returned."""
        resp = client.get("/api/v1/events?page=1&per_page=5")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "page" in data
        assert "pages" in data
        assert "has_next" in data


@pytest.mark.integration
class TestAdminEventManagement:
    def test_admin_sees_all_events(self, client, admin_token, draft_event):
        """Admin can see draft and cancelled events."""
        resp = client.get(
            "/api/v1/events",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        titles = [e["title"] for e in resp.get_json()["events"]]
        assert draft_event.title in titles

    def test_create_event_admin(self, client, admin_token):
        """Admin can create a new event."""
        start, end = _future_dates()
        resp = client.post(
            "/api/v1/events",
            json={
                "title": "New Admin Event",
                "description": "A brand new event created by admin for testing.",
                "venue": "Admin Test Venue",
                "start_at": start,
                "end_at": end,
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["event"]["title"] == "New Admin Event"
        assert data["event"]["status"] == "draft"  # New events start as DRAFT

    def test_create_event_customer_forbidden(self, client, customer_token):
        """Customer cannot create events — 403."""
        start, end = _future_dates()
        resp = client.post(
            "/api/v1/events",
            json={
                "title": "Unauthorized Event",
                "description": "This should fail because customers cannot create events.",
                "venue": "Somewhere",
                "start_at": start,
                "end_at": end,
            },
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert resp.status_code == 403

    def test_create_event_unauthenticated(self, client):
        """Unauthenticated user cannot create events — 401."""
        start, end = _future_dates()
        resp = client.post(
            "/api/v1/events",
            json={
                "title": "Unauthorized Event",
                "description": "This should fail.",
                "venue": "Somewhere",
                "start_at": start,
                "end_at": end,
            },
        )
        assert resp.status_code == 401

    def test_create_event_end_before_start(self, client, admin_token):
        """Event with end_at before start_at returns 422."""
        now = datetime.now(timezone.utc)
        resp = client.post(
            "/api/v1/events",
            json={
                "title": "Invalid Event",
                "description": "End is before start — should fail validation.",
                "venue": "Nowhere",
                "start_at": (now + timedelta(days=5)).isoformat(),
                "end_at": (now + timedelta(days=3)).isoformat(),
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 422

    def test_publish_event(self, client, admin_token, draft_event):
        """Admin can publish a draft event."""
        resp = client.patch(
            f"/api/v1/events/{draft_event.id}",
            json={"status": "published"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["event"]["status"] == "published"

    def test_cancel_event(self, client, admin_token, published_event):
        """Admin can cancel a published event."""
        resp = client.post(
            f"/api/v1/events/{published_event.id}/cancel",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["event"]["status"] == "cancelled"

    def test_cancel_already_cancelled(self, client, admin_token, cancelled_event):
        """Cancelling an already-cancelled event returns 409."""
        resp = client.post(
            f"/api/v1/events/{cancelled_event.id}/cancel",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 409

    def test_invalid_status_transition(self, client, admin_token, draft_event):
        """DRAFT → CANCELLED is not an allowed transition."""
        resp = client.patch(
            f"/api/v1/events/{draft_event.id}",
            json={"status": "cancelled"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 422


@pytest.mark.integration
class TestTicketTypes:
    def test_create_ticket_type(self, client, admin_token, published_event):
        """Admin can add a ticket type to an event."""
        resp = client.post(
            f"/api/v1/events/{published_event.id}/ticket-types",
            json={"name": "Standard", "price": "75.00", "capacity": 100},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 201
        tt = resp.get_json()["ticket_type"]
        assert tt["name"] == "Standard"
        assert tt["capacity"] == 100
        assert tt["available"] == 100  # starts fully available
        assert tt["price"] == "75.00"

    def test_create_ticket_type_duplicate_name(
        self, client, admin_token, published_event, ticket_type_regular
    ):
        """Duplicate ticket type name for same event returns 409."""
        resp = client.post(
            f"/api/v1/events/{published_event.id}/ticket-types",
            json={"name": "Regular", "price": "50.00", "capacity": 50},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 409

    def test_create_ticket_type_negative_price(self, client, admin_token, published_event):
        """Negative price returns 422."""
        resp = client.post(
            f"/api/v1/events/{published_event.id}/ticket-types",
            json={"name": "Cheap", "price": "-10.00", "capacity": 50},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 422

    def test_list_ticket_types_public(self, client, published_event, ticket_type_regular):
        """Public can list ticket types for a published event."""
        resp = client.get(f"/api/v1/events/{published_event.id}/ticket-types")
        assert resp.status_code == 200
        names = [tt["name"] for tt in resp.get_json()["ticket_types"]]
        assert "Regular" in names

    def test_update_ticket_type(self, client, admin_token, ticket_type_regular):
        """Admin can update ticket type price."""
        resp = client.patch(
            f"/api/v1/ticket-types/{ticket_type_regular.id}",
            json={"price": "60.00"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.get_json()["ticket_type"]["price"] == "60.00"

    def test_reduce_capacity_below_sold_fails(
        self, client, admin_token, ticket_type_regular, customer_token, db
    ):
        """Cannot reduce capacity below the number already sold."""
        # First, sell some tickets by booking
        resp = client.post(
            "/api/v1/bookings",
            json={"items": [{"ticket_type_id": ticket_type_regular.id, "quantity": 3}]},
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert resp.status_code == 201

        # Now try to reduce capacity to 2 (fewer than 3 sold)
        resp = client.patch(
            f"/api/v1/ticket-types/{ticket_type_regular.id}",
            json={"capacity": 2},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 422
        assert "sold" in resp.get_json()["error"].lower()
