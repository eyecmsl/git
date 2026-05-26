from __future__ import annotations

import json
import uuid
from base64 import b64encode, b64decode

from webauthn import generate_registration_options, verify_registration_response
from webauthn import generate_authentication_options, verify_authentication_response
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
)
from webauthn.helpers.options_to_json import options_to_json

from config import config
from app.models.credential import Credential
from app import db


challenge_store: dict[str, dict] = {}


def _generate_challenge_id() -> str:
    return str(uuid.uuid4())


def _b64_encode(data: bytes) -> str:
    return b64encode(data).decode("utf-8")


def _b64_decode(data: str) -> bytes:
    return b64decode(data)


def start_registration(user_id: str, email: str, display_name: str) -> tuple[str, dict]:
    challenge_id = _generate_challenge_id()

    options = generate_registration_options(
        rp_id=config.rp_id,
        rp_name=config.rp_name,
        user_id=user_id.encode(),
        user_name=email,
        user_display_name=display_name,
        authenticator_selection=AuthenticatorSelectionCriteria(
            user_verification=UserVerificationRequirement.REQUIRED,
        ),
    )

    challenge_store[challenge_id] = {
        "challenge": options.challenge,
        "user_id": user_id,
        "type": "registration",
    }

    return challenge_id, json.loads(options_to_json(options))


def complete_registration(challenge_id: str, credential_data: dict) -> Credential:
    session = challenge_store.pop(challenge_id, None)
    if not session:
        raise ValueError("Challenge not found or expired")

    try:
        verification = verify_registration_response(
            credential=credential_data,
            expected_challenge=session["challenge"],
            expected_rp_id=config.rp_id,
            expected_origin=config.origin,
        )
    except Exception as e:
        raise ValueError(f"Registration verification failed: {e}")

    cred_id_b64 = _b64_encode(verification.credential_id)
    existing = Credential.query.filter_by(credential_id=cred_id_b64).first()
    if existing:
        raise ValueError("Credential already registered")

    cred = Credential(
        user_id=session["user_id"],
        credential_id=cred_id_b64,
        public_key=_b64_encode(verification.credential_public_key),
        sign_count=verification.sign_count,
        device_name=credential_data.get("device_name", "Unknown Device"),
    )
    db.session.add(cred)
    db.session.commit()
    return cred


def start_authentication(email: str) -> tuple[str, dict]:
    challenge_id = _generate_challenge_id()

    options = generate_authentication_options(
        rp_id=config.rp_id,
        user_verification=UserVerificationRequirement.REQUIRED,
    )

    challenge_store[challenge_id] = {
        "challenge": options.challenge,
        "email": email,
        "type": "authentication",
    }

    return challenge_id, json.loads(options_to_json(options))


def complete_authentication(challenge_id: str, credential_data: dict) -> str:
    session = challenge_store.pop(challenge_id, None)
    if not session:
        raise ValueError("Challenge not found or expired")

    cred_id_b64 = credential_data.get("id", "")
    cred = Credential.query.filter_by(credential_id=cred_id_b64).first()
    if not cred:
        raise ValueError("Credential not found")

    try:
        verification = verify_authentication_response(
            credential=credential_data,
            expected_challenge=session["challenge"],
            expected_rp_id=config.rp_id,
            expected_origin=config.origin,
            credential_public_key=_b64_decode(cred.public_key),
            credential_current_sign_count=cred.sign_count,
        )
    except Exception as e:
        raise ValueError(f"Authentication verification failed: {e}")

    cred.sign_count = verification.new_sign_count
    cred.last_used_at = db.func.now()
    db.session.commit()

    return cred.user_id
