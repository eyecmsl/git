from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app import db


class Tag(db.Model):
    __tablename__ = "tags"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(64), nullable=False, unique=True)
    slug = db.Column(db.String(64), nullable=False, unique=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name, "slug": self.slug}


class ResourceTag(db.Model):
    __tablename__ = "resource_tags"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    resource_id = db.Column(db.String(36), db.ForeignKey("resources.id"), nullable=False)
    tag_id = db.Column(db.String(36), db.ForeignKey("tags.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (db.UniqueConstraint("resource_id", "tag_id", name="uq_resource_tag"),)

    resource = db.relationship("Resource", backref="resource_tags_refs")
    tag = db.relationship("Tag")
