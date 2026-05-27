from flask import request, jsonify, g

from app.api import api_bp
from app.middleware.auth_middleware import require_auth, require_role
from app.services.membership_service import (
    grant_membership,
    revoke_membership,
    has_active_membership,
    get_all_memberships,
    get_membership_by_user,
)
from app.utils.errors import AppError


@api_bp.get("/memberships")
@require_role("owner", "admin")
def list_memberships():
    memberships = get_all_memberships()
    return jsonify({"memberships": [m.to_dict() for m in memberships]})


@api_bp.get("/memberships/me")
@require_auth
def my_membership():
    membership = get_membership_by_user(g.current_user.id)
    if membership:
        return jsonify({"membership": membership.to_dict()})
    return jsonify({"membership": None})


@api_bp.post("/memberships/grant")
@require_role("owner", "admin")
def grant():
    data = request.get_json()
    user_id = data.get("user_id", "").strip()
    membership_type = data.get("membership_type", "manual").strip()

    if not user_id:
        raise AppError("User ID is required", status=400, code="user_id_required")

    membership = grant_membership(user_id, membership_type, g.current_user.id)
    return jsonify({"membership": membership.to_dict()})


@api_bp.post("/memberships/revoke")
@require_role("owner")
def revoke():
    data = request.get_json()
    user_id = data.get("user_id", "").strip()

    if not user_id:
        raise AppError("User ID is required", status=400, code="user_id_required")

    revoke_membership(user_id, g.current_user.id)
    return jsonify({"message": "Membership revoked"})


@api_bp.get("/memberships/check")
@require_auth
def check():
    active = has_active_membership(g.current_user.id)
    return jsonify({"has_membership": active})
