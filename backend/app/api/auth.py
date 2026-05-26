from __future__ import annotations

from flask import request, jsonify, g, current_app

from app.api import api_bp
from app.middleware.auth_middleware import require_auth, require_role
from app.schemas.auth import (
    RegisterPassphraseRequest,
    LoginPassphraseRequest,
    RefreshRequest,
)
from app.services.auth_service import (
    register_with_passphrase,
    login_with_passphrase,
    create_access_token,
    create_refresh_token,
    refresh_access_token,
    get_all_users,
    update_user_role,
)
from app.services.turnstile_service import verify_turnstile_token
from app.utils.errors import AppError


def _validate_turnstile(token: str) -> None:
    secret = current_app.config["TURNSTILE_SECRET_KEY"]
    remote_ip = request.remote_addr
    if not verify_turnstile_token(token, secret, remote_ip):
        raise AppError(429, "Security verification failed. Please try again.")


@api_bp.post("/auth/register")
def register():
    body = RegisterPassphraseRequest(**request.get_json())
    _validate_turnstile(body.turnstile_token)
    user, passphrase = register_with_passphrase(body.email, body.display_name)
    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)
    return jsonify({"access_token": access_token, "refresh_token": refresh_token, "user": user.to_dict(), "passphrase": passphrase})


@api_bp.post("/auth/login")
def login():
    body = LoginPassphraseRequest(**request.get_json())
    _validate_turnstile(body.turnstile_token)
    user = login_with_passphrase(body.email, body.passphrase)
    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)
    return jsonify({"access_token": access_token, "refresh_token": refresh_token, "user": user.to_dict()})


@api_bp.post("/auth/refresh")
def refresh():
    body = RefreshRequest(**request.get_json())
    new_access = refresh_access_token(body.refresh_token)
    return jsonify({"access_token": new_access})


@api_bp.get("/auth/me")
@require_auth
def me():
    return jsonify({"user": g.current_user.to_dict()})


@api_bp.get("/admin/users")
@require_role("owner", "admin")
def admin_list_users():
    users = get_all_users()
    return jsonify({"users": [u.to_dict() for u in users]})


@api_bp.patch("/admin/users/<user_id>/role")
@require_role("owner")
def admin_update_role(user_id: str):
    body = request.get_json()
    new_role = body.get("role", "")
    user = update_user_role(user_id, new_role, g.current_user.role)
    return jsonify({"user": user.to_dict()})
