from flask import request, jsonify, g

from app.api import api_bp
from app.middleware.auth_middleware import require_role
from app.services.resource_version_service import (
    create_version, get_versions, get_version, restore_version,
)
from app.services.resource_service import get_resource_by_id
from app.utils.errors import AppError


@api_bp.post("/resources/<resource_id>/versions")
@require_role("owner", "admin")
def create_resource_version(resource_id: str):
    resource = get_resource_by_id(resource_id)
    if not resource:
        raise AppError("Resource not found", status=404, code="resource_not_found")
    data = request.get_json()
    notes = (data or {}).get("notes", "")
    version = create_version(resource_id, g.current_user.id, notes)
    return jsonify({"version": version.to_dict()}), 201


@api_bp.get("/resources/<resource_id>/versions")
@require_role("owner", "admin")
def list_versions(resource_id: str):
    resource = get_resource_by_id(resource_id)
    if not resource:
        raise AppError("Resource not found", status=404, code="resource_not_found")
    versions = get_versions(resource_id)
    return jsonify({"versions": [v.to_dict() for v in versions]})


@api_bp.post("/versions/<version_id>/restore")
@require_role("owner", "admin")
def restore_resource_version(version_id: str):
    resource = restore_version(version_id)
    return jsonify({"resource": resource.to_dict()})
