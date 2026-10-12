"""
EventFlow — Authorization Decorators
"""

from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from ..models.user import User


def admin_required(fn):
    """
    Decorator that requires a valid JWT and admin role.
    Returns 401 if no/invalid JWT, 403 if authenticated but not admin.
    """

    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id)) if user_id is not None else None
        if user is None:
            return jsonify({"error": "User not found."}), 401
        if not user.is_admin:
            return jsonify({"error": "Administrator access required."}), 403
        return fn(*args, **kwargs)

    return wrapper


def customer_required(fn):
    """
    Decorator that requires a valid JWT (any role).
    Returns 401 if no/invalid JWT.
    """

    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id)) if user_id is not None else None
        if user is None:
            return jsonify({"error": "User not found."}), 401
        return fn(*args, **kwargs)

    return wrapper


def get_current_user() -> User | None:
    """
    Return the current authenticated user or None.
    Safe to call after verify_jwt_in_request().
    """
    from flask_jwt_extended import get_jwt_identity

    user_id = get_jwt_identity()
    if user_id is None:
        return None
    return User.query.get(int(user_id))
