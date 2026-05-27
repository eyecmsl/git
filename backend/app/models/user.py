from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app import db


class UserRole:
    OWNER = "owner"
    ADMIN = "admin"
    USER = "user"


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    display_name = db.Column(db.String(128), nullable=False)
    password_hash = db.Column(db.String(256), nullable=True)
    role = db.Column(db.String(16), nullable=False, default=UserRole.USER)
    avatar_url = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    credentials = db.relationship("Credential", back_populates="user", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "display_name": self.display_name,
            "role": self.role,
            "avatar_url": self.avatar_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
