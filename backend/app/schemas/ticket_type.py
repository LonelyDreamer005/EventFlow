"""
EventFlow — Ticket Type Schemas
"""

from marshmallow import Schema, ValidationError, fields, validate, validates


class TicketTypeCreateSchema(Schema):
    name = fields.String(
        required=True,
        validate=validate.Length(min=1, max=100),
    )
    price = fields.Decimal(
        required=True,
        places=2,
        as_string=True,
    )
    capacity = fields.Integer(
        required=True,
        validate=validate.Range(min=1, max=100000),
    )
    max_per_booking = fields.Integer(
        load_default=10,
        validate=validate.Range(min=1, max=100),
    )

    @validates("price")
    def validate_price(self, value) -> object:
        if value <= 0:
            raise ValidationError("Price must be greater than zero.")
        return value

    @validates("name")
    def strip_name(self, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValidationError("Ticket type name cannot be blank.")
        return stripped


class TicketTypeUpdateSchema(Schema):
    name = fields.String(validate=validate.Length(min=1, max=100))
    price = fields.Decimal(places=2, as_string=True)
    capacity = fields.Integer(validate=validate.Range(min=1, max=100000))
    max_per_booking = fields.Integer(validate=validate.Range(min=1, max=100))

    @validates("price")
    def validate_price(self, value) -> object:
        if value is not None and value <= 0:
            raise ValidationError("Price must be greater than zero.")
        return value
