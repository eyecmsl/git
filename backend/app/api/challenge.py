from __future__ import annotations

from flask import request, jsonify, current_app

from app.api import api_bp
from app.services.pow_service import generate_challenge, verify_challenge
from app.utils.errors import AppError


@api_bp.post("/challenge")
def get_challenge():
    body = request.get_json() or {}
    difficulty = body.get("difficulty", current_app.config.get("POW_DIFFICULTY", 16))
    challenge = generate_challenge(current_app.config["SECRET_KEY"], difficulty)
    return jsonify(challenge)


@api_bp.post("/challenge/verify")
def verify_challenge_endpoint():
    body = request.get_json()
    if not body:
        raise AppError(400, "Missing request body")

    valid = verify_challenge(
        challenge_id=body.get("challenge_id", ""),
        solution=str(body.get("solution", "")),
        nonce=body.get("nonce", ""),
        difficulty=int(body.get("difficulty", 0)),
        expires_at=int(body.get("expires_at", 0)),
        sig=body.get("sig", ""),
        secret_key=current_app.config["SECRET_KEY"],
    )
    if not valid:
        raise AppError(400, "Invalid PoW solution")

    return jsonify({"verified": True})
