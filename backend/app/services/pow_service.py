from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import time


def generate_challenge(secret_key: str, difficulty: int = 16) -> dict:
    challenge_id = secrets.token_urlsafe(16)
    nonce = secrets.token_urlsafe(16)
    expires_at = int(time.time()) + 120

    payload = f"{challenge_id}:{nonce}:{difficulty}:{expires_at}"
    sig = hmac.new(secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()

    return {
        "challenge_id": challenge_id,
        "nonce": nonce,
        "difficulty": difficulty,
        "expires_at": expires_at,
        "sig": sig,
    }


def verify_challenge(
    challenge_id: str,
    solution: str,
    nonce: str,
    difficulty: int,
    expires_at: int,
    sig: str,
    secret_key: str,
) -> bool:
    if int(time.time()) > expires_at:
        return False

    payload = f"{challenge_id}:{nonce}:{difficulty}:{expires_at}"
    expected = hmac.new(secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        return False

    target = "0" * difficulty
    h = hashlib.sha256(f"{nonce}:{solution}".encode()).hexdigest()
    return h.startswith(target)
