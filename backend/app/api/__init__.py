from flask import Blueprint

api_bp = Blueprint("api", __name__)

from app.api import auth
from app.api import challenge
from app.api import resources
from app.api import memberships
from app.api import favorites
from app.api import tags
from app.api import collections
from app.api import audit
from app.api import download_history
from app.api import recently_viewed
from app.api import versions
from app.api import profiles
from app.api import bulk_upload
from app.api import suggestions
