from flask import jsonify, g

from app.api import api_bp
from app.middleware.auth_middleware import require_auth
from app.services.recently_viewed_service import get_recently_viewed


@api_bp.get("/recently-viewed")
@require_auth
def list_recent():
    items = get_recently_viewed(g.current_user.id)
    return jsonify({"recent": [i.to_dict() for i in items]})
