from flask import request, jsonify, g, current_app

from app.api import api_bp
from app.middleware.auth_middleware import require_auth
from app.services.user_profile_service import update_profile, update_avatar
from app.utils.errors import AppError


@api_bp.patch("/profile")
@require_auth
def edit_profile():
    data = request.get_json()
    user = update_profile(
        g.current_user.id,
        display_name=data.get("display_name") if data else None,
        bio=data.get("bio") if data else None,
        theme_preference=data.get("theme_preference") if data else None,
    )
    return jsonify({"user": user.to_dict()})


@api_bp.post("/profile/avatar")
@require_auth
def upload_avatar():
    if "avatar" not in request.files:
        raise AppError("No avatar file provided", status=400, code="avatar_required")
    file = request.files["avatar"]
    if not file.filename:
        raise AppError("No avatar file provided", status=400, code="avatar_required")
    url = update_avatar(g.current_user.id, file)
    return jsonify({"avatar_url": url})
