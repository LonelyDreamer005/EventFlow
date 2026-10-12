"""
EventFlow — Events API
Routes: /api/v1/events/*
"""

from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from marshmallow import ValidationError

from ..extensions import db
from ..models.event import Event, EventStatus
from ..models.user import User
from ..schemas.event import EventCreateSchema, EventUpdateSchema
from ..auth.decorators import admin_required

events_bp = Blueprint("events", __name__)

_create_schema = EventCreateSchema()
_update_schema = EventUpdateSchema()


def _paginate_query(query, page: int, per_page: int) -> dict:
    """Helper to paginate a SQLAlchemy query and return metadata."""
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        "items": pagination.items,
        "total": pagination.total,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "pages": pagination.pages,
        "has_next": pagination.has_next,
        "has_prev": pagination.has_prev,
    }


@events_bp.get("")
def list_events():
    """
    List events.

    Customers/public: only PUBLISHED events.
    Admins: all events.

    Query params:
        page (int, default=1)
        per_page (int, default=20, max=100)
        status (str, admin only): filter by status
        search (str): search in title or venue

    Returns:
        200: { events: [...], total, page, per_page, pages }
    """
    # Determine if caller is an admin
    is_admin = False
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            user = User.query.get(user_id)
            is_admin = user is not None and user.is_admin
    except Exception:
        pass

    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search", "").strip()
    status_filter = request.args.get("status", "").strip()

    query = Event.query

    if is_admin:
        if status_filter and status_filter in [s.value for s in EventStatus]:
            query = query.filter(Event.status == status_filter)
    else:
        # Public/customer: only see published events
        query = query.filter(Event.status == EventStatus.PUBLISHED.value)

    if search:
        query = query.filter(
            db.or_(
                Event.title.ilike(f"%{search}%"),
                Event.venue.ilike(f"%{search}%"),
            )
        )

    query = query.order_by(Event.start_at.asc())
    result = _paginate_query(query, page, per_page)

    return jsonify(
        {
            "events": [e.to_dict(include_tickets=False) for e in result["items"]],
            "total": result["total"],
            "page": result["page"],
            "per_page": result["per_page"],
            "pages": result["pages"],
            "has_next": result["has_next"],
            "has_prev": result["has_prev"],
        }
    ), 200


@events_bp.get("/<int:event_id>")
def get_event(event_id: int):
    """
    Get a single event with its ticket types.

    Public: only published events.
    Admin: any event.

    Returns:
        200: { event: {..., ticket_types: [...]} }
        404: Event not found
    """
    is_admin = False
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            user = User.query.get(user_id)
            is_admin = user is not None and user.is_admin
    except Exception:
        pass

    event = Event.query.get_or_404(event_id, description="Event not found.")

    if not is_admin and event.status != EventStatus.PUBLISHED.value:
        return jsonify({"error": "Event not found."}), 404

    return jsonify({"event": event.to_dict(include_tickets=True)}), 200


@events_bp.post("")
@admin_required
def create_event():
    """
    Create a new event (admin only).

    Request body:
        { title, description, venue, start_at, end_at }

    Returns:
        201: { event: {...} }
        422: Validation error
    """
    try:
        data = _create_schema.load(request.get_json(silent=True) or {})
    except ValidationError as e:
        return jsonify({"error": "Validation failed.", "details": e.messages}), 422

    from flask_jwt_extended import get_jwt_identity
    user_id = get_jwt_identity()

    event = Event(
        title=data["title"],
        description=data["description"],
        venue=data["venue"],
        start_at=data["start_at"],
        end_at=data["end_at"],
        status=EventStatus.DRAFT.value,
        created_by=user_id,
    )
    db.session.add(event)
    db.session.commit()

    return jsonify({"event": event.to_dict(include_tickets=True)}), 201


@events_bp.patch("/<int:event_id>")
@admin_required
def update_event(event_id: int):
    """
    Update event details or status (admin only).

    Allowed status transitions:
        draft → published
        published → cancelled
        cancelled → draft  (for correction)

    Returns:
        200: { event: {...} }
        404: Event not found
        422: Validation error or invalid status transition
    """
    event = Event.query.get_or_404(event_id, description="Event not found.")

    try:
        data = _update_schema.load(request.get_json(silent=True) or {})
    except ValidationError as e:
        return jsonify({"error": "Validation failed.", "details": e.messages}), 422

    if not data:
        return jsonify({"error": "No fields provided to update."}), 422

    # Validate status transitions
    new_status = data.get("status")
    if new_status and new_status != event.status:
        allowed_transitions = {
            EventStatus.DRAFT.value: [EventStatus.PUBLISHED.value],
            EventStatus.PUBLISHED.value: [EventStatus.CANCELLED.value, EventStatus.DRAFT.value],
            EventStatus.CANCELLED.value: [EventStatus.DRAFT.value],
        }
        allowed = allowed_transitions.get(event.status, [])
        if new_status not in allowed:
            return jsonify(
                {
                    "error": f"Invalid status transition from '{event.status}' to '{new_status}'. "
                    f"Allowed: {allowed}"
                }
            ), 422

    # Apply updates
    for field in ["title", "description", "venue", "start_at", "end_at", "status"]:
        if field in data:
            setattr(event, field, data[field])

    event.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({"event": event.to_dict(include_tickets=True)}), 200


@events_bp.post("/<int:event_id>/cancel")
@admin_required
def cancel_event(event_id: int):
    """
    Cancel an event (admin only).
    Shortcut for PATCH status=cancelled.

    Returns:
        200: { event: {...}, message: str }
        404: Event not found
        409: Already cancelled
    """
    event = Event.query.get_or_404(event_id, description="Event not found.")

    if event.status == EventStatus.CANCELLED.value:
        return jsonify({"error": "Event is already cancelled."}), 409

    event.status = EventStatus.CANCELLED.value
    event.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify(
        {"event": event.to_dict(), "message": "Event cancelled successfully."}
    ), 200
