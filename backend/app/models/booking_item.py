"""
EventFlow — BookingItem Model

Each BookingItem represents a quantity of a specific TicketType within a Booking.
The `unit_price` is the price at the time of booking (price history preservation).
This ensures that future changes to TicketType.price do not alter booking records.
"""

from decimal import Decimal

from sqlalchemy import CheckConstraint, Index, Numeric

from ..extensions import db


class BookingItem(db.Model):
    """
    A line item within a Booking.

    Important: unit_price is captured at booking time, NOT a live reference
    to TicketType.price. This preserves the actual amount charged.
    """

    __tablename__ = "booking_items"
    __table_args__ = (
        CheckConstraint("quantity >= 1", name="ck_booking_items_quantity_positive"),
        CheckConstraint(
            "unit_price > 0", name="ck_booking_items_unit_price_positive"
        ),
        CheckConstraint("subtotal >= 0", name="ck_booking_items_subtotal_non_negative"),
        Index("ix_booking_items_booking_id", "booking_id"),
        Index("ix_booking_items_ticket_type_id", "ticket_type_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(
        db.Integer,
        db.ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
    )
    ticket_type_id = db.Column(
        db.Integer,
        db.ForeignKey("ticket_types.id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity = db.Column(db.Integer, nullable=False)
    # Price frozen at booking time — not a live reference to TicketType.price
    unit_price = db.Column(Numeric(precision=10, scale=2), nullable=False)
    subtotal = db.Column(Numeric(precision=10, scale=2), nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────────
    booking = db.relationship("Booking", back_populates="items")
    ticket_type = db.relationship("TicketType", back_populates="booking_items")

    # ── Factory ───────────────────────────────────────────────────────────────
    @classmethod
    def create(cls, booking_id: int, ticket_type_id: int, quantity: int, unit_price: Decimal) -> "BookingItem":
        """Create a BookingItem with subtotal auto-computed."""
        return cls(
            booking_id=booking_id,
            ticket_type_id=ticket_type_id,
            quantity=quantity,
            unit_price=unit_price,
            subtotal=unit_price * quantity,
        )

    def to_dict(self, include_ticket_type: bool = True) -> dict:
        data: dict = {
            "id": self.id,
            "booking_id": self.booking_id,
            "ticket_type_id": self.ticket_type_id,
            "quantity": self.quantity,
            "unit_price": str(self.unit_price),
            "subtotal": str(self.subtotal),
        }
        if include_ticket_type and self.ticket_type:
            data["ticket_type"] = {
                "id": self.ticket_type.id,
                "name": self.ticket_type.name,
                "event_id": self.ticket_type.event_id,
            }
            if self.ticket_type.event:
                data["ticket_type"]["event"] = {
                    "id": self.ticket_type.event.id,
                    "title": self.ticket_type.event.title,
                    "venue": self.ticket_type.event.venue,
                    "start_at": (
                        self.ticket_type.event.start_at.isoformat()
                        if self.ticket_type.event.start_at
                        else None
                    ),
                }
        return data

    def __repr__(self) -> str:
        return (
            f"<BookingItem id={self.id} booking_id={self.booking_id} "
            f"ticket_type_id={self.ticket_type_id} qty={self.quantity}>"
        )
