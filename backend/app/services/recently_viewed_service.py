from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app import db
from app.models.recently_viewed import RecentlyViewed


def record_view(user_id: str, resource_id: str) -> None:
    existing = RecentlyViewed.query.filter_by(user_id=user_id, resource_id=resource_id).first()
    if existing:
        existing.viewed_at = datetime.now(timezone.utc)
    else:
        rv = RecentlyViewed(id=str(uuid.uuid4()), user_id=user_id, resource_id=resource_id)
        db.session.add(rv)
    db.session.commit()
    _trim_recent(user_id)


def _trim_recent(user_id: str, keep: int = 20) -> None:
    recent = RecentlyViewed.query.filter_by(user_id=user_id).order_by(RecentlyViewed.viewed_at.desc()).all()
    if len(recent) > keep:
        for r in recent[keep:]:
            db.session.delete(r)
        db.session.commit()


def get_recently_viewed(user_id: str, limit: int = 10) -> list[RecentlyViewed]:
    return RecentlyViewed.query.filter_by(user_id=user_id).order_by(RecentlyViewed.viewed_at.desc()).limit(limit).all()
