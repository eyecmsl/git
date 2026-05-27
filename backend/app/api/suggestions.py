from flask import request, jsonify

from app.api import api_bp
from app.middleware.auth_middleware import require_auth
from app.models.resource import Resource
from app.models.tag import Tag


@api_bp.get("/suggestions")
@require_auth
def suggestions():
    q = request.args.get("q", "").strip().lower()
    if not q or len(q) < 1:
        return jsonify({"titles": [], "tags": [], "categories": []})

    titles = []
    for r in Resource.query.filter(Resource.title.ilike(f"%{q}%")).limit(5).all():
        if r.title not in titles:
            titles.append(r.title)

    tags = []
    for t in Tag.query.filter(Tag.name.ilike(f"{q}%")).limit(5).all():
        tags.append(t.name)

    categories = []
    from sqlalchemy import distinct
    for row in Resource.query.with_entities(distinct(Resource.category)).filter(
        Resource.category.isnot(None), Resource.category != "",
        Resource.category.ilike(f"{q}%"),
    ).limit(5).all():
        if row[0] and row[0] not in categories:
            categories.append(row[0])

    return jsonify({"titles": titles, "tags": tags, "categories": categories})
