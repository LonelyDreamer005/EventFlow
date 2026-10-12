"""
EventFlow — Authentication Schemas
"""

from marshmallow import Schema, ValidationError, fields, validate, validates


class RegisterSchema(Schema):
    name = fields.String(
        required=True,
        validate=validate.Length(min=2, max=100),
        error_messages={"required": "Name is required."},
    )
    email = fields.Email(
        required=True,
        validate=validate.Length(max=255),
        error_messages={
            "required": "Email is required.",
            "invalid": "Invalid email address.",
        },
    )
    password = fields.String(
        required=True,
        load_only=True,
        validate=validate.Length(min=8, max=128),
        error_messages={
            "required": "Password is required.",
            "validator_failed": "Password must be at least 8 characters.",
        },
    )

    @validates("email")
    def validate_email_format(self, value: str) -> str:
        return value.lower().strip()

    @validates("name")
    def validate_name(self, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValidationError("Name cannot be blank.")
        return stripped


class LoginSchema(Schema):
    email = fields.Email(
        required=True,
        error_messages={"required": "Email is required."},
    )
    password = fields.String(
        required=True,
        load_only=True,
        error_messages={"required": "Password is required."},
    )

    @validates("email")
    def normalize_email(self, value: str) -> str:
        return value.lower().strip()
