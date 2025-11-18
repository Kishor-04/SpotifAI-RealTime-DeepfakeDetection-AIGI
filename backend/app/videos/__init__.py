"""
Videos blueprint for SpotifAI.
"""
from flask import Blueprint

videos_bp = Blueprint('videos', __name__)

from app.videos import routes, consumers
