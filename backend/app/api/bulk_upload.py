from flask import request, jsonify, g

from app.api import api_bp
from app.middleware.auth_middleware import require_role
from app.services.resource_service import create_resource
from app.utils.errors import AppError

MAX_UPLOAD_SIZE = 50 * 1024 * 1024


@api_bp.post("/resources/bulk")
@require_role("owner", "admin")
def bulk_upload():
    files = request.files.getlist("files")
    if not files:
        raise AppError("No files provided", status=400, code="no_files")

    default_title = request.form.get("title", "").strip()
    default_category = request.form.get("category", "").strip()
    default_password = request.form.get("password", "").strip() or None
    default_requires_membership = request.form.get("requires_membership", "false").lower() in ("1", "true", "yes")

    results = []
    errors = []

    for file in files:
        if not file.filename:
            continue
        if file.content_length and file.content_length > MAX_UPLOAD_SIZE:
            errors.append({"filename": file.filename, "error": "File too large"})
            continue

        title = default_title or file.filename.rsplit(".", 1)[0]
        try:
            resource = create_resource(
                title=f"{title} - {file.filename}",
                description="",
                category=default_category,
                file=file,
                uploader_id=g.current_user.id,
                password=default_password,
                requires_membership=default_requires_membership,
            )
            results.append(resource.to_dict())
        except Exception as e:
            errors.append({"filename": file.filename, "error": str(e)})

    return jsonify({"resources": results, "errors": errors, "total": len(results), "failed": len(errors)}), 201 if results else 400
