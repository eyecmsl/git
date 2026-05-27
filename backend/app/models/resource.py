from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app import db


class Resource(db.Model):
    __tablename__ = "resources"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    file_path = db.Column(db.String(512), nullable=False)
    file_type = db.Column(db.String(64), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)
    uploader_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    uploader = db.relationship("User", backref="resources")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "file_path": self.file_path,
            "file_type": self.file_type,
            "file_size": self.file_size,
            "uploader_id": self.uploader_id,
            "uploader_name": self.uploader.display_name if self.uploader else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
