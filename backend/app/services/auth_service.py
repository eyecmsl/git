from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from werkzeug.security import generate_password_hash, check_password_hash

from config import config
from app import db
from app.models.user import User, UserRole
from app.services.membership_service import grant_automatic_membership
from app.utils.errors import AppError

_PASSPHRASE_WORDS = [
    "archer", "autumn", "badger", "bandit", "basin", "bison", "bloom", "bluff",
    "bonus", "breeze", "brook", "cabin", "cactus", "camel", "canal", "canyon",
    "cape", "cargo", "cedar", "cherry", "cider", "coral", "crane", "creek",
    "crisp", "crown", "crystal", "daisy", "dawn", "delta", "diesel", "dove",
    "draft", "dune", "eagle", "ember", "fable", "falcon", "fawn", "fence",
    "fern", "fiber", "field", "flame", "flint", "flour", "flower", "forest",
    "fossil", "frost", "frozen", "gadget", "garden", "gem", "glacier", "glade",
    "glimpse", "glow", "grain", "gravel", "grove", "guitar", "gulf", "harbor",
    "haven", "haze", "hollow", "horizon", "humble", "iceberg", "insect", "iris",
    "iron", "ivory", "jade", "jewel", "jungle", "kettle", "knight", "ladder",
    "lagoon", "lake", "lark", "lilac", "lily", "lodge", "lunar", "magnolia",
    "maple", "marble", "meadow", "mist", "mocha", "monarch", "moon", "morning",
    "mosaic", "moss", "mountain", "mystic", "nebula", "noble", "north", "oak",
    "oasis", "ocean", "olive", "onyx", "opal", "orbit", "oriole", "osprey",
    "owl", "paddle", "palm", "panda", "pastel", "peak", "pearl", "pebble",
    "petal", "pine", "pixel", "plain", "planet", "plum", "plume", "pond",
    "prairie", "puma", "pyramid", "quartz", "rabbit", "radish", "rain", "raven",
    "reef", "ridge", "river", "robin", "rocket", "rose", "ruby", "rufus",
    "sage", "sail", "sakura", "sapphire", "satin", "scout", "shadow", "sierra",
    "silver", "sketch", "solar", "spark", "spiral", "spring", "star", "steel",
    "storm", "stream", "summit", "sun", "surf", "swamp", "swan", "swift",
    "talon", "tangy", "thistle", "thorn", "tide", "tiger", "topaz", "trail",
    "tulip", "tundra", "turbo", "turtle", "valley", "velvet", "violet", "vortex",
    "water", "wave", "whale", "willow", "winter", "wisp", "wolf", "wombat",
    "yacht", "yonder", "zenith", "zephyr",
]

GENERATED_PASSPHRASE_LENGTH = 5


def generate_passphrase() -> str:
    return "-".join(secrets.choice(_PASSPHRASE_WORDS) for _ in range(GENERATED_PASSPHRASE_LENGTH))


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


def register_with_passphrase(email: str, display_name: str) -> tuple[User, str]:
    existing = User.query.filter_by(email=email).first()
    if existing:
        raise AppError("Email already registered", status=409, code="email_exists")

    is_first = User.query.count() == 0
    role = UserRole.OWNER if is_first else UserRole.USER

    passphrase = generate_passphrase()
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        display_name=display_name,
        password_hash=generate_password_hash(passphrase),
        role=role,
    )
    db.session.add(user)
    db.session.commit()
    grant_automatic_membership(user.id)
    return user, passphrase


def login_with_passphrase(email: str, passphrase: str) -> User:
    user = User.query.filter_by(email=email).first()
    if not user:
        raise AppError("Invalid email or passphrase", status=401, code="invalid_credentials")

    if not user.password_hash:
        raise AppError("No passphrase set for this account", status=401, code="no_passphrase")

    if not check_password_hash(user.password_hash, passphrase):
        raise AppError("Invalid email or passphrase", status=401, code="invalid_credentials")

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
