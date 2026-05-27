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
    get_categories,
    increment_view_count,
    increment_download_count,
    get_popular_resources,
    get_recent_resources,
)
from app.utils.errors import AppError


@api_bp.get("/resources")
@require_auth
def list_resources():
    search = request.args.get("search", "")
    category = request.args.get("category", "")
    sort_by = request.args.get("sort_by", "created_at")
    sort_order = request.args.get("sort_order", "desc")
    page = int(request.args.get("page", "1"))
    per_page = int(request.args.get("per_page", "20"))

    if sort_by not in ("title", "created_at", "file_size", "download_count", "view_count"):
        sort_by = "created_at"
    if sort_order not in ("asc", "desc"):
        sort_order = "desc"

    resources, total = get_all_resources(
        search=search, category=category,
        sort_by=sort_by, sort_order=sort_order,
        page=page, per_page=per_page,
    )
    return jsonify({
        "resources": [r.to_dict() for r in resources],
        "total": total,
        "page": page,
        "per_page": per_page,
    })


@api_bp.get("/resources/popular")
@require_auth
def popular_resources():
    resources = get_popular_resources()
    return jsonify({"resources": [r.to_dict() for r in resources]})


@api_bp.get("/resources/recent")
@require_auth
def recent_resources():
    resources = get_recent_resources()
    return jsonify({"resources": [r.to_dict() for r in resources]})


@api_bp.get("/resources/<resource_id>")
@require_auth
def get_resource(resource_id: str):
    resource = get_resource_by_id(resource_id)
    if not resource:
        raise AppError("Resource not found", status=404, code="resource_not_found")
    increment_view_count(resource_id)
    return jsonify({"resource": resource.to_dict()})


@api_bp.post("/resources")
@require_role("owner", "admin")
def upload_resource():
    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()
    category = request.form.get("category", "").strip()
    file = request.files.get("file")

    if not title:
        raise AppError("Title is required", status=400, code="title_required")

    resource = create_resource(title, description, category, file, g.current_user.id)
    return jsonify({"resource": resource.to_dict()}), 201


@api_bp.patch("/resources/<resource_id>")
@require_role("owner", "admin")
def edit_resource(resource_id: str):
    body = UpdateResourceRequest(**request.get_json())
    resource = update_resource(resource_id, body.title, body.description, body.category)
    return jsonify({"resource": resource.to_dict()})


@api_bp.delete("/resources/<resource_id>")
@require_role("owner", "admin")
def remove_resource(resource_id: str):
    delete_resource(resource_id)
    return jsonify({"message": "Resource deleted"})


@api_bp.post("/resources/<resource_id>/download")
@require_auth
def download_resource(resource_id: str):
    resource = get_resource_by_id(resource_id)
    if not resource:
        raise AppError("Resource not found", status=404, code="resource_not_found")
    increment_download_count(resource_id)
    return jsonify({"download_url": f"/uploads/{resource.file_path}"})


@api_bp.get("/categories")
@require_auth
def list_categories():
    cats = get_categories()
    return jsonify({"categories": cats})
