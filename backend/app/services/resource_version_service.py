from __future__ import annotations

import uuid
import os
from datetime import datetime, timezone

from app import db
from app.models.resource import Resource
from app.models.resource_version import ResourceVersion
from app.utils.errors import AppError


def create_version(resource_id: str, uploaded_by: str, notes: str = "") -> ResourceVersion:
    resource = Resource.query.get(resource_id)
    if not resource:
        raise AppError("Resource not found", status=404, code="resource_not_found")

    current_max = db.session.query(db.func.max(ResourceVersion.version_number)).filter_by(resource_id=resource_id).scalar() or 0

    version = ResourceVersion(
        id=str(uuid.uuid4()),
        resource_id=resource_id,
        version_number=current_max + 1,
        file_path=resource.file_path,
        file_size=resource.file_size,
        file_type=resource.file_type,
        original_size=resource.original_size,
        is_compressed=resource.is_compressed,
        notes=notes.strip() or None,
        uploaded_by=uploaded_by,
    )
    db.session.add(version)
    db.session.commit()
    return version


def get_versions(resource_id: str) -> list[ResourceVersion]:
    return ResourceVersion.query.filter_by(resource_id=resource_id).order_by(ResourceVersion.version_number.desc()).all()


def get_version(version_id: str) -> ResourceVersion | None:
    return ResourceVersion.query.get(version_id)


def restore_version(version_id: str) -> Resource:
    version = ResourceVersion.query.get(version_id)
    if not version:
        raise AppError("Version not found", status=404, code="version_not_found")
    resource = Resource.query.get(version.resource_id)
    if not resource:
        raise AppError("Resource not found", status=404, code="resource_not_found")
    resource.file_path = version.file_path
    resource.file_size = version.file_size
    resource.file_type = version.file_type
    resource.original_size = version.original_size
    resource.is_compressed = version.is_compressed
    db.session.commit()
    return resource
