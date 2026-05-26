from flask import Flask
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
    app.config["TURNSTILE_SECRET_KEY"] = config.turnstile_secret_key
    app.config["POW_DIFFICULTY"] = config.pow_difficulty

    CORS(app, origins=[config.origin], supports_credentials=True)
    db.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)

    from app.api import api_bp
    app.register_blueprint(api_bp, url_prefix="/api/v1")

    @app.after_request
    def security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "0"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app
