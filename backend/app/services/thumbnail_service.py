from __future__ import annotations

import os
from io import BytesIO

from PIL import Image
from flask import current_app

_THUMB_SIZE = (320, 240)


def generate_thumbnail(file_path: str, file_type: str | None) -> str | None:
    upload_dir = os.path.join(current_app.root_path, "..", "uploads")
    full_path = os.path.join(upload_dir, file_path)
    thumb_dir = os.path.join(upload_dir, "thumbnails")
    os.makedirs(thumb_dir, exist_ok=True)

    thumb_filename = f"thumb_{os.path.basename(file_path)}.jpg"
    thumb_path = os.path.join(thumb_dir, thumb_filename)

    if file_type and file_type.lower() in ("png", "jpg", "jpeg", "gif", "webp"):
        try:
            img = Image.open(full_path)
            img.thumbnail(_THUMB_SIZE, Image.LANCZOS)
            if img.mode == "RGBA":
                img = img.convert("RGB")
            img.save(thumb_path, "JPEG", quality=75)
            return f"/uploads/thumbnails/{thumb_filename}"
        except Exception:
            return None

    if file_type and file_type.lower() == "pdf":
        try:
            import fitz
            doc = fitz.open(full_path)
            page = doc[0]
            pix = page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5))
            pix.save(thumb_path)
            doc.close()
            return f"/uploads/thumbnails/{thumb_filename}"
        except ImportError:
            return None
        except Exception:
            return None

    return None
