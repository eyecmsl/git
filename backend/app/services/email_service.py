from __future__ import annotations

import smtplib
import os
from email.mime.text import MIMEText

_smtp_host = os.getenv("SMTP_HOST", "")
_smtp_port = int(os.getenv("SMTP_PORT", "587"))
_smtp_user = os.getenv("SMTP_USER", "")
_smtp_pass = os.getenv("SMTP_PASS", "")
_from_addr = os.getenv("SMTP_FROM", "noreply@tea.local")


def is_configured() -> bool:
    return bool(_smtp_host and _smtp_user and _smtp_pass)


def send_email(to: str, subject: str, body: str) -> bool:
    if not is_configured():
        return False
    try:
        msg = MIMEText(body, "plain")
        msg["Subject"] = subject
        msg["From"] = _from_addr
        msg["To"] = to
        with smtplib.SMTP(_smtp_host, _smtp_port) as s:
            s.starttls()
            s.login(_smtp_user, _smtp_pass)
            s.send_message(msg)
        return True
    except Exception:
        return False


def notify_new_resource(email: str, resource_title: str, site_url: str) -> bool:
    return send_email(
        email,
        f"New resource: {resource_title}",
        f"A new resource has been added: {resource_title}\n\nView it at: {site_url}/dashboard",
    )
