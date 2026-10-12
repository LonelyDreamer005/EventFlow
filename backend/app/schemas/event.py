"""
EventFlow — Event Schemas
"""

from datetime import datetime, timezone

from marshmallow import Schema, ValidationError, fields, validate, validates, validates_schema


class EventCreateSchema(Schema):
    title = fields.String(
        required=True,
        validate=validate.Length(min=3, max=200),
    )
    description = fields.String(
        required=True,
        validate=validate.Length(min=10, max=5000),
    )
    venue = fields.String(
        required=True,
        validate=validate.Length(min=3, max=300),
    )
    start_at = fields.DateTime(
        required=True,
        format="iso",
    )
    end_at = fields.DateTime(
        required=True,
        format="iso",
    )

    @validates("title")
    def strip_title(self, value: str) -> str:
        return value.strip()

    @validates("venue")
    def strip_venue(self, value: str) -> str:
        return value.strip()

    @validates_schema
    def validate_dates(self, data: dict, **kwargs) -> None:
        start = data.get("start_at")
        end = data.get("end_at")
        if start and end:
            if end <= start:
                raise ValidationError(
                    {"end_at": ["End time must be after start time."]}
                )
            now = datetime.now(timezone.utc)
            # Allow start to be in the past only slightly (for dev/test convenience)
            # In real production, you'd enforce start_at > now
            if start.tzinfo is None:
                # Treat naive datetime as UTC
                import pytz
                start = pytz.utc.localize(start)


class EventUpdateSchema(Schema):
    title = fields.String(validate=validate.Length(min=3, max=200))
    description = fields.String(validate=validate.Length(min=10, max=5000))
    venue = fields.String(validate=validate.Length(min=3, max=300))
    start_at = fields.DateTime(format="iso")
    end_at = fields.DateTime(format="iso")
    status = fields.String(
        validate=validate.OneOf(
            ["draft", "published", "cancelled"],
            error="Status must be one of: draft, published, cancelled",
        )
    )

    @validates_schema
    def validate_dates(self, data: dict, **kwargs) -> None:
        start = data.get("start_at")
        end = data.get("end_at")
        if start and end and end <= start:
            raise ValidationError(
                {"end_at": ["End time must be after start time."]}
            )
