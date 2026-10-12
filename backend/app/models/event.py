"""
EventFlow — Event Model
"""

import enum
from datetime import UTC, datetime

from sqlalchemy import CheckConstraint, Index

from ..extensions import db


class EventStatus(str, enum.Enum):  # noqa: UP042
    """
    Lifecycle status for an event.

    DRAFT     — Created but not visible to customers.
    PUBLISHED — Visible to customers; bookings allowed if tickets available.
    CANCELLED — No new bookings; existing bookings should be handled by policy.
    """

    DRAFT = "draft"
    PUBLISHED = "published"
    CANCELLED = "cancelled"


class Event(db.Model):
    """
    Represents a bookable event on the EventFlow platform.

    Business rules enforced here:
    - start_at must be before end_at (enforced at service layer and DB check).
    - Only PUBLISHED events are visible to customers via the public API.
    - CANCELLED events do not accept new bookings.
    - Administrators can transition: DRAFT → PUBLISHED, PUBLISHED → CANCELLED,
      and CANCELLED → DRAFT (re-draft for correction).
    """

    __tablename__ = "events"
    __table_args__ = (
        CheckConstraint("end_at > start_at", name="ck_events_end_after_start"),
        Index("ix_events_status_start", "status", "start_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    venue = db.Column(db.String(300), nullable=False)
    start_at = db.Column(db.DateTime(timezone=True), nullable=False)
    end_at = db.Column(db.DateTime(timezone=True), nullable=False)
    status = db.Column(
        db.String(20),
        nullable=False,
        default=EventStatus.DRAFT.value,
        server_default=EventStatus.DRAFT.value,
        index=True,
    )
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
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
    creator = db.relationship("User", back_populates="events_created")
    ticket_types = db.relationship(
        "TicketType",
        back_populates="event",
        lazy="select",
        cascade="all, delete-orphan",
    )

    # ── Helpers ───────────────────────────────────────────────────────────────
    @property
    def is_published(self) -> bool:
        return self.status == EventStatus.PUBLISHED.value

    @property
    def is_cancelled(self) -> bool:
        return self.status == EventStatus.CANCELLED.value

    @property
    def is_bookable(self) -> bool:
        """True if the event accepts new bookings right now."""
        now = datetime.now(UTC)
        start = self.start_at
        if start and start.tzinfo is None:
            start = start.replace(tzinfo=UTC)
        return self.status == EventStatus.PUBLISHED.value and (
            start is not None and start > now
        )

    def total_capacity(self) -> int:
        return sum(tt.capacity for tt in self.ticket_types)

    def total_available(self) -> int:
        return sum(tt.available for tt in self.ticket_types)

    def to_dict(self, include_tickets: bool = False) -> dict:
        def _iso(dt):
            if not dt:
                return None
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=UTC)
            return dt.isoformat()

        data: dict = {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "venue": self.venue,
            "start_at": _iso(self.start_at),
            "end_at": _iso(self.end_at),
            "status": self.status,
            "is_bookable": self.is_bookable,
            "created_by": self.created_by,
            "created_at": _iso(self.created_at),
            "updated_at": _iso(self.updated_at),
        }
        if include_tickets:
            data["ticket_types"] = [tt.to_dict() for tt in self.ticket_types]
        return data

    def __repr__(self) -> str:
        return f"<Event id={self.id} title={self.title!r} status={self.status!r}>"
