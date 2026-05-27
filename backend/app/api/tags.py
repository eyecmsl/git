from flask import request, jsonify, g

from app.api import api_bp
from app.middleware.auth_middleware import require_auth, require_role
from app.services.tag_service import (
    get_or_create_tag, set_resource_tags, get_resource_tags, get_all_tags, delete_tag,
)
from app.services.resource_service import get_resource_by_id
from app.utils.errors import AppError


@api_bp.get("/tags")
@require_auth
def list_tags():
    tags = get_all_tags()
    return jsonify({"tags": [t.to_dict() for t in tags]})


@api_bp.get("/resources/<resource_id>/tags")
@require_auth
def resource_tags(resource_id: str):
    resource = get_resource_by_id(resource_id)
    if not resource:
        raise AppError("Resource not found", status=404, code="resource_not_found")
    tags = get_resource_tags(resource_id)
    return jsonify({"tags": [t.to_dict() for t in tags]})


@api_bp.post("/resources/<resource_id>/tags")
@require_role("owner", "admin")
def set_tags(resource_id: str):
    resource = get_resource_by_id(resource_id)
    if not resource:
        raise AppError("Resource not found", status=404, code="resource_not_found")
    data = request.get_json()
    tag_names = data.get("tags", []) if data else []
    tags = set_resource_tags(resource_id, tag_names)
    return jsonify({"tags": [t.to_dict() for t in tags]})


@api_bp.delete("/tags/<tag_id>")
@require_role("owner", "admin")
def remove_tag(tag_id: str):
    delete_tag(tag_id)
    return jsonify({"message": "Tag deleted"})
