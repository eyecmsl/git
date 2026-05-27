from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app import db
from app.models.favorite import Favorite
from app.utils.errors import AppError


def add_favorite(user_id: str, resource_id: str) -> Favorite:
    existing = Favorite.query.filter_by(user_id=user_id, resource_id=resource_id).first()
    if existing:
        return existing
    fav = Favorite(id=str(uuid.uuid4()), user_id=user_id, resource_id=resource_id)
    db.session.add(fav)
    db.session.commit()
    return fav


def remove_favorite(user_id: str, resource_id: str) -> None:
    fav = Favorite.query.filter_by(user_id=user_id, resource_id=resource_id).first()
    if not fav:
        raise AppError("Favorite not found", status=404, code="favorite_not_found")
    db.session.delete(fav)
    db.session.commit()


def get_user_favorites(user_id: str) -> list[Favorite]:
    return Favorite.query.filter_by(user_id=user_id).order_by(Favorite.created_at.desc()).all()


def is_favorited(user_id: str, resource_id: str) -> bool:
    return Favorite.query.filter_by(user_id=user_id, resource_id=resource_id).first() is not None


def get_favorite_count(resource_id: str) -> int:
    return Favorite.query.filter_by(resource_id=resource_id).count()
