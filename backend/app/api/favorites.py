from flask import request, jsonify, g

from app.api import api_bp
from app.middleware.auth_middleware import require_auth
from app.services.favorite_service import (
    add_favorite, remove_favorite, get_user_favorites, is_favorited, get_favorite_count,
)
from app.services.resource_service import get_resource_by_id
from app.utils.errors import AppError


@api_bp.get("/favorites")
@require_auth
def list_favorites():
    favorites = get_user_favorites(g.current_user.id)
    resource_ids = [f.resource_id for f in favorites]
    resources = []
    for rid in resource_ids:
        r = get_resource_by_id(rid)
        if r:
            resources.append(r.to_dict())
    return jsonify({"favorites": resources})


@api_bp.post("/favorites/<resource_id>")
@require_auth
def add_fav(resource_id: str):
    resource = get_resource_by_id(resource_id)
    if not resource:
        raise AppError("Resource not found", status=404, code="resource_not_found")
    add_favorite(g.current_user.id, resource_id)
    return jsonify({"favorited": True})


@api_bp.delete("/favorites/<resource_id>")
@require_auth
def remove_fav(resource_id: str):
    remove_favorite(g.current_user.id, resource_id)
    return jsonify({"favorited": False})


@api_bp.get("/favorites/<resource_id>/check")
@require_auth
def check_favorite(resource_id: str):
    return jsonify({"favorited": is_favorited(g.current_user.id, resource_id)})
