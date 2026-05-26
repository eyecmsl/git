from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

from app import create_app
from app.utils.errors import register_error_handlers
from app.utils.logging import setup_logging

setup_logging()

app = create_app()
register_error_handlers(app)

if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        debug=os.getenv("FLASK_ENV") == "development",
    )
