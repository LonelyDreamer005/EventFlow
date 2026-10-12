"""
EventFlow — Booking Model

A Booking represents a confirmed reservation made by a customer.
Each Booking has one or more BookingItems (ticket types + quantities).

Status transitions:
    CONFIRMED → CANCELLED  (by customer cancel or admin cancel)
    CANCELLED is a terminal state — no further transitions.

The `reference` is a human-readable booking ID shown to customers.
"""

import random
import string
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Index

from ..extensions import db


def _generate_reference() -> str:
    """
    Generate a short, unique, uppercase booking reference.
    Format: EF-XXXXXXXX (8 random alphanumeric chars)
    Example: EF-K3M7PQ2A
    """
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(random.choices(chars, k=8))
    return f"EF-{suffix}"


class BookingStatus(str):
    """Booking lifecycle status constants."""

    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class Booking(db.Model):
    """
    A ticket reservation placed by a customer.

    Business rules:
    - reference is generated server-side and never supplied by the client.
    - total_amount is calculated at booking time from BookingItem subtotals.
    - Prices in BookingItems are frozen at booking time to preserve history.
    - Only the owning customer or an admin may view/cancel this booking.
    """

    __tablename__ = "bookings"
    __table_args__ = (
        CheckConstraint(
            "status IN ('confirmed', 'cancelled')", name="ck_bookings_status"
        ),
        CheckConstraint("total_amount >= 0", name="ck_bookings_total_non_negative"),
        Index("ix_bookings_user_id", "user_id"),
        Index("ix_bookings_reference", "reference", unique=True),
        Index("ix_bookings_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    reference = db.Column(
        db.String(20),
        unique=True,
        nullable=False,
        default=_generate_reference,
    )
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    status = db.Column(
        db.String(20),
        nullable=False,
        default=BookingStatus.CONFIRMED,
        server_default="confirmed",
    )
    total_amount = db.Column(
        db.Numeric(precision=10, scale=2), nullable=False, default=Decimal("0.00")
    )
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    user = db.relationship("User", back_populates="bookings")
    items = db.relationship(
        "BookingItem",
        back_populates="booking",
        lazy="select",
        cascade="all, delete-orphan",
    )

    # ── Helpers ───────────────────────────────────────────────────────────────
    @property
    def is_confirmed(self) -> bool:
        return self.status == BookingStatus.CONFIRMED

    @property
    def is_cancelled(self) -> bool:
        return self.status == BookingStatus.CANCELLED

    def to_dict(self, include_items: bool = True, include_user: bool = False) -> dict:
        created = self.created_at
        if created and created.tzinfo is None:
            created = created.replace(tzinfo=UTC)
        updated = self.updated_at
        if updated and updated.tzinfo is None:
            updated = updated.replace(tzinfo=UTC)
        data: dict = {
            "id": self.id,
            "reference": self.reference,
            "user_id": self.user_id,
            "status": self.status,
            "total_amount": str(self.total_amount),
            "created_at": created.isoformat() if created else None,
            "updated_at": updated.isoformat() if updated else None,
        }
        if self.user:
            data["user_name"] = self.user.name
            data["user_email"] = self.user.email
            if include_user:
                data["user"] = self.user.to_dict()

        if include_items:
            items_list = [item.to_dict() for item in self.items]
            data["items"] = items_list
            if items_list and len(items_list) > 0:
                first_item = items_list[0]
                tt = first_item.get("ticket_type") or {}
                data["ticket_name"] = tt.get("name")
                event = tt.get("event") or {}
                data["event_title"] = event.get("title")
                data["event_venue"] = event.get("venue")
                data["event_start_at"] = event.get("start_at")
        return data

    def __repr__(self) -> str:
        return (
            f"<Booking id={self.id} ref={self.reference!r} "
            f"user_id={self.user_id} status={self.status!r}>"
        )
