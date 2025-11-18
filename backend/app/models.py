"""
Database models for SpotifAI backend.
"""
from datetime import datetime, timedelta
from app import db
from werkzeug.security import generate_password_hash, check_password_hash
import secrets


class User(db.Model):
    """User model for authentication."""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    username = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)  # Null for OAuth users
    oauth_provider = db.Column(db.String(50), nullable=True)  # 'google', 'email'
    oauth_id = db.Column(db.String(255), nullable=True)  # OAuth provider user ID
    reset_otp = db.Column(db.String(6), nullable=True)  # 6-digit OTP for password reset
    reset_otp_expires = db.Column(db.DateTime, nullable=True)  # OTP expiration timestamp
    email_verified = db.Column(db.Boolean, default=False, nullable=False)  # Email verification status
    verification_otp = db.Column(db.String(6), nullable=True)  # 6-digit OTP for email verification
    verification_otp_expires = db.Column(db.DateTime, nullable=True)  # Verification OTP expiration
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sessions = db.relationship('DetectionSession', back_populates='user', cascade='all, delete-orphan')
    videos = db.relationship('VideoUpload', back_populates='user', cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set password."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Verify password against hash."""
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)
    
    def generate_reset_otp(self, expiry_minutes=10):
        """Generate a 6-digit OTP for password reset."""
        self.reset_otp = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
        self.reset_otp_expires = datetime.utcnow() + timedelta(minutes=expiry_minutes)
        return self.reset_otp
    
    def verify_reset_otp(self, otp):
        """Verify if the provided OTP is valid and not expired."""
        if not self.reset_otp or not self.reset_otp_expires:
            return False
        if datetime.utcnow() > self.reset_otp_expires:
            return False
        return self.reset_otp == otp
    
    def clear_reset_otp(self):
        """Clear the OTP after successful password reset."""
        self.reset_otp = None
        self.reset_otp_expires = None
    
    def generate_verification_otp(self, expiry_minutes=10):
        """Generate a 6-digit OTP for email verification."""
        self.verification_otp = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
        self.verification_otp_expires = datetime.utcnow() + timedelta(minutes=expiry_minutes)
        return self.verification_otp
    
    def verify_email_otp(self, otp):
        """Verify if the provided OTP is valid and not expired."""
        if not self.verification_otp or not self.verification_otp_expires:
            return False
        if datetime.utcnow() > self.verification_otp_expires:
            return False
        return self.verification_otp == otp
    
    def clear_verification_otp(self):
        """Clear the verification OTP after successful verification."""
        self.verification_otp = None
        self.verification_otp_expires = None
        self.email_verified = True
    
    def to_dict(self):
        """Convert user to dictionary."""
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'oauth_provider': self.oauth_provider,
            'email_verified': self.email_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<User {self.email}>'


