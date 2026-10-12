"""
EventFlow — Booking Schemas
"""

from marshmallow import (
    Schema,
    ValidationError,
    fields,
    validate,
    validates,
    validates_schema,
)


class BookingItemInputSchema(Schema):
    ticket_type_id = fields.Integer(
        required=True,
        validate=validate.Range(min=1),
    )
    quantity = fields.Integer(
        required=True,
        validate=validate.Range(min=1, max=100),
    )


class BookingCreateSchema(Schema):
    items = fields.List(
        fields.Nested(BookingItemInputSchema),
        required=True,
        validate=validate.Length(min=1, max=10),
    )

    @validates("items")
    def validate_no_duplicate_ticket_types(self, value: list) -> list:
        ticket_type_ids = [item["ticket_type_id"] for item in value]
        if len(ticket_type_ids) != len(set(ticket_type_ids)):
            raise ValidationError(
                "Duplicate ticket types in booking request. "
                "Combine quantities for the same ticket type into one entry."
            )
        return value

    @validates_schema
    def validate_total_quantity(self, data: dict, **kwargs) -> None:
        items = data.get("items", [])
        total = sum(item.get("quantity", 0) for item in items)
        if total > 20:
            raise ValidationError(
                {
                    "items": [
                        f"Total ticket quantity ({total}) exceeds the maximum of 20 per booking."
                    ]
                }
            )
