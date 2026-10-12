"""
EventFlow — TicketType Model

Stores ticket inventory per category for each event.
The `available` column is the source of truth for remaining inventory.

Invariants (enforced at DB level):
    available >= 0
    available <= capacity
    capacity  >= 1
    price     > 0
"""

from datetime import UTC, datetime

from sqlalchemy import CheckConstraint, Index, Numeric, UniqueConstraint

from ..extensions import db


class TicketType(db.Model):
    """
    A category of ticket (e.g., Regular, Premium, VIP) for a specific event.

    `available` is decremented atomically during booking using a
    SELECT ... FOR UPDATE lock to prevent overselling.

    `available` is incremented on cancellation within a transaction that also
    checks the booking status, preventing double-restoration.
    """

    __tablename__ = "ticket_types"
    __table_args__ = (
        # Inventory invariants — enforced at the database level
        CheckConstraint("capacity >= 1", name="ck_ticket_types_capacity_positive"),
        CheckConstraint(
            "available >= 0", name="ck_ticket_types_available_non_negative"
        ),
        CheckConstraint(
            "available <= capacity", name="ck_ticket_types_available_lte_capacity"
        ),
        CheckConstraint("price > 0", name="ck_ticket_types_price_positive"),
        CheckConstraint("max_per_booking >= 1", name="ck_ticket_types_max_per_booking"),
        # Each event can only have one ticket type with a given name
        UniqueConstraint("event_id", "name", name="uq_ticket_types_event_name"),
        Index("ix_ticket_types_event_id", "event_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(
        db.Integer, db.ForeignKey("events.id", ondelete="CASCADE"), nullable=False
    )
    name = db.Column(db.String(100), nullable=False)
    # Use Numeric for money to avoid floating-point rounding errors
    price = db.Column(Numeric(precision=10, scale=2), nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    available = db.Column(db.Integer, nullable=False)
    max_per_booking = db.Column(db.Integer, nullable=False, default=10)
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
    event = db.relationship("Event", back_populates="ticket_types")
    booking_items = db.relationship(
        "BookingItem", back_populates="ticket_type", lazy="dynamic"
    )

    # ── Helpers ───────────────────────────────────────────────────────────────
    @property
    def sold(self) -> int:
        """Number of tickets sold (capacity - available)."""
        return self.capacity - self.available

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "event_id": self.event_id,
            "name": self.name,
            "price": str(self.price),  # String to preserve exact decimal
            "capacity": self.capacity,
            "available": self.available,
            "sold": self.sold,
            "max_per_booking": self.max_per_booking,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return (
            f"<TicketType id={self.id} event_id={self.event_id} "
            f"name={self.name!r} available={self.available}/{self.capacity}>"
        )
