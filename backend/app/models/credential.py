from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app import db


class Credential(db.Model):
    __tablename__ = "credentials"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    credential_id = db.Column(db.Text, unique=True, nullable=False)
    public_key = db.Column(db.Text, nullable=False)
    sign_count = db.Column(db.Integer, default=0)
    device_name = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_used_at = db.Column(db.DateTime(timezone=True), nullable=True)

    user = db.relationship("User", back_populates="credentials")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "credential_id": self.credential_id,
            "device_name": self.device_name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
        }
