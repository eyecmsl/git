from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app import db
from app.models.membership import Membership, MembershipType
from app.models.user import User
from app.utils.errors import AppError


def grant_automatic_membership(user_id: str) -> Membership:
    existing = Membership.query.filter_by(user_id=user_id).first()
    if existing:
        return existing
    membership = Membership(
        id=str(uuid.uuid4()),
        user_id=user_id,
        membership_type=MembershipType.AUTOMATIC,
        is_active=True,
    )
    db.session.add(membership)
    db.session.commit()
    return membership


def grant_membership(user_id: str, membership_type: str, granted_by: str) -> Membership:
    if membership_type not in (MembershipType.MANUAL, MembershipType.PERMANENT):
        raise AppError("Invalid membership type", status=400, code="invalid_membership_type")

    existing = Membership.query.filter_by(user_id=user_id).first()
    if existing:
        existing.membership_type = membership_type
        existing.granted_by = granted_by
        existing.is_active = True
        db.session.commit()
        return existing

    membership = Membership(
        id=str(uuid.uuid4()),
        user_id=user_id,
        membership_type=membership_type,
        granted_by=granted_by,
        is_active=True,
    )
    db.session.add(membership)
    db.session.commit()
    return membership


def revoke_membership(user_id: str, granted_by: str) -> None:
    membership = Membership.query.filter_by(user_id=user_id).first()
    if not membership:
        raise AppError("No membership found", status=404, code="membership_not_found")

    if membership.membership_type == MembershipType.PERMANENT:
        raise AppError("Cannot revoke permanent membership", status=403, code="cannot_revoke_permanent")

    if membership.membership_type == MembershipType.AUTOMATIC:
        raise AppError("Cannot revoke automatic membership", status=403, code="cannot_revoke_automatic")

    membership.is_active = False
    db.session.commit()


def has_active_membership(user_id: str) -> bool:
    membership = Membership.query.filter_by(user_id=user_id, is_active=True).first()
    if not membership:
        return False
    if membership.expires_at and membership.expires_at < datetime.now(timezone.utc):
        membership.is_active = False
        db.session.commit()
        return False
    return True


def get_all_memberships() -> list[Membership]:
    return Membership.query.order_by(Membership.created_at.desc()).all()


def get_membership_by_user(user_id: str) -> Membership | None:
    return Membership.query.filter_by(user_id=user_id).first()


def backfill_memberships() -> int:
    from sqlalchemy import not_
    user_ids_with_membership = db.session.query(Membership.user_id).distinct()
    users_without = User.query.filter(not_(User.id.in_(user_ids_with_membership))).all()
    count = 0
    for user in users_without:
        membership = Membership(
            id=str(uuid.uuid4()),
            user_id=user.id,
            membership_type=MembershipType.AUTOMATIC,
            is_active=True,
        )
        db.session.add(membership)
        count += 1
    if count:
        db.session.commit()
    return count
