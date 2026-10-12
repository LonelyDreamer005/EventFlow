"""
EventFlow — Ticket Types API
Routes: /api/v1/events/<id>/ticket-types and /api/v1/ticket-types/<id>
"""

from datetime import datetime, timezone
from decimal import Decimal

from flask import Blueprint, jsonify, request
from marshmallow import ValidationError

from ..extensions import db
from ..models.event import Event, EventStatus
from ..models.ticket_type import TicketType
from ..schemas.ticket_type import TicketTypeCreateSchema, TicketTypeUpdateSchema
from ..auth.decorators import admin_required

ticket_types_bp = Blueprint("ticket_types", __name__)

_create_schema = TicketTypeCreateSchema()
_update_schema = TicketTypeUpdateSchema()


@ticket_types_bp.get("/events/<int:event_id>/ticket-types")
def list_ticket_types(event_id: int):
    """
    List ticket types for an event.

    Public: only works for published events.
    Admin: works for all events.

    Returns:
        200: { ticket_types: [...] }
        404: Event not found
    """
    from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
    from ..models.user import User

    is_admin = False
    try:
        verify_jwt_in_request(optional=True)
        uid = get_jwt_identity()
        if uid:
            u = User.query.get(uid)
            is_admin = u is not None and u.is_admin
    except Exception:
        pass

    event = Event.query.get_or_404(event_id, description="Event not found.")

    if not is_admin and event.status != EventStatus.PUBLISHED.value:
        return jsonify({"error": "Event not found."}), 404

    ticket_types = TicketType.query.filter_by(event_id=event_id).all()
    return jsonify({"ticket_types": [tt.to_dict() for tt in ticket_types]}), 200


@ticket_types_bp.post("/events/<int:event_id>/ticket-types")
@admin_required
def create_ticket_type(event_id: int):
    """
    Add a ticket type to an event (admin only).

    Cannot add ticket types to a CANCELLED event.

    Request body:
        { name, price, capacity, max_per_booking? }

    Returns:
        201: { ticket_type: {...} }
        404: Event not found
        409: Duplicate ticket type name for this event
        422: Validation error
    """
    event = Event.query.get_or_404(event_id, description="Event not found.")

    if event.status == EventStatus.CANCELLED.value:
        return jsonify({"error": "Cannot add ticket types to a cancelled event."}), 422

    try:
        data = _create_schema.load(request.get_json(silent=True) or {})
    except ValidationError as e:
        return jsonify({"error": "Validation failed.", "details": e.messages}), 422

    # Check for duplicate name within this event
    existing = TicketType.query.filter_by(
        event_id=event_id, name=data["name"]
    ).first()
    if existing:
        return jsonify(
            {"error": f"A ticket type named '{data['name']}' already exists for this event."}
        ), 409

    tt = TicketType(
        event_id=event_id,
        name=data["name"],
        price=Decimal(str(data["price"])),
        capacity=data["capacity"],
        available=data["capacity"],  # starts fully available
        max_per_booking=data.get("max_per_booking", 10),
    )
    db.session.add(tt)
    db.session.commit()

    return jsonify({"ticket_type": tt.to_dict()}), 201


@ticket_types_bp.patch("/ticket-types/<int:tt_id>")
@admin_required
def update_ticket_type(tt_id: int):
    """
    Update a ticket type (admin only).

    Capacity can be increased but not reduced below current sold quantity.

    Returns:
        200: { ticket_type: {...} }
        404: Ticket type not found
        422: Validation error or invalid capacity reduction
    """
    tt = TicketType.query.get_or_404(tt_id, description="Ticket type not found.")

    try:
        data = _update_schema.load(request.get_json(silent=True) or {})
    except ValidationError as e:
        return jsonify({"error": "Validation failed.", "details": e.messages}), 422

    if not data:
        return jsonify({"error": "No fields provided to update."}), 422

    # Validate capacity change
    new_capacity = data.get("capacity")
    if new_capacity is not None:
        sold = tt.sold
        if new_capacity < sold:
            return jsonify(
                {
                    "error": f"Cannot reduce capacity to {new_capacity}. "
                    f"{sold} tickets have already been sold."
                }
            ), 422
        # Adjust available by the capacity delta
        delta = new_capacity - tt.capacity
        tt.capacity = new_capacity
        tt.available = max(0, tt.available + delta)

    if "name" in data:
        tt.name = data["name"]
    if "price" in data:
        tt.price = Decimal(str(data["price"]))
    if "max_per_booking" in data:
        tt.max_per_booking = data["max_per_booking"]

    tt.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({"ticket_type": tt.to_dict()}), 200
