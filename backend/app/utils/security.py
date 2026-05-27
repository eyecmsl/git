from __future__ import annotations

from flask import request, current_app
from app.utils.errors import AppError


def validate_origin() -> None:
    origin = request.headers.get("Origin", "")
    if not origin:
        return
    allowed = current_app.config.get("ALLOWED_ORIGINS", [])
    if allowed and origin not in allowed:
        raise AppError("Origin not allowed", status=403, code="origin_forbidden")
