from flask import request, jsonify, g

from app.api import api_bp
from app.middleware.auth_middleware import require_auth
from app.services.collection_service import (
    create_collection, update_collection, delete_collection,
    get_user_collections, add_to_collection, remove_from_collection, reorder_collection,
)
from app.services.resource_service import get_resource_by_id
from app.utils.errors import AppError


@api_bp.get("/collections")
@require_auth
def list_collections():
    collections = get_user_collections(g.current_user.id)
    result = []
    for c in collections:
        d = c.to_dict()
        d["items"] = [
            {"id": item.id, "resource_id": item.resource_id,
             "resource_title": item.resource.title if item.resource else None,
             "position": item.position}
            for item in c.items
        ]
        result.append(d)
    return jsonify({"collections": result})


@api_bp.post("/collections")
@require_auth
def create_coll():
    data = request.get_json()
    name = data.get("name", "").strip() if data else ""
    description = (data.get("description") or "").strip() if data else ""
    coll = create_collection(name, g.current_user.id, description)
    return jsonify({"collection": coll.to_dict()}), 201


@api_bp.patch("/collections/<collection_id>")
@require_auth
def edit_collection(collection_id: str):
    data = request.get_json()
    coll = update_collection(
        collection_id, g.current_user.id,
        name=data.get("name") if data else None,
        description=data.get("description") if data else None,
    )
    return jsonify({"collection": coll.to_dict()})


@api_bp.delete("/collections/<collection_id>")
@require_auth
def remove_collection(collection_id: str):
    delete_collection(collection_id, g.current_user.id)
    return jsonify({"message": "Collection deleted"})


@api_bp.post("/collections/<collection_id>/items")
@require_auth
def add_item(collection_id: str):
    data = request.get_json()
    resource_id = data.get("resource_id", "").strip() if data else ""
    resource = get_resource_by_id(resource_id)
    if not resource:
        raise AppError("Resource not found", status=404, code="resource_not_found")
    item = add_to_collection(collection_id, resource_id, g.current_user.id)
    return jsonify({"item": {"id": item.id, "resource_id": item.resource_id, "position": item.position}})


@api_bp.delete("/collections/<collection_id>/items/<resource_id>")
@require_auth
def remove_item(collection_id: str, resource_id: str):
    remove_from_collection(collection_id, resource_id, g.current_user.id)
    return jsonify({"message": "Item removed"})


@api_bp.put("/collections/<collection_id>/reorder")
@require_auth
def reorder(collection_id: str):
    data = request.get_json()
    resource_ids = data.get("resource_ids", []) if data else []
    reorder_collection(collection_id, resource_ids, g.current_user.id)
    return jsonify({"message": "Reordered"})
