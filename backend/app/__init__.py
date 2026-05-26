from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_sqlalchemy import SQLAlchemy

from config import config

db = SQLAlchemy()
migrate = Migrate()
limiter = Limiter(key_func=get_remote_address)


def create_app() -> Flask:
    app = Flask(__name__)

    app.config["SECRET_KEY"] = config.secret_key
    app.config["SQLALCHEMY_DATABASE_URI"] = config.database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    CORS(app, origins=[config.origin], supports_credentials=True)
    db.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)

    from app.api import api_bp
    app.register_blueprint(api_bp, url_prefix="/api/v1")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app
