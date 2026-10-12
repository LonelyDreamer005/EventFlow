"""
EventFlow — Centralized Error Handlers

All handlers return JSON with consistent format:
  { "error": "<message>", "details": <optional dict> }
"""

from flask import Flask, jsonify
from marshmallow import ValidationError as MarshmallowValidationError
from werkzeug.exceptions import HTTPException


def register_error_handlers(app: Flask) -> None:
    """Register all error handlers on the application."""

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad request.", "details": str(e)}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({"error": "Authentication required."}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({"error": "You do not have permission to perform this action."}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "The requested resource was not found."}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed."}), 405

    @app.errorhandler(409)
    def conflict(e):
        return jsonify({"error": str(e)}), 409

    @app.errorhandler(422)
    def unprocessable(e):
        return jsonify({"error": "Unprocessable entity.", "details": str(e)}), 422

    @app.errorhandler(429)
    def rate_limit_exceeded(e):
        return (
            jsonify(
                {
                    "error": "Too many requests. Please wait before trying again.",
                    "retry_after": str(e.retry_after) if hasattr(e, "retry_after") else None,
                }
            ),
            429,
        )

    @app.errorhandler(500)
    def internal_error(e):
        # Do NOT expose exception details in production
        app.logger.exception("Internal server error: %s", e)
        return jsonify({"error": "An internal error occurred. Please try again later."}), 500

    @app.errorhandler(MarshmallowValidationError)
    def handle_validation_error(e: MarshmallowValidationError):
        return jsonify({"error": "Validation failed.", "details": e.messages}), 422

    @app.errorhandler(HTTPException)
    def handle_http_exception(e: HTTPException):
        return jsonify({"error": e.description}), e.code
