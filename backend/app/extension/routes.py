"""
Extension linking and synchronization routes.
"""
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
from app import db
from app.models import ExtensionLink, DetectionSession, FrameResult, User
from app.extension import extension_bp
from datetime import datetime
import secrets


@extension_bp.route('/link', methods=['POST'])
@jwt_required()
def link_extension():
    """
    Link browser extension to user account.
    POST /api/extension/link
    Headers: Authorization: Bearer <access_token>
    Returns: { "extension_token": "token_for_extension_to_store" }
    """
    user_id = get_jwt_identity()
    
    # Check if already linked
    existing_link = ExtensionLink.query.filter_by(user_id=user_id).first()
    
    if existing_link:
        # Update existing link
        existing_link.extension_token = secrets.token_urlsafe(32)
        existing_link.is_active = True
        existing_link.linked_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Extension re-linked successfully',
            'extension_token': existing_link.extension_token
        }), 200
    
    # Create new extension link
    extension_token = secrets.token_urlsafe(32)
    
    link = ExtensionLink(
        user_id=user_id,
        extension_token=extension_token
    )
    
    db.session.add(link)
    db.session.commit()
    
    return jsonify({
        'message': 'Extension linked successfully',
        'extension_token': extension_token
    }), 201


@extension_bp.route('/unlink', methods=['POST'])
@jwt_required()
def unlink_extension():
    """
    Unlink browser extension from user account.
    POST /api/extension/unlink
    Headers: Authorization: Bearer <access_token>
    """
    user_id = get_jwt_identity()
    
    link = ExtensionLink.query.filter_by(user_id=user_id).first()
    
    if not link:
        return jsonify({'error': 'Extension not linked'}), 404
    
    link.is_active = False
    db.session.commit()
    
    return jsonify({
        'message': 'Extension unlinked successfully'
    }), 200


@extension_bp.route('/status', methods=['GET'])
@jwt_required()
def get_link_status():
    """
    Check if extension is linked to user account.
    GET /api/extension/status
    Headers: Authorization: Bearer <access_token>
    """
    user_id = get_jwt_identity()
    
    link = ExtensionLink.query.filter_by(user_id=user_id, is_active=True).first()
    
    return jsonify({
        'is_linked': link is not None,
        'linked_at': link.linked_at.isoformat() if link else None,
        'last_sync_at': link.last_sync_at.isoformat() if link and link.last_sync_at else None
    }), 200


@extension_bp.route('/verify', methods=['POST'])
def verify_extension_token():
    """
    Verify extension token (called by extension).
    POST /api/extension/verify
    Body: { "extension_token": "token" }
    Returns: { "user_id": 123, "email": "user@example.com" }
    """
    data = request.get_json()
    
    if not data or 'extension_token' not in data:
        return jsonify({'error': 'Extension token required'}), 400
    
    extension_token = data['extension_token']
    
    # Find link
    link = ExtensionLink.query.filter_by(
        extension_token=extension_token,
        is_active=True
    ).first()
    
    if not link:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    # Get user
    user = User.query.get(link.user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'user_id': user.id,
        'email': user.email,
        'username': user.username
    }), 200


