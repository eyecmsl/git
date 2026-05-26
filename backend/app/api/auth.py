from __future__ import annotations

from flask import request, jsonify, g

from app.api import api_bp
from app.middleware.auth_middleware import require_auth, require_role
from app.schemas.auth import (
    RegisterStartRequest,
    RegisterCompleteRequest,
    LoginStartRequest,
    LoginCompleteRequest,
    RefreshRequest,
)
from app.services.auth_service import (
    create_user,
    create_access_token,
    create_refresh_token,
    refresh_access_token,
    get_all_users,
    update_user_role,
)
from app.services.webauthn_service import (
    start_registration,
    complete_registration,
    start_authentication,
    complete_authentication,
)
from app.utils.errors import AppError


@api_bp.post("/auth/register/start")
def register_start():
    body = RegisterStartRequest(**request.get_json())
    user = create_user(body.email, body.display_name)
    challenge_id, options = start_registration(user.id, user.email, user.display_name)
    return jsonify({"challenge_id": challenge_id, "public_key_options": options, "user": user.to_dict()})


@api_bp.post("/auth/register/complete")
def register_complete():
    body = RegisterCompleteRequest(**request.get_json())
    try:
        complete_registration(body.challenge_id, body.credential)
    except ValueError as e:
        raise AppError(str(e), status=400, code="registration_failed")
    return jsonify({"status": "ok", "message": "Passkey registered"})


@api_bp.post("/auth/login/start")
def login_start():
    body = LoginStartRequest(**request.get_json())
    challenge_id, options = start_authentication(body.email)
    return jsonify({"challenge_id": challenge_id, "public_key_options": options})


@api_bp.post("/auth/login/complete")
def login_complete():
    body = LoginCompleteRequest(**request.get_json())
    try:
        user_id = complete_authentication(body.challenge_id, body.credential)
    except ValueError as e:
        raise AppError(str(e), status=401, code="authentication_failed")

    from app.models.user import User
    user = User.query.get(user_id)
    if not user:
        raise AppError("User not found", status=401, code="user_not_found")

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict(),
    })


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
