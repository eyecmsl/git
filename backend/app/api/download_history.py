from flask import jsonify, g

from app.api import api_bp
from app.middleware.auth_middleware import require_auth
from app.services.download_history_service import get_user_downloads


@api_bp.get("/downloads")
@require_auth
def list_downloads():
    downloads = get_user_downloads(g.current_user.id)
    return jsonify({"downloads": [d.to_dict() for d in downloads]})
