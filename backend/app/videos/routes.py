"""
Video Upload Routes
"""
import os
import uuid
import requests
from flask import request, jsonify, current_app
from werkzeug.utils import secure_filename
from app.videos import videos_bp
from app.models import VideoUpload, DetectionSession, User
from app import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.videos.upload_handler import start_video_processing


ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@videos_bp.route('/native-host-status', methods=['GET'])
def check_native_host_status():
    """
    Check if native host inference server is running and accessible.
    Returns connection status without requiring authentication.
    """
    try:
        host = current_app.config.get('INFERENCE_SERVER_HOST', '127.0.0.1')
        port = current_app.config.get('INFERENCE_SERVER_PORT', 8765)
        url = f"http://{host}:{port}"
        
        # Try to connect with 3 second timeout
        response = requests.get(url, timeout=3)
        
        return jsonify({
            'connected': True,
            'message': 'Native host server is running and accessible',
            'host': host,
            'port': port
        }), 200
        
    except requests.exceptions.ConnectionError:
        return jsonify({
            'connected': False,
            'message': 'Native host server is not running or not accessible',
            'host': host,
            'port': port
        }), 200
        
    except requests.exceptions.Timeout:
        return jsonify({
            'connected': False,
            'message': 'Native host server connection timed out',
            'host': host,
            'port': port
        }), 200
        
    except Exception as e:
        return jsonify({
            'connected': False,
            'message': f'Error checking native host: {str(e)}',
            'host': host,
            'port': port
        }), 200


@videos_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_video():
    """
    Upload video file and start processing.
    Returns immediately with video_id, processing happens in background.
    """
    try:
        user_id = get_jwt_identity()
        
        # Check if file is present
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
        
        file = request.files['video']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': f'Invalid file type. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'}), 400
        
        # Generate unique filename
        original_filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{original_filename}"
        
        # Get upload folder from config
        from flask import current_app
        app = current_app._get_current_object()
        upload_folder = current_app.config['UPLOAD_FOLDER']
        os.makedirs(upload_folder, exist_ok=True)
        
        filepath = os.path.join(upload_folder, unique_filename)
        
        # Save file
        file.save(filepath)
        file_size = os.path.getsize(filepath)
        
        # Check file size
        if file_size > MAX_FILE_SIZE:
            os.remove(filepath)
            return jsonify({'error': f'File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB'}), 400
        
        # Create video upload record
        video = VideoUpload(
            user_id=user_id,
            filename=original_filename,
            filepath=filepath,
            filesize=file_size,
            status='uploaded'
        )
        db.session.add(video)
        db.session.commit()
        
        # Create detection session
        session = DetectionSession(
            user_id=user_id,
            video_id=video.id,
            source='web_upload',
            fps=1  # Will be updated during processing
        )
        db.session.add(session)
        db.session.commit()
        
        # Start background processing
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f'Starting video processing for video {video.id}')
        start_video_processing(app, video.id)
        
        return jsonify({
            'message': 'Video uploaded successfully. Processing started.',
            'video': video.to_dict(),
            'session_id': session.id
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@videos_bp.route('/status/<int:video_id>', methods=['GET'])
@jwt_required()
def get_video_status(video_id):
    """Get video processing status"""
    try:
        user_id = get_jwt_identity()
        
        video = VideoUpload.query.filter_by(id=video_id, user_id=user_id).first()
        
        if not video:
            return jsonify({'error': 'Video not found'}), 404
        
        return jsonify({
            'video': video.to_dict(),
            'session': video.session.to_dict() if video.session else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@videos_bp.route('/list', methods=['GET'])
@jwt_required()
def list_videos():
    """List all uploaded videos for current user"""
    try:
        user_id = get_jwt_identity()
        
        videos = VideoUpload.query.filter_by(user_id=user_id).order_by(VideoUpload.created_at.desc()).all()
        
        return jsonify({
            'videos': [v.to_dict() for v in videos]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@videos_bp.route('/delete/<int:video_id>', methods=['DELETE'])
@jwt_required()
def delete_video(video_id):
    """Delete uploaded video"""
    try:
        user_id = get_jwt_identity()
        
        video = VideoUpload.query.filter_by(id=video_id, user_id=user_id).first()
        
        if not video:
            return jsonify({'error': 'Video not found'}), 404
        
        # Delete file from disk
        if os.path.exists(video.filepath):
            os.remove(video.filepath)
        
        # Delete from database
        db.session.delete(video)
        db.session.commit()
        
        return jsonify({'message': 'Video deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
