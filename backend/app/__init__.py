import os

from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_sqlalchemy import SQLAlchemy

from config import config

db = SQLAlchemy()
migrate = Migrate()
limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")


def create_app() -> Flask:
    app = Flask(__name__)

    app.config["SECRET_KEY"] = config.secret_key
    app.config["SQLALCHEMY_DATABASE_URI"] = config.database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["TURNSTILE_ENABLED"] = config.turnstile_enabled
    app.config["TURNSTILE_SECRET_KEY"] = config.turnstile_secret_key
    app.config["POW_DIFFICULTY"] = config.pow_difficulty
    app.config["RATELIMIT_ENABLED"] = os.getenv("RATELIMIT_ENABLED", "false").lower() in ("1", "true", "yes")
    app.config["ALLOWED_ORIGINS"] = config.allowed_origins

    CORS(app, origins=[config.origin], supports_credentials=True)
    db.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)

    from app.api import api_bp
    app.register_blueprint(api_bp, url_prefix="/api/v1")

    from app.utils.errors import register_error_handlers
    register_error_handlers(app)

    upload_dir = os.path.join(app.root_path, "..", "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    @app.get("/uploads/<path:filename>")
    def serve_upload(filename: str):
        return send_from_directory(upload_dir, filename)

    @app.after_request
    def security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app
