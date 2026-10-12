"""
EventFlow — Bookings API
Routes: /api/v1/bookings/*
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError

from ..auth.decorators import admin_required, get_current_user
from ..extensions import db
from ..models.booking import Booking, BookingStatus
from ..schemas.booking import BookingCreateSchema
from ..services.booking_service import (
    AlreadyCancelledError,
    BookingError,
    BookingOwnershipError,
    cancel_booking,
    create_booking,
)

bookings_bp = Blueprint("bookings", __name__)

_create_schema = BookingCreateSchema()


@bookings_bp.post("")
@jwt_required()
def book_tickets():
    """
    Create a new booking for the authenticated customer.

    ⚠️  SIMULATED PAYMENT: No real payment is processed.
    The booking is confirmed immediately upon successful inventory reservation.

    Request body:
        {
            "items": [
                { "ticket_type_id": int, "quantity": int },
                ...
            ]
        }

    Returns:
        201: { booking: {...} }
        400: Quantity/validation error
        409: Insufficient inventory or event not bookable
        422: Schema validation error
    """
    user_id = int(get_jwt_identity())

    try:
        data = _create_schema.load(request.get_json(silent=True) or {})
    except ValidationError as e:
        return jsonify({"error": "Validation failed.", "details": e.messages}), 422

    try:
        booking = create_booking(user_id=user_id, items_data=data["items"])
    except BookingError as e:
        return jsonify({"error": e.message}), e.status_code

    return jsonify(
        {
            "booking": booking.to_dict(include_items=True),
            "message": "⚠️ Simulated booking confirmed. No real payment has been processed.",
        }
    ), 201


@bookings_bp.get("")
@jwt_required()
def list_bookings():
    """
    List bookings.

    Customers: their own bookings only.
    Admins: all bookings with optional user_id filter.

    Query params:
        page (int, default=1)
        per_page (int, default=20)
        status (str): filter by confirmed|cancelled

    Returns:
        200: { bookings: [...], total, page, ... }
    """
    user = get_current_user()
    if user is None:
        return jsonify({"error": "User not found."}), 401

    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    status_filter = request.args.get("status", "").strip()

    query = Booking.query

    if user.is_admin:
        # Admins can filter by user_id
        filter_user_id = request.args.get("user_id", type=int)
        if filter_user_id:
            query = query.filter(Booking.user_id == filter_user_id)
    else:
        # Customers only see their own bookings
        query = query.filter(Booking.user_id == user.id)

    if status_filter in [BookingStatus.CONFIRMED, BookingStatus.CANCELLED]:
        query = query.filter(Booking.status == status_filter)

    query = query.order_by(Booking.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    include_user = user.is_admin

    return jsonify(
        {
            "bookings": [
                b.to_dict(include_items=True, include_user=include_user)
                for b in pagination.items
            ],
            "total": pagination.total,
            "page": pagination.page,
            "per_page": pagination.per_page,
            "pages": pagination.pages,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev,
        }
    ), 200


@bookings_bp.get("/<int:booking_id>")
@jwt_required()
def get_booking(booking_id: int):
    """
    Get a single booking.

    Customers: own bookings only.
    Admins: any booking.

    Returns:
        200: { booking: {...} }
        404: Booking not found or belongs to another user
    """
    user = get_current_user()
    if user is None:
        return jsonify({"error": "User not found."}), 401

    booking = Booking.query.get_or_404(booking_id, description="Booking not found.")

    if not user.is_admin and booking.user_id != user.id:
        # Return 404 (not 403) to prevent booking ID enumeration
        return jsonify({"error": "Booking not found."}), 404

    return jsonify(
        {"booking": booking.to_dict(include_items=True, include_user=user.is_admin)}
    ), 200


@bookings_bp.post("/<int:booking_id>/cancel")
@jwt_required()
def cancel_booking_route(booking_id: int):
    """
    Cancel a booking.

    Customers can only cancel their own bookings.
    Admins can cancel any booking.

    Returns:
        200: { booking: {...}, message: str }
        404: Booking not found
        409: Already cancelled
    """
    user = get_current_user()
    if user is None:
        return jsonify({"error": "User not found."}), 401

    try:
        booking = cancel_booking(
            booking_id=booking_id,
            user_id=user.id,
            is_admin=user.is_admin,
        )
    except BookingError as e:
        return jsonify({"error": e.message}), e.status_code

    return jsonify(
        {
            "booking": booking.to_dict(include_items=True),
            "message": "Booking cancelled successfully. Inventory has been restored.",
        }
    ), 200
