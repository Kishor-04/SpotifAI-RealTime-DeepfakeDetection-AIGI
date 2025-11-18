"""
Flask configuration classes.
"""
import os
from datetime import timedelta


class Config:
    """Base configuration."""
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://spotifai_user:password@localhost:5432/spotifai_db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False
    
    # Redis
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(seconds=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600)))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(seconds=int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES', 86400)))
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    
    # CORS - Allow frontend, YouTube (for extension), and chrome extensions
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000,https://www.youtube.com,https://youtube.com').split(',')
    
    # SocketIO
    SOCKETIO_MESSAGE_QUEUE = os.getenv('SOCKETIO_MESSAGE_QUEUE', 'redis://localhost:6379/0')
    
    # Video Upload
    MAX_UPLOAD_SIZE = int(os.getenv('MAX_UPLOAD_SIZE', 524288000))  # 500 MB
    UPLOAD_FPS = int(os.getenv('UPLOAD_FPS', 10))
    VIDEO_RETENTION_DAYS = int(os.getenv('VIDEO_RETENTION_DAYS', 30))
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', './media/uploads')
    ALLOWED_EXTENSIONS = set(os.getenv('ALLOWED_EXTENSIONS', 'mp4,avi,mov,mkv,webm').split(','))
    
    # Deepfake Detection
    INFERENCE_SERVER_HOST = os.getenv('INFERENCE_SERVER_HOST', '127.0.0.1')
    INFERENCE_SERVER_PORT = int(os.getenv('INFERENCE_SERVER_PORT', 8765))
    MODEL_WEIGHTS_PATH = os.getenv('MODEL_WEIGHTS_PATH', '../DeepfakeBench/training/weights/effort_clip_L14_trainOn_FaceForensic.pth')
    
    # Native Host WebSocket URL (for video processing deepfake detection)
    NATIVE_HOST_WS_URL = os.getenv('NATIVE_HOST_WS_URL', 'ws://localhost:8765')
    
    # Celery
    CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/1')
    CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1')
    
    # Pagination
    DEFAULT_PAGE_SIZE = int(os.getenv('DEFAULT_PAGE_SIZE', 50))
    MAX_PAGE_SIZE = int(os.getenv('MAX_PAGE_SIZE', 200))
    
    # Google OAuth
    GOOGLE_OAUTH_CLIENT_ID = os.getenv('GOOGLE_OAUTH_CLIENT_ID', '')
    GOOGLE_OAUTH_CLIENT_SECRET = os.getenv('GOOGLE_OAUTH_CLIENT_SECRET', '')
    GOOGLE_OAUTH_REDIRECT_URI = os.getenv('GOOGLE_OAUTH_REDIRECT_URI', 'http://localhost:5000/api/auth/google/callback')
    
    # Email Configuration (for OTP)
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'true').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', 'crispinnovator@gmail.com')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', 'qfyg ezli cnqo qowp')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'crispinnovator@gmail.com')
    
    # OTP Configuration
    OTP_EXPIRY_MINUTES = int(os.getenv('OTP_EXPIRY_MINUTES', 10))


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    SQLALCHEMY_ECHO = False  # Disable verbose SQL query logging


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    TESTING = False


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