@extension_bp.route('/sync', methods=['POST'])
def sync_extension_data():
    """
    Sync detection data from browser extension.
    POST /api/extension/sync
    Body: {
        "extension_token": "token",
        "video_url": "https://youtube.com/watch?v=xxx",
        "video_title": "Video Title",
        "frames": [
            {
                "timestamp": 1.5,
                "frame_number": 1,
                "prediction": "REAL",
                "confidence": 95.5,
                "bbox": [0.1, 0.2, 0.3, 0.4]
            }
        ]
    }
    """
    from flask import current_app
    import json as json_module
    
    data = request.get_json()
    
    if not data:
        current_app.logger.error('Sync failed: No data provided')
        return jsonify({'error': 'No data provided'}), 400
    
    extension_token = data.get('extension_token')
    
    if not extension_token:
        current_app.logger.error('Sync failed: No extension token')
        return jsonify({'error': 'Extension token required'}), 400
    
    # Verify token
    link = ExtensionLink.query.filter_by(
        extension_token=extension_token,
        is_active=True
    ).first()
    
    if not link:
        current_app.logger.error(f'Sync failed: Invalid token {extension_token[:10]}...')
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    current_app.logger.info(f'Sync request from user {link.user_id}')
    
    # Get data
    video_url = data.get('video_url')
    video_title = data.get('video_title')
    frames = data.get('frames', [])
    
    current_app.logger.info(f'Sync data: URL={video_url}, Title={video_title}, Frames={len(frames)}')
    
    if not frames:
        current_app.logger.warning('Sync warning: No frame data provided')
        return jsonify({'error': 'No frame data provided'}), 400
    
    try:
        # Create new session
        session = DetectionSession(
            user_id=link.user_id,
            source='extension',
            video_url=video_url,
            video_title=video_title,
            fps=1,  # Extension always uses 1 FPS
            total_frames=len(frames),
            session_metadata=data.get('session_stats', {})  # Fixed: use session_metadata not metadata
        )
        
        db.session.add(session)
        db.session.flush()  # Get session ID
        
        current_app.logger.info(f'Created session {session.id} for user {link.user_id}')
        
        # Add frame results
        frames_added = 0
        for frame_data in frames:
            try:
                # Handle bbox - convert to JSON string if it's a list
                bbox_data = frame_data.get('bbox')
                if bbox_data and isinstance(bbox_data, list):
                    # Keep as list - JSON column will handle it
                    bbox_value = bbox_data
                elif bbox_data and isinstance(bbox_data, str):
                    # Try to parse if it's a JSON string
                    try:
                        bbox_value = json_module.loads(bbox_data)
                    except:
                        bbox_value = None
                else:
                    bbox_value = None
                
                frame_result = FrameResult(
                    session_id=session.id,
                    timestamp=float(frame_data.get('timestamp', 0)),
                    frame_number=int(frame_data.get('frame_number', 0)),
                    prediction=frame_data.get('prediction', 'UNKNOWN'),
                    confidence=float(frame_data.get('confidence', 0)) * 100.0,  # Convert 0-1 to 0-100
                    bbox=bbox_value,
                    model_outputs=frame_data.get('model_outputs')
                )
                db.session.add(frame_result)
                frames_added += 1
                
            except Exception as frame_error:
                current_app.logger.error(f'Error adding frame {frame_data.get("frame_number")}: {frame_error}')
                continue
        
        # Update last sync time
        link.last_sync_at = datetime.utcnow()
        
        # Commit everything
        try:
            db.session.commit()
            current_app.logger.info(f'✅ Sync successful: Session {session.id}, {frames_added} frames committed to database')
        except Exception as commit_error:
            db.session.rollback()
            current_app.logger.error(f'❌ Commit failed: {str(commit_error)}', exc_info=True)
            raise
        
        # Verify frames were saved
        saved_count = FrameResult.query.filter_by(session_id=session.id).count()
        current_app.logger.info(f'🔍 Verification: {saved_count} frames found in database for session {session.id}')
        
        return jsonify({
            'message': 'Data synced successfully',
            'session_id': session.id,
            'frames_synced': frames_added
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Sync error: {str(e)}', exc_info=True)
        return jsonify({'error': f'Sync failed: {str(e)}'}), 500


@extension_bp.route('/test-sync', methods=['GET'])
def test_sync():
    """
    Test endpoint to check extension sessions and frame counts.
    GET /api/extension/test-sync
    """
    try:
        from flask import current_app
        
        # Get all extension sessions
        sessions = DetectionSession.query.filter_by(source='extension').order_by(DetectionSession.id.desc()).limit(10).all()
        
        results = []
        for session in sessions:
            frame_count = FrameResult.query.filter_by(session_id=session.id).count()
            results.append({
                'session_id': session.id,
                'user_id': session.user_id,
                'video_title': session.video_title,
                'total_frames_claimed': session.total_frames,
                'actual_frames_in_db': frame_count,
                'started_at': session.started_at.isoformat() if session.started_at else None
            })
        
        current_app.logger.info(f'Test sync: Found {len(sessions)} extension sessions')
        
        return jsonify({
            'total_sessions': len(sessions),
            'sessions': results
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
