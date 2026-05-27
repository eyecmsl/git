from __future__ import annotations

import os


def extract_text_from_file(file_path: str, file_type: str | None) -> str:
    if not file_type:
        return ""

    ft = file_type.lower()

    if ft == "pdf":
        try:
            import fitz
            doc = fitz.open(file_path)
            text = "\n".join(page.get_text() for page in doc)
            doc.close()
            return text
        except ImportError:
            return ""
        except Exception:
            return ""

    if ft in ("txt", "md"):
        try:
            with open(file_path, "r", errors="ignore") as f:
                return f.read()
        except Exception:
            return ""

    return ""
