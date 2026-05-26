from __future__ import annotations

from urllib.request import Request, urlopen
from urllib.parse import urlencode


def verify_turnstile_token(token: str, secret_key: str, remote_ip: str | None = None) -> bool:
    data = {
        "secret": secret_key,
        "response": token,
    }
    if remote_ip:
        data["remoteip"] = remote_ip

    body = urlencode(data).encode()
    req = Request(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        data=body,
        method="POST",
    )
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with urlopen(req, timeout=10) as resp:
            result = resp.read().decode()
    except Exception:
        return False

    import json
    return json.loads(result).get("success", False)
