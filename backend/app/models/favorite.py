from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app import db


class Favorite(db.Model):
    __tablename__ = "favorites"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    resource_id = db.Column(db.String(36), db.ForeignKey("resources.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (db.UniqueConstraint("user_id", "resource_id", name="uq_favorite_user_resource"),)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "resource_id": self.resource_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
