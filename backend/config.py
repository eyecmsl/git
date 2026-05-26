from __future__ import annotations

import os
import secrets
from dataclasses import dataclass, field

_DEFAULT_SECRET_PREFIXES = ("dev-", "change-me-", "<your-")


def _secure_secret(env_var: str, default: str) -> str:
    raw = os.getenv(env_var, default)
    if any(raw.startswith(p) for p in _DEFAULT_SECRET_PREFIXES):
        return secrets.token_hex(32)
    return raw


@dataclass(frozen=True)
class Config:
    secret_key: str = field(default_factory=lambda: _secure_secret("SECRET_KEY", "dev-key"))
    database_url: str = field(default_factory=lambda: os.getenv("DATABASE_URL", "sqlite:///tea.db"))

    jwt_secret: str = field(default_factory=lambda: _secure_secret("JWT_SECRET", "dev-jwt-secret"))
    jwt_access_expires: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "900"))
    jwt_refresh_expires: int = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", "2592000"))
    rp_id: str = os.getenv("RP_ID", "localhost")
    rp_name: str = os.getenv("RP_NAME", "Tea App")
    origin: str = os.getenv("ORIGIN", "http://localhost:3000")
    bcrypt_rounds: int = 12
    turnstile_secret_key: str = field(default_factory=lambda: os.getenv("TURNSTILE_SECRET_KEY", "0x000000000000000000000000000000000000000"))


config = Config()
