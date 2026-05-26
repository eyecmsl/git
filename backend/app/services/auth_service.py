from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import jwt

from config import config
from app import db
from app.models.user import User, UserRole
from app.utils.errors import AppError


def _generate_token(user_id: str, role: str, expires_delta: int, token_type: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "jti": str(uuid.uuid4()),
        "sub": user_id,
        "role": role,
        "type": token_type,
        "iat": now,
        "exp": now + timedelta(seconds=expires_delta),
    }
    return jwt.encode(payload, config.jwt_secret, algorithm="HS256")


def create_access_token(user_id: str, role: str = UserRole.USER) -> str:
    return _generate_token(user_id, role, config.jwt_access_expires, "access")


def create_refresh_token(user_id: str) -> str:
    return _generate_token(user_id, "", config.jwt_refresh_expires, "refresh")


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, config.jwt_secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise AppError("Token expired", status=401, code="token_expired")
    except jwt.InvalidTokenError:
        raise AppError("Invalid token", status=401, code="token_invalid")


def refresh_access_token(refresh_token: str) -> str:
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise AppError("Invalid token type", status=401, code="token_invalid")
    user = get_user_by_id(payload["sub"])
    if not user:
        raise AppError("User not found", status=401, code="user_not_found")
    return create_access_token(user.id, user.role)


def create_user(email: str, display_name: str) -> User:
    existing = User.query.filter_by(email=email).first()
    if existing:
        raise AppError("Email already registered", status=409, code="email_exists")

    is_first = User.query.count() == 0
    role = UserRole.OWNER if is_first else UserRole.USER

    user = User(id=str(uuid.uuid4()), email=email, display_name=display_name, role=role)
    db.session.add(user)
    db.session.commit()
    return user


def get_user_by_id(user_id: str) -> User | None:
    return User.query.get(user_id)


def get_all_users() -> list[User]:
    return User.query.order_by(User.created_at.desc()).all()


def update_user_role(target_user_id: str, new_role: str, actor_role: str) -> User:
    if new_role not in (UserRole.ADMIN, UserRole.USER):
        raise AppError("Invalid role", status=400, code="invalid_role")

    if actor_role != UserRole.OWNER:
        raise AppError("Only owners can manage roles", status=403, code="forbidden")

    user = get_user_by_id(target_user_id)
    if not user:
        raise AppError("User not found", status=404, code="user_not_found")

    if user.role == UserRole.OWNER:
        raise AppError("Cannot change owner role", status=403, code="cannot_change_owner")

    user.role = new_role
    db.session.commit()
    return user
