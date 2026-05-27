from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app import db
from app.models.download_history import DownloadHistory


def record_download(user_id: str, resource_id: str) -> DownloadHistory:
    dh = DownloadHistory(
        id=str(uuid.uuid4()), user_id=user_id, resource_id=resource_id,
    )
    db.session.add(dh)
    db.session.commit()
    return dh


def get_user_downloads(user_id: str, limit: int = 50) -> list[DownloadHistory]:
    return DownloadHistory.query.filter_by(user_id=user_id).order_by(DownloadHistory.created_at.desc()).limit(limit).all()
