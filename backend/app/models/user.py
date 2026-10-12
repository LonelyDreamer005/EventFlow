"""
EventFlow — User Model
"""

from datetime import UTC, datetime

import bcrypt
from sqlalchemy import CheckConstraint, Index

from ..extensions import db


class User(db.Model):
    """
    Represents an EventFlow application user.

    Roles:
        customer — can browse events and make/cancel bookings.
        admin    — can manage events, ticket types, and view all bookings.

    Passwords are stored as bcrypt hashes. The plaintext password is never
    stored or logged.
    """

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('customer', 'admin')", name="ck_users_role"),
        Index("ix_users_email_lower", db.func.lower(db.column("email")), unique=True),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(
        db.String(20),
        nullable=False,
        default="customer",
        server_default="customer",
    )
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    bookings = db.relationship("Booking", back_populates="user", lazy="dynamic")
    events_created = db.relationship("Event", back_populates="creator", lazy="dynamic")

    # ── Password helpers ──────────────────────────────────────────────────────
    def set_password(self, plaintext: str) -> None:
        """Hash and store the password. Never stores plaintext."""
        password_bytes = plaintext.encode("utf-8")
        salt = bcrypt.gensalt(rounds=12)
        self.password_hash = bcrypt.hashpw(password_bytes, salt).decode("utf-8")

    def check_password(self, plaintext: str) -> bool:
        """Verify plaintext against stored hash. Returns True if correct."""
        try:
            return bcrypt.checkpw(
                plaintext.encode("utf-8"),
                self.password_hash.encode("utf-8"),
            )
        except Exception:
            return False

    # ── Helpers ───────────────────────────────────────────────────────────────
    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    @property
    def is_customer(self) -> bool:
        return self.role == "customer"

    def to_dict(self) -> dict:
        """Return public user representation (no password hash)."""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role!r}>"
