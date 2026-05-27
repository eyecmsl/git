from __future__ import annotations

import uuid
from datetime import datetime, timezone
from functools import wraps

from flask import request, g

from app import db
from app.models.audit_log import AuditLog


def log_action(action: str, resource_type: str | None = None, resource_id: str | None = None, details: str | None = None) -> AuditLog:
    log = AuditLog(
        id=str(uuid.uuid4()),
        user_id=getattr(g, "current_user", None) and g.current_user.id or None,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=request.remote_addr if request else None,
    )
    db.session.add(log)
    db.session.commit()
    return log


def get_audit_logs(limit: int = 100) -> list[AuditLog]:
    return AuditLog.query.order_by(AuditLog.created_at.desc()).limit(limit).all()


def audit(action: str, resource_type: str | None = None):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            result = f(*args, **kwargs)
            try:
                log_action(action, resource_type)
            except Exception:
                pass
            return result
        return wrapped
    return decorator
