"""
EventFlow — Booking Service

This module contains the core transactional logic for creating and cancelling
bookings. It is the authoritative implementation of inventory safety.

CONCURRENCY MODEL
-----------------
When multiple customers simultaneously submit booking requests for the same
ticket type, we must ensure that the total confirmed tickets never exceed the
available inventory.

We use PostgreSQL's SELECT ... FOR UPDATE to acquire a row-level exclusive lock
on each TicketType row before reading its `available` count. This means:

1. Transaction A locks the TicketType row.
2. Transaction B tries to lock the same row — it WAITS.
3. Transaction A checks inventory, decrements, commits.
4. Transaction B acquires the lock, re-reads the updated count, proceeds.

This prevents TOCTOU (time-of-check/time-of-use) race conditions that would
allow overselling. It is NOT appropriate for extremely high throughput
(use a message queue for that), but it is correct and verifiable in tests.

CANCELLATION MODEL
------------------
Cancellation checks:
1. The booking belongs to the requesting user.
2. The booking status is CONFIRMED (not already CANCELLED).

Both checks happen within the same transaction that updates status and restores
inventory, preventing:
- Double cancellation (inventory restored twice).
- Cancellation of another user's booking.
- Inventory restoration for already-cancelled bookings.
"""

from decimal import Decimal

from flask import current_app
from sqlalchemy.exc import SQLAlchemyError

from ..extensions import db
from ..metrics import BOOKING_CANCELLED, BOOKING_CREATED, BOOKING_FAILED_INVENTORY
from ..models.booking import Booking, BookingStatus
from ..models.booking_item import BookingItem
from ..models.event import Event, EventStatus
from ..models.ticket_type import TicketType


class BookingError(Exception):
    """Base class for booking-related errors."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class InsufficientInventoryError(BookingError):
    """Raised when the requested quantity exceeds available inventory."""

    def __init__(self, ticket_type_name: str, requested: int, available: int):
        super().__init__(
            f"Insufficient availability for '{ticket_type_name}': "
            f"requested {requested}, only {available} available.",
            status_code=409,
        )


class EventNotBookableError(BookingError):
    """Raised when an event cannot accept new bookings."""

    def __init__(self, reason: str):
        super().__init__(f"Booking not allowed: {reason}", status_code=409)


class BookingOwnershipError(BookingError):
    """Raised when a user tries to access another user's booking."""

    def __init__(self):
        super().__init__("Booking not found.", status_code=404)


class AlreadyCancelledError(BookingError):
    """Raised when trying to cancel a booking that is already cancelled."""

    def __init__(self):
        super().__init__("This booking is already cancelled.", status_code=409)


