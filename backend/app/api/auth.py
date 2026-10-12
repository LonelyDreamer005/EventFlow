"""
EventFlow — Authentication API
Routes: /api/v1/auth/*
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from marshmallow import ValidationError

from ..extensions import db, limiter
from ..models.user import User
from ..schemas.auth import LoginSchema, RegisterSchema

auth_bp = Blueprint("auth", __name__)

_register_schema = RegisterSchema()
_login_schema = LoginSchema()


@auth_bp.post("/register")
@limiter.limit("5 per minute")
def register():
    """
    Register a new customer account.

    Public endpoint — no authentication required.
    Role is always set to 'customer'; admins are created via CLI only.

    Request body:
        { "name": str, "email": str, "password": str }

    Returns:
        201: { "message": str, "user": { id, name, email, role } }
        422: Validation errors
        409: Email already registered
    """
    try:
        data = _register_schema.load(request.get_json(silent=True) or {})
    except ValidationError as e:
        return jsonify({"error": "Validation failed.", "details": e.messages}), 422

    # Check duplicate email (case-insensitive)
    if User.query.filter(
        db.func.lower(User.email) == data["email"].lower()
    ).first():
        return jsonify({"error": "An account with this email already exists."}), 409

    user = User(
        name=data["name"],
        email=data["email"],
        role="customer",  # Public registration ALWAYS creates customers
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()

    return (
        jsonify(
            {
                "message": "Account created successfully.",
                "user": user.to_dict(),
            }
        ),
        201,
    )


@auth_bp.post("/login")
@limiter.limit("10 per minute")
def login():
    """
    Authenticate and receive a JWT access token.

    Request body:
        { "email": str, "password": str }

    Returns:
        200: { "access_token": str, "user": { id, name, email, role } }
        401: Invalid credentials
        422: Validation errors
    """
    try:
        data = _login_schema.load(request.get_json(silent=True) or {})
    except ValidationError as e:
        return jsonify({"error": "Validation failed.", "details": e.messages}), 422

    user = User.query.filter(
        db.func.lower(User.email) == data["email"].lower()
    ).first()

    # Use constant-time comparison to mitigate timing attacks
    if user is None or not user.check_password(data["password"]):
        return jsonify({"error": "Invalid email or password."}), 401

    token = create_access_token(identity=user.id)

    # Never log the token value
    return (
        jsonify(
            {
                "access_token": token,
                "user": user.to_dict(),
            }
        ),
        200,
    )


@auth_bp.get("/me")
@jwt_required()
def me():
    """
    Return the current authenticated user's profile.

    Returns:
        200: { "user": { id, name, email, role, created_at } }
        401: Not authenticated
    """
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id, description="User not found.")
    return jsonify({"user": user.to_dict()}), 200
