from flask import Blueprint

api_bp = Blueprint("api", __name__)

from app.api import auth
from app.api import challenge
from app.api import resources
from app.api import memberships
