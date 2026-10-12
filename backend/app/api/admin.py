"""
EventFlow — Admin Dashboard API
Routes: /api/v1/admin/*
"""

from flask import Blueprint, jsonify, request

from ..auth.decorators import admin_required
from ..extensions import db
from ..models.booking import Booking, BookingStatus
from ..models.event import Event, EventStatus
from ..models.ticket_type import TicketType
from ..models.user import User

admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/dashboard")
@admin_required
def dashboard():
    """
    Admin dashboard summary statistics.

    All numbers are calculated from the live database.
    Cancelled bookings are EXCLUDED from tickets_sold and revenue totals
    (they represent restored inventory, not realized sales).

    Returns:
        200: { stats: {...}, recent_bookings: [...] }
    """
    from sqlalchemy import func

    # ── Event counts ──────────────────────────────────────────────────────────
    total_events = Event.query.count()
    published_events = Event.query.filter_by(
        status=EventStatus.PUBLISHED.value
    ).count()
    cancelled_events = Event.query.filter_by(
        status=EventStatus.CANCELLED.value
    ).count()

    # ── Booking counts (CONFIRMED only) ───────────────────────────────────────
    confirmed_bookings = Booking.query.filter_by(
        status=BookingStatus.CONFIRMED
    ).count()
    total_bookings = Booking.query.count()

    # ── Tickets sold & revenue (CONFIRMED bookings only) ─────────────────────
    from ..models.booking_item import BookingItem

    sold_result = (
        db.session.query(func.sum(BookingItem.quantity))
        .join(Booking, BookingItem.booking_id == Booking.id)
        .filter(Booking.status == BookingStatus.CONFIRMED)
        .scalar()
    )
    tickets_sold = int(sold_result or 0)

    revenue_result = (
        db.session.query(func.sum(Booking.total_amount))
        .filter(Booking.status == BookingStatus.CONFIRMED)
        .scalar()
    )
    total_revenue = str(revenue_result or "0.00")

    # ── Total remaining inventory ─────────────────────────────────────────────
    inventory_result = (
        db.session.query(func.sum(TicketType.available))
        .join(Event, TicketType.event_id == Event.id)
        .filter(Event.status == EventStatus.PUBLISHED.value)
        .scalar()
    )
    tickets_available = int(inventory_result or 0)

    # ── Total registered users ────────────────────────────────────────────────
    total_users = User.query.filter_by(role="customer").count()

    # ── Bookings per event (top 10) ───────────────────────────────────────────
    from ..models.booking_item import BookingItem

    bookings_by_event = (
        db.session.query(
            Event.id,
            Event.title,
            func.count(Booking.id).label("booking_count"),
            func.sum(BookingItem.quantity).label("tickets_sold"),
        )
        .join(TicketType, TicketType.event_id == Event.id)
        .join(BookingItem, BookingItem.ticket_type_id == TicketType.id)
        .join(Booking, BookingItem.booking_id == Booking.id)
        .filter(Booking.status == BookingStatus.CONFIRMED)
        .group_by(Event.id, Event.title)
        .order_by(func.count(Booking.id).desc())
        .limit(10)
        .all()
    )

    # ── Recent bookings (last 10) ─────────────────────────────────────────────
    recent_bookings = (
        Booking.query.order_by(Booking.created_at.desc()).limit(10).all()
    )

    return jsonify(
        {
            "stats": {
                "total_events": total_events,
                "published_events": published_events,
                "cancelled_events": cancelled_events,
                "total_users": total_users,
                "confirmed_bookings": confirmed_bookings,
                "total_bookings": total_bookings,
                "tickets_sold": tickets_sold,
                "tickets_available": tickets_available,
                "total_revenue": total_revenue,
                "note": "Revenue and ticket counts include only CONFIRMED bookings.",
            },
            "bookings_by_event": [
                {
                    "event_id": row.id,
                    "event_title": row.title,
                    "booking_count": row.booking_count,
                    "tickets_sold": int(row.tickets_sold or 0),
                }
                for row in bookings_by_event
            ],
            "recent_bookings": [
                b.to_dict(include_items=False, include_user=True)
                for b in recent_bookings
            ],
        }
    ), 200


@admin_bp.get("/users")
@admin_required
def list_users():
    """List all registered users (admin only)."""
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    role_filter = request.args.get("role", "").strip()

    query = User.query
    if role_filter in ["customer", "admin"]:
        query = query.filter(User.role == role_filter)

    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify(
        {
            "users": [u.to_dict() for u in pagination.items],
            "total": pagination.total,
            "page": pagination.page,
            "per_page": pagination.per_page,
            "pages": pagination.pages,
        }
    ), 200
