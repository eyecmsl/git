from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app import db


class RecentlyViewed(db.Model):
    __tablename__ = "recently_viewed"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    resource_id = db.Column(db.String(36), db.ForeignKey("resources.id"), nullable=False)
    viewed_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    resource = db.relationship("Resource")

    __table_args__ = (db.UniqueConstraint("user_id", "resource_id", name="uq_recently_viewed_user_resource"),)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "resource_id": self.resource_id,
            "resource_title": self.resource.title if self.resource else None,
            "file_type": self.resource.file_type if self.resource else None,
            "viewed_at": self.viewed_at.isoformat() if self.viewed_at else None,
        }
