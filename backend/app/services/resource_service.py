from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone, timedelta

from flask import current_app

from app import db
from app.models.resource import Resource
from app.utils.errors import AppError

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "gif", "webp", "mp4", "mp3", "zip", "doc", "docx", "txt", "md"}
MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", str(50 * 1024 * 1024)))  # 50MB default


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def get_upload_dir() -> str:
    path = os.path.join(current_app.root_path, "..", "uploads")
    os.makedirs(path, exist_ok=True)
    return path


def create_resource(title: str, description: str, category: str, file_obj, uploader_id: str) -> Resource:
    if not file_obj or not file_obj.filename:
        raise AppError("No file provided", status=400, code="no_file")

    if not allowed_file(file_obj.filename):
        raise AppError("File type not allowed", status=400, code="invalid_file_type")

    file_obj.seek(0, 2)
    size = file_obj.tell()
    file_obj.seek(0)
    if size > MAX_UPLOAD_SIZE:
        raise AppError(f"File exceeds maximum size of {MAX_UPLOAD_SIZE // (1024*1024)}MB", status=400, code="file_too_large")

    ext = file_obj.filename.rsplit(".", 1)[1].lower() if "." in file_obj.filename else ""
    saved_name = f"{uuid.uuid4().hex}.{ext}"
    upload_dir = get_upload_dir()
    file_path = os.path.join(upload_dir, saved_name)
    file_obj.save(file_path)

    file_size = os.path.getsize(file_path)

    resource = Resource(
        id=str(uuid.uuid4()),
        title=title,
        description=description,
        category=category,
        file_path=saved_name,
        file_type=ext,
        file_size=file_size,
        uploader_id=uploader_id,
    )
    db.session.add(resource)
    db.session.commit()
    return resource


def update_resource(resource_id: str, title: str | None, description: str | None, category: str | None = None) -> Resource:
    resource = Resource.query.get(resource_id)
    if not resource:
        raise AppError("Resource not found", status=404, code="resource_not_found")

    if title is not None:
        resource.title = title
    if description is not None:
        resource.description = description
    if category is not None:
        resource.category = category

    db.session.commit()
    return resource


def delete_resource(resource_id: str) -> None:
    resource = Resource.query.get(resource_id)
    if not resource:
        raise AppError("Resource not found", status=404, code="resource_not_found")

    upload_dir = get_upload_dir()
    file_path = os.path.join(upload_dir, resource.file_path)
    if os.path.exists(file_path):
        os.remove(file_path)

    db.session.delete(resource)
    db.session.commit()


def get_all_resources(search: str = "", category: str = "", sort_by: str = "created_at", sort_order: str = "desc", page: int = 1, per_page: int = 20) -> tuple[list[Resource], int]:
    query = Resource.query

    if search:
        query = query.filter(
            Resource.title.ilike(f"%{search}%") | Resource.description.ilike(f"%{search}%")
        )
    if category:
        query = query.filter(Resource.category == category)

    sort_col = getattr(Resource, sort_by, Resource.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    total = query.count()
    resources = query.offset((page - 1) * per_page).limit(per_page).all()
    return resources, total


def get_resource_by_id(resource_id: str) -> Resource | None:
    return Resource.query.get(resource_id)


def increment_view_count(resource_id: str) -> None:
    Resource.query.filter_by(id=resource_id).update({Resource.view_count: Resource.view_count + 1})
    db.session.commit()


def increment_download_count(resource_id: str) -> None:
    Resource.query.filter_by(id=resource_id).update({Resource.download_count: Resource.download_count + 1})
    db.session.commit()


def get_popular_resources(limit: int = 5) -> list[Resource]:
    return Resource.query.order_by(Resource.view_count.desc()).limit(limit).all()


def get_recent_resources(days: int = 7, limit: int = 5) -> list[Resource]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    return Resource.query.filter(Resource.created_at >= cutoff).order_by(Resource.created_at.desc()).limit(limit).all()


def get_categories() -> list[str]:
    rows = db.session.query(Resource.category).distinct().all()
    return sorted([r[0] for r in rows if r[0]])
