from __future__ import annotations

import uuid
import re

from app import db
from app.models.tag import Tag, ResourceTag
from app.utils.errors import AppError


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9-]", "", name.lower().replace(" ", "-"))[:64]


def get_or_create_tag(name: str) -> Tag:
    name = name.strip()
    if not name:
        raise AppError("Tag name is required", status=400, code="tag_name_required")
    slug = _slugify(name)
    tag = Tag.query.filter_by(slug=slug).first()
    if tag:
        return tag
    tag = Tag(id=str(uuid.uuid4()), name=name, slug=slug)
    db.session.add(tag)
    db.session.commit()
    return tag


def set_resource_tags(resource_id: str, tag_names: list[str]) -> list[Tag]:
    ResourceTag.query.filter_by(resource_id=resource_id).delete()
    tags = []
    for name in tag_names:
        name = name.strip()
        if not name:
            continue
        tag = get_or_create_tag(name)
        rt = ResourceTag(id=str(uuid.uuid4()), resource_id=resource_id, tag_id=tag.id)
        db.session.add(rt)
        tags.append(tag)
    db.session.commit()
    return tags


def get_resource_tags(resource_id: str) -> list[Tag]:
    rts = ResourceTag.query.filter_by(resource_id=resource_id).all()
    return [rt.tag for rt in rts]


def get_all_tags() -> list[Tag]:
    return Tag.query.order_by(Tag.name).all()


def delete_tag(tag_id: str) -> None:
    tag = Tag.query.get(tag_id)
    if not tag:
        raise AppError("Tag not found", status=404, code="tag_not_found")
    ResourceTag.query.filter_by(tag_id=tag_id).delete()
    db.session.delete(tag)
    db.session.commit()
