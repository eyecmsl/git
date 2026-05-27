from flask import jsonify

from app.api import api_bp
from app.middleware.auth_middleware import require_role
from app.services.audit_service import get_audit_logs


@api_bp.get("/admin/audit-logs")
@require_role("owner")
def list_audit_logs():
    logs = get_audit_logs()
    return jsonify({"logs": [l.to_dict() for l in logs]})
