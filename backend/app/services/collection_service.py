from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app import db
from app.models.collection import Collection, CollectionItem
from app.utils.errors import AppError


def create_collection(name: str, user_id: str, description: str = "") -> Collection:
    if not name.strip():
        raise AppError("Collection name is required", status=400, code="name_required")
    coll = Collection(
        id=str(uuid.uuid4()), name=name.strip(),
        description=description.strip() or None, user_id=user_id,
    )
    db.session.add(coll)
    db.session.commit()
    return coll


def update_collection(collection_id: str, user_id: str, name: str | None = None, description: str | None = None) -> Collection:
    coll = Collection.query.get(collection_id)
    if not coll:
        raise AppError("Collection not found", status=404, code="collection_not_found")
    if coll.user_id != user_id:
        raise AppError("Not authorized", status=403, code="forbidden")
    if name is not None:
        coll.name = name.strip()
    if description is not None:
        coll.description = description.strip() or None
    db.session.commit()
    return coll


def delete_collection(collection_id: str, user_id: str) -> None:
    coll = Collection.query.get(collection_id)
    if not coll:
        raise AppError("Collection not found", status=404, code="collection_not_found")
    if coll.user_id != user_id:
        raise AppError("Not authorized", status=403, code="forbidden")
    db.session.delete(coll)
    db.session.commit()


def get_user_collections(user_id: str) -> list[Collection]:
    return Collection.query.filter_by(user_id=user_id).order_by(Collection.updated_at.desc()).all()


def add_to_collection(collection_id: str, resource_id: str, user_id: str) -> CollectionItem:
    coll = Collection.query.get(collection_id)
    if not coll:
        raise AppError("Collection not found", status=404, code="collection_not_found")
    if coll.user_id != user_id:
        raise AppError("Not authorized", status=403, code="forbidden")
    existing = CollectionItem.query.filter_by(collection_id=collection_id, resource_id=resource_id).first()
    if existing:
        return existing
    max_pos = db.session.query(db.func.max(CollectionItem.position)).filter_by(collection_id=collection_id).scalar() or 0
    item = CollectionItem(
        id=str(uuid.uuid4()), collection_id=collection_id,
        resource_id=resource_id, position=max_pos + 1,
    )
    db.session.add(item)
    db.session.commit()
    return item


def remove_from_collection(collection_id: str, resource_id: str, user_id: str) -> None:
    coll = Collection.query.get(collection_id)
    if not coll:
        raise AppError("Collection not found", status=404, code="collection_not_found")
    if coll.user_id != user_id:
        raise AppError("Not authorized", status=403, code="forbidden")
    item = CollectionItem.query.filter_by(collection_id=collection_id, resource_id=resource_id).first()
    if not item:
        raise AppError("Item not found in collection", status=404, code="item_not_found")
    db.session.delete(item)
    db.session.commit()


def reorder_collection(collection_id: str, resource_ids: list[str], user_id: str) -> None:
    coll = Collection.query.get(collection_id)
    if not coll:
        raise AppError("Collection not found", status=404, code="collection_not_found")
    if coll.user_id != user_id:
        raise AppError("Not authorized", status=403, code="forbidden")
    for pos, rid in enumerate(resource_ids):
        item = CollectionItem.query.filter_by(collection_id=collection_id, resource_id=rid).first()
        if item:
            item.position = pos
    db.session.commit()
