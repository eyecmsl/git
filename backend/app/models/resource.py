from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app import db


class Resource(db.Model):
    __tablename__ = "resources"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(64), nullable=True, default="")
    file_path = db.Column(db.String(512), nullable=False)
    file_type = db.Column(db.String(64), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)
    original_size = db.Column(db.Integer, nullable=True)
    is_compressed = db.Column(db.Boolean, nullable=False, default=False)
    is_password_protected = db.Column(db.Boolean, nullable=False, default=False)
    password_hash = db.Column(db.String(256), nullable=True)
    requires_membership = db.Column(db.Boolean, nullable=False, default=False)
    uploader_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    download_count = db.Column(db.Integer, nullable=False, default=0)
    view_count = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    uploader = db.relationship("User", backref="resources")

    def to_dict(self, include_password: bool = False) -> dict:
        data = {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "file_path": self.file_path,
            "file_type": self.file_type,
            "file_size": self.file_size,
            "original_size": self.original_size,
            "is_compressed": self.is_compressed,
            "is_password_protected": self.is_password_protected,
            "requires_membership": self.requires_membership,
            "download_count": self.download_count,
            "view_count": self.view_count,
            "uploader_id": self.uploader_id,
            "uploader_name": self.uploader.display_name if self.uploader else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_password and self.password_hash:
            data["password_hash"] = self.password_hash
        return data
