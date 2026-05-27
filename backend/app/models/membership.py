from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum

from app import db


class MembershipType(str, Enum):
    AUTOMATIC = "automatic"
    MANUAL = "manual"
    PERMANENT = "permanent"


class Membership(db.Model):
    __tablename__ = "memberships"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    membership_type = db.Column(db.String(16), nullable=False, default=MembershipType.AUTOMATIC)
    granted_by = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = db.Column(db.DateTime(timezone=True), nullable=True)

    user = db.relationship("User", foreign_keys=[user_id], backref="memberships")
    granter = db.relationship("User", foreign_keys=[granted_by])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.display_name if self.user else None,
            "user_email": self.user.email if self.user else None,
            "membership_type": self.membership_type,
            "granted_by": self.granted_by,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }
