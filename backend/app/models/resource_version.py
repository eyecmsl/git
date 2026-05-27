from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app import db


class ResourceVersion(db.Model):
    __tablename__ = "resource_versions"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    resource_id = db.Column(db.String(36), db.ForeignKey("resources.id"), nullable=False)
    version_number = db.Column(db.Integer, nullable=False)
    file_path = db.Column(db.String(512), nullable=False)
    file_size = db.Column(db.Integer, nullable=True)
    file_type = db.Column(db.String(64), nullable=True)
    original_size = db.Column(db.Integer, nullable=True)
    is_compressed = db.Column(db.Boolean, nullable=False, default=False)
    notes = db.Column(db.Text, nullable=True)
    uploaded_by = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    uploader = db.relationship("User")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "resource_id": self.resource_id,
            "version_number": self.version_number,
            "file_path": self.file_path,
            "file_size": self.file_size,
            "file_type": self.file_type,
            "original_size": self.original_size,
            "is_compressed": self.is_compressed,
            "notes": self.notes,
            "uploaded_by": self.uploaded_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
