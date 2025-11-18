"""  
Flask application factory and configuration.
"""
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_caching import Cache
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
socketio = SocketIO()
cache = Cache()


def create_app(config_name='development'):
    """
    Application factory pattern for creating Flask app.
    """
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(f'config.{config_name.capitalize()}Config')
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
    # Configure CORS - Allow all origins in development (YouTube, chrome extensions, localhost)
    # This enables extension sync from YouTube pages and frontend from any localhost port
    CORS(app, 
         resources={
             r"/*": {
                 "origins": "*",
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization"],
                 "expose_headers": ["Content-Type", "Authorization"],
                 "supports_credentials": False
             }
         })
    
    # Configure SocketIO
    # Use Redis message queue only in production, use simple mode in development
    socketio_config = {
        'cors_allowed_origins': app.config['CORS_ORIGINS'],
        'async_mode': 'eventlet',
        'logger': False,
        'engineio_logger': False
    }
    
    # Only use Redis message queue if in production
    if config_name.lower() == 'production':
        try:
            socketio_config['message_queue'] = app.config['SOCKETIO_MESSAGE_QUEUE']
        except Exception as e:
            print(f'Warning: Could not configure Redis for SocketIO: {e}')
    
    socketio.init_app(app, **socketio_config)
    
    # Configure caching
    # Use Redis cache in production, simple cache in development
    if config_name.lower() == 'production':
        try:
            cache.init_app(app, config={
                'CACHE_TYPE': 'RedisCache',
                'CACHE_REDIS_URL': app.config['REDIS_URL']
            })
        except Exception as e:
            print(f'Warning: Could not configure Redis cache: {e}')
            cache.init_app(app, config={'CACHE_TYPE': 'SimpleCache'})
    else:
        # Use simple in-memory cache for development
        cache.init_app(app, config={'CACHE_TYPE': 'SimpleCache'})
    
    # Register blueprints
    from app.auth import auth_bp
    from app.videos import videos_bp
    from app.analytics import analytics_bp
    from app.extension import extension_bp
    from app.public import public_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(videos_bp, url_prefix='/api/videos')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(extension_bp, url_prefix='/api/extension')
    app.register_blueprint(public_bp)  # Already has /api/public prefix
    
    # Register error handlers
    from app.errors import register_error_handlers
    register_error_handlers(app)
    
    # Create upload directories
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    return app
