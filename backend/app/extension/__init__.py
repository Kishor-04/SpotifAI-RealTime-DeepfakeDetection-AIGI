"""
Extension API blueprint for browser extension integration.
"""
from flask import Blueprint

extension_bp = Blueprint('extension', __name__)

from app.extension import routes
