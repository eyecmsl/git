from flask import request, jsonify, g

from app.api import api_bp
from app.middleware.auth_middleware import require_auth, require_role
from app.schemas.resource import CreateResourceRequest, UpdateResourceRequest
from app.services.resource_service import (
    create_resource,
    update_resource,
    delete_resource,
    get_all_resources,
    get_resource_by_id,
)
from app.utils.errors import AppError


@api_bp.get("/resources")
@require_auth
def list_resources():
    resources = get_all_resources()
    return jsonify({"resources": [r.to_dict() for r in resources]})


@api_bp.get("/resources/<resource_id>")
@require_auth
def get_resource(resource_id: str):
    resource = get_resource_by_id(resource_id)
    if not resource:
        raise AppError("Resource not found", status=404, code="resource_not_found")
    return jsonify({"resource": resource.to_dict()})


@api_bp.post("/resources")
@require_role("owner", "admin")
def upload_resource():
    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()
    file = request.files.get("file")

    if not title:
        raise AppError("Title is required", status=400, code="title_required")

    resource = create_resource(title, description, file, g.current_user.id)
    return jsonify({"resource": resource.to_dict()}), 201


@api_bp.patch("/resources/<resource_id>")
@require_role("owner", "admin")
def edit_resource(resource_id: str):
    body = UpdateResourceRequest(**request.get_json())
    resource = update_resource(resource_id, body.title, body.description)
    return jsonify({"resource": resource.to_dict()})


@api_bp.delete("/resources/<resource_id>")
@require_role("owner", "admin")
def remove_resource(resource_id: str):
    delete_resource(resource_id)
    return jsonify({"message": "Resource deleted"})
