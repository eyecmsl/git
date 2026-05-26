from __future__ import annotations

from flask import jsonify


class AppError(Exception):
    def __init__(self, message: str, status: int = 400, code: str | None = None):
        self.message = message
        self.status = status
        self.code = code or "error"


def register_error_handlers(app):
    @app.errorhandler(AppError)
    def handle_app_error(error):
        return jsonify({"error": error.code, "message": error.message}), error.status

    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"error": "not_found", "message": "Resource not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(_):
        return jsonify({"error": "method_not_allowed", "message": "Method not allowed"}), 405

    @app.errorhandler(500)
    def internal_error(_):
        return jsonify({"error": "internal", "message": "Internal server error"}), 500