class VideoUpload(db.Model):
    """Model for uploaded videos."""
    __tablename__ = 'video_uploads'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)
    filepath = db.Column(db.String(500), nullable=False)
    filesize = db.Column(db.BigInteger, nullable=False)  # in bytes
    duration = db.Column(db.Float, nullable=True)  # in seconds
    fps = db.Column(db.Integer, nullable=True)
    width = db.Column(db.Integer, nullable=True)
    height = db.Column(db.Integer, nullable=True)
    status = db.Column(db.String(50), default='uploaded')  # uploaded, processing, completed, failed
    progress = db.Column(db.Float, default=0.0)  # 0.0 to 100.0
    error_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', back_populates='videos')
    session = db.relationship('DetectionSession', back_populates='video', uselist=False, cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert video upload to dictionary."""
        return {
            'id': self.id,
            'filename': self.filename,
            'filesize': self.filesize,
            'duration': self.duration,
            'fps': self.fps,
            'width': self.width,
            'height': self.height,
            'status': self.status,
            'progress': self.progress,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<VideoUpload {self.filename}>'


class DetectionSession(db.Model):
    """Model for detection sessions (both extension and web uploads)."""
    __tablename__ = 'detection_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)  # Null for unlinked extension
    video_id = db.Column(db.Integer, db.ForeignKey('video_uploads.id'), nullable=True, index=True)  # Null for extension
    source = db.Column(db.String(20), nullable=False)  # 'extension' or 'web_upload'
    video_url = db.Column(db.String(500), nullable=True)  # For extension: YouTube URL
    video_title = db.Column(db.String(500), nullable=True)
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    ended_at = db.Column(db.DateTime, nullable=True)
    fps = db.Column(db.Integer, nullable=False)  # 1 for extension, 10 for uploads
    total_frames = db.Column(db.Integer, default=0)
    session_metadata = db.Column(db.JSON, nullable=True)  # Browser info, etc. (renamed from metadata)
    
    # Relationships
    user = db.relationship('User', back_populates='sessions')
    video = db.relationship('VideoUpload', back_populates='session')
    frame_results = db.relationship('FrameResult', back_populates='session', cascade='all, delete-orphan')
    aggregated_verdicts = db.relationship('AggregatedVerdict', back_populates='session', cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert session to dictionary."""
        return {
            'id': self.id,
            'source': self.source,
            'video_url': self.video_url,
            'video_title': self.video_title,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'fps': self.fps,
            'total_frames': self.total_frames,
            'session_metadata': self.session_metadata
        }
    
    def __repr__(self):
        return f'<DetectionSession {self.id} ({self.source})>'


class FrameResult(db.Model):
    """Model for individual frame detection results."""
    __tablename__ = 'frame_results'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('detection_sessions.id'), nullable=False, index=True)
    timestamp = db.Column(db.Float, nullable=False)  # Video timestamp in seconds
    frame_number = db.Column(db.Integer, nullable=False)
    prediction = db.Column(db.String(20), nullable=False)  # 'REAL', 'FAKE', 'NO_FACE'
    confidence = db.Column(db.Float, nullable=False)  # 0.0 to 100.0
    bbox = db.Column(db.JSON, nullable=True)  # [x, y, w, h] normalized coordinates
    model_outputs = db.Column(db.JSON, nullable=True)  # Detailed per-model results
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    session = db.relationship('DetectionSession', back_populates='frame_results')
    
    # Composite index for efficient queries
    __table_args__ = (
        db.Index('idx_session_timestamp', 'session_id', 'timestamp'),
    )
    
    def to_dict(self):
        """Convert frame result to dictionary."""
        return {
            'id': self.id,
            'timestamp': self.timestamp,
            'frame_number': self.frame_number,
            'prediction': self.prediction,
            'confidence': self.confidence,
            'bbox': self.bbox,
            'model_outputs': self.model_outputs,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<FrameResult {self.id} ({self.prediction})>'


class AggregatedVerdict(db.Model):
    """Model for sliding window aggregated verdicts."""
    __tablename__ = 'aggregated_verdicts'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('detection_sessions.id'), nullable=False, index=True)
    window_start = db.Column(db.Float, nullable=False)  # Timestamp in seconds
    window_end = db.Column(db.Float, nullable=False)
    verdict = db.Column(db.String(20), nullable=False)  # Majority vote result
    confidence = db.Column(db.Float, nullable=False)
    fake_count = db.Column(db.Integer, default=0)
    real_count = db.Column(db.Integer, default=0)
    no_face_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    session = db.relationship('DetectionSession', back_populates='aggregated_verdicts')
    
    def to_dict(self):
        """Convert aggregated verdict to dictionary."""
        return {
            'id': self.id,
            'window_start': self.window_start,
            'window_end': self.window_end,
            'verdict': self.verdict,
            'confidence': self.confidence,
            'fake_count': self.fake_count,
            'real_count': self.real_count,
            'no_face_count': self.no_face_count
        }
    
    def __repr__(self):
        return f'<AggregatedVerdict {self.id} ({self.verdict})>'


class ExtensionLink(db.Model):
    """Model for extension-to-account linking."""
    __tablename__ = 'extension_links'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True, index=True)
    extension_token = db.Column(db.String(500), unique=True, nullable=False, index=True)
    is_active = db.Column(db.Boolean, default=True)
    linked_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_sync_at = db.Column(db.DateTime, nullable=True)
    
    def to_dict(self):
        """Convert extension link to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'is_active': self.is_active,
            'linked_at': self.linked_at.isoformat() if self.linked_at else None,
            'last_sync_at': self.last_sync_at.isoformat() if self.last_sync_at else None
        }
    
    def __repr__(self):
        return f'<ExtensionLink user_id={self.user_id}>'
