from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app import db


class Collection(db.Model):
    __tablename__ = "collections"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", backref="collections")
    items = db.relationship("CollectionItem", back_populates="collection", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "user_id": self.user_id,
            "resource_count": len(self.items) if self.items else 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class CollectionItem(db.Model):
    __tablename__ = "collection_items"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    collection_id = db.Column(db.String(36), db.ForeignKey("collections.id"), nullable=False)
    resource_id = db.Column(db.String(36), db.ForeignKey("resources.id"), nullable=False)
    position = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (db.UniqueConstraint("collection_id", "resource_id", name="uq_collection_resource"),)

    collection = db.relationship("Collection", back_populates="items")
    resource = db.relationship("Resource")
