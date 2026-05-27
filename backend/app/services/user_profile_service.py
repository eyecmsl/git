from __future__ import annotations

import uuid
import os

from werkzeug.utils import secure_filename
from flask import current_app

from app import db
from app.models.user import User
from app.utils.errors import AppError


def update_profile(user_id: str, display_name: str | None = None, bio: str | None = None, theme_preference: str | None = None) -> User:
    user = User.query.get(user_id)
    if not user:
        raise AppError("User not found", status=404, code="user_not_found")
    if display_name is not None:
        user.display_name = display_name.strip()
    if bio is not None:
        user.bio = bio.strip()
    if theme_preference is not None:
        if theme_preference not in ("dark", "light"):
            raise AppError("Theme must be 'dark' or 'light'", status=400, code="invalid_theme")
        user.theme_preference = theme_preference
    db.session.commit()
    return user


def update_avatar(user_id: str, file) -> str:
    user = User.query.get(user_id)
    if not user:
        raise AppError("User not found", status=404, code="user_not_found")
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "png"
    if ext not in ("png", "jpg", "jpeg", "gif", "webp"):
        raise AppError("Invalid image format", status=400, code="invalid_image")
    filename = f"avatar_{user_id}.{ext}"
    upload_dir = os.path.join(current_app.root_path, "..", "uploads", "avatars")
    os.makedirs(upload_dir, exist_ok=True)
    file.save(os.path.join(upload_dir, filename))
    user.avatar_url = f"/uploads/avatars/{filename}"
    db.session.commit()
    return user.avatar_url
