from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone

from flask import current_app

from app import db
from app.models.resource import Resource
from app.utils.errors import AppError

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "gif", "mp4", "mp3", "zip", "doc", "docx", "txt", "md"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def get_upload_dir() -> str:
    path = os.path.join(current_app.root_path, "..", "uploads")
    os.makedirs(path, exist_ok=True)
    return path


def create_resource(title: str, description: str, file_obj, uploader_id: str) -> Resource:
    if not file_obj or not file_obj.filename:
        raise AppError("No file provided", status=400, code="no_file")

    if not allowed_file(file_obj.filename):
        raise AppError("File type not allowed", status=400, code="invalid_file_type")

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
        file_path=saved_name,
        file_type=ext,
        file_size=file_size,
        uploader_id=uploader_id,
    )
    db.session.add(resource)
    db.session.commit()
    return resource


def update_resource(resource_id: str, title: str | None, description: str | None) -> Resource:
    resource = Resource.query.get(resource_id)
    if not resource:
        raise AppError("Resource not found", status=404, code="resource_not_found")

    if title is not None:
        resource.title = title
    if description is not None:
        resource.description = description

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


def get_all_resources() -> list[Resource]:
    return Resource.query.order_by(Resource.created_at.desc()).all()


def get_resource_by_id(resource_id: str) -> Resource | None:
    return Resource.query.get(resource_id)