def create_booking(user_id: int, items_data: list[dict]) -> Booking:
    """
    Create a confirmed booking with inventory-safe transaction.

    Algorithm:
    1. Begin transaction.
    2. For each requested ticket type:
       a. Lock the TicketType row with SELECT ... FOR UPDATE.
       b. Validate event is bookable.
       c. Validate quantity constraints.
       d. Check sufficient availability.
       e. Decrement available count.
    3. Create Booking record with CONFIRMED status.
    4. Create BookingItem records with price frozen at current TicketType.price.
    5. Commit. On any failure, the transaction rolls back automatically.

    Args:
        user_id: ID of the authenticated customer making the booking.
        items_data: List of { ticket_type_id: int, quantity: int }

    Returns:
        The committed Booking object with items loaded.

    Raises:
        BookingError subclasses: on business rule violations (inventory, status).
        SQLAlchemyError: on database errors (propagated for caller to handle).
    """
    total_amount = Decimal("0.00")
    booking_items_to_create = []

    try:
        with db.session.begin_nested():
            for item in items_data:
                tt_id = item["ticket_type_id"]
                quantity = item["quantity"]

                # ── Lock the TicketType row ───────────────────────────────────
                # SELECT ... FOR UPDATE prevents concurrent transactions from
                # reading stale availability counts.
                ticket_type: TicketType = (
                    db.session.query(TicketType)
                    .filter(TicketType.id == tt_id)
                    .with_for_update()
                    .first()
                )

                if ticket_type is None:
                    raise BookingError(
                        f"Ticket type ID {tt_id} not found.", status_code=404
                    )

                # ── Validate event is bookable ────────────────────────────────
                event: Event = ticket_type.event
                if event is None:
                    raise BookingError("Associated event not found.", status_code=404)

                if not event.is_bookable:
                    if event.status == EventStatus.CANCELLED.value:
                        raise EventNotBookableError("The event has been cancelled.")
                    elif event.status == EventStatus.DRAFT.value:
                        raise EventNotBookableError("The event is not yet published.")
                    else:
                        raise EventNotBookableError(
                            "Bookings are no longer available for this event "
                            "(it may have already started or ended)."
                        )

                # ── Validate quantity per-booking limit ───────────────────────
                if quantity > ticket_type.max_per_booking:
                    raise BookingError(
                        f"Maximum {ticket_type.max_per_booking} tickets per booking "
                        f"for '{ticket_type.name}'.",
                        status_code=400,
                    )

                # ── Check inventory availability ──────────────────────────────
                if ticket_type.available < quantity:
                    BOOKING_FAILED_INVENTORY.inc()
                    raise InsufficientInventoryError(
                        ticket_type_name=ticket_type.name,
                        requested=quantity,
                        available=ticket_type.available,
                    )

                # ── Decrement inventory ───────────────────────────────────────
                ticket_type.available -= quantity

                # ── Capture price at booking time ─────────────────────────────
                unit_price = Decimal(str(ticket_type.price))
                subtotal = unit_price * quantity
                total_amount += subtotal

                booking_items_to_create.append(
                    {
                        "ticket_type_id": tt_id,
                        "quantity": quantity,
                        "unit_price": unit_price,
                        "subtotal": subtotal,
                    }
                )

            # ── Create the Booking record ─────────────────────────────────────
            booking = Booking(
                user_id=user_id,
                status=BookingStatus.CONFIRMED,
                total_amount=total_amount,
            )
            db.session.add(booking)
            db.session.flush()  # assigns booking.id without committing

            # ── Create BookingItems ───────────────────────────────────────────
            for item_data in booking_items_to_create:
                bi = BookingItem(
                    booking_id=booking.id,
                    ticket_type_id=item_data["ticket_type_id"],
                    quantity=item_data["quantity"],
                    unit_price=item_data["unit_price"],
                    subtotal=item_data["subtotal"],
                )
                db.session.add(bi)

        # The outer session.begin_nested() savepoint is committed.
        # The caller's transaction (or the request context) will commit.
        db.session.commit()
        BOOKING_CREATED.inc()

        # Reload the booking with items eagerly
        db.session.refresh(booking)
        return booking

    except BookingError:
        db.session.rollback()
        raise
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception("Database error during booking creation: %s", e)
        raise BookingError(
            "A database error occurred. Please try again.", status_code=500
        ) from e


def cancel_booking(booking_id: int, user_id: int, is_admin: bool = False) -> Booking:
    """
    Cancel a booking and restore inventory — transactionally safe.

    Algorithm:
    1. Begin transaction.
    2. Lock the Booking row with SELECT ... FOR UPDATE.
    3. Validate ownership (unless admin).
    4. Validate booking is CONFIRMED (not already CANCELLED).
    5. For each BookingItem, lock and increment the TicketType.available.
    6. Set booking.status = CANCELLED.
    7. Commit.

    This prevents:
    - Double cancellation (status check happens within the lock).
    - Another user cancelling someone else's booking.
    - Inventory being restored twice.

    Args:
        booking_id: ID of the booking to cancel.
        user_id: ID of the requesting user.
        is_admin: If True, ownership check is skipped.

    Returns:
        The updated Booking object.

    Raises:
        BookingOwnershipError: if the booking belongs to another user.
        AlreadyCancelledError: if booking is already cancelled.
        BookingError: on other validation failures.
    """
    try:
        with db.session.begin_nested():
            # Lock the booking row
            booking: Booking = (
                db.session.query(Booking)
                .filter(Booking.id == booking_id)
                .with_for_update()
                .first()
            )

            if booking is None:
                raise BookingError("Booking not found.", status_code=404)

            # Ownership check
            if not is_admin and booking.user_id != user_id:
                raise BookingOwnershipError()

            # Status check — prevents double cancellation
            if booking.status == BookingStatus.CANCELLED:
                raise AlreadyCancelledError()

            # Restore inventory for each item
            for item in booking.items:
                ticket_type: TicketType = (
                    db.session.query(TicketType)
                    .filter(TicketType.id == item.ticket_type_id)
                    .with_for_update()
                    .first()
                )
                if ticket_type is not None:
                    ticket_type.available += item.quantity
                    # Safety cap — cannot exceed capacity
                    if ticket_type.available > ticket_type.capacity:
                        ticket_type.available = ticket_type.capacity

            # Mark booking as cancelled
            booking.status = BookingStatus.CANCELLED

        db.session.commit()
        BOOKING_CANCELLED.inc()
        db.session.refresh(booking)
        return booking

    except BookingError:
        db.session.rollback()
        raise
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception("Database error during cancellation: %s", e)
        raise BookingError(
            "A database error occurred during cancellation. Please try again.",
            status_code=500,
        ) from e
