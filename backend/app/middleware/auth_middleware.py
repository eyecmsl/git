from __future__ import annotations

from functools import wraps

from flask import request, g

from app.services.auth_service import decode_token, get_user_by_id
from app.utils.errors import AppError


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        payload = _authenticate()
        user = get_user_by_id(payload["sub"])
        if not user:
            raise AppError("User not found", status=401, code="user_not_found")
        g.current_user = user
        return f(*args, **kwargs)
    return decorated


def require_role(*roles: str):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            payload = _authenticate()
            user = get_user_by_id(payload["sub"])
            if not user:
                raise AppError("User not found", status=401, code="user_not_found")
            if user.role not in roles:
                raise AppError("Insufficient permissions", status=403, code="forbidden")
            g.current_user = user
            return f(*args, **kwargs)
        return decorated
    return decorator


def _authenticate() -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise AppError("Missing authorization header", status=401, code="unauthorized")
    token = auth_header.split(" ", 1)[1]
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise AppError("Invalid token type", status=401, code="token_invalid")
    return payload
