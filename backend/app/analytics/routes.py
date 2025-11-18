"""
Analytics routes for fetching detection statistics and session history.
"""
from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import DetectionSession, FrameResult, AggregatedVerdict
from app.analytics import analytics_bp
from sqlalchemy import func
from datetime import datetime, timedelta


@analytics_bp.route('/sessions', methods=['GET'])
@jwt_required()
def list_sessions():
    """
    List user's detection sessions.
    GET /api/analytics/sessions?page=1&per_page=20&source=all
    Headers: Authorization: Bearer <access_token>
    """
    user_id = get_jwt_identity()
    
    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), current_app.config['MAX_PAGE_SIZE'])
    source = request.args.get('source', 'all')  # 'all', 'extension', 'web_upload'
    
    # Build query
    query = DetectionSession.query.filter_by(user_id=user_id)
    
    if source != 'all':
        query = query.filter_by(source=source)
    
    # Execute query with pagination
    pagination = query.order_by(
        DetectionSession.started_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'sessions': [session.to_dict() for session in pagination.items],
        'pagination': {
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total': pagination.total,
            'pages': pagination.pages
        }
    }), 200


@analytics_bp.route('/sessions/<int:session_id>', methods=['GET'])
@jwt_required()
def get_session_details(session_id):
    """
    Get detailed session information.
    GET /api/analytics/sessions/<session_id>
    Headers: Authorization: Bearer <access_token>
    """
    user_id = get_jwt_identity()
    
    session = DetectionSession.query.filter_by(
        id=session_id,
        user_id=user_id
    ).first()
    
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    
    return jsonify({
        'session': session.to_dict()
    }), 200


@analytics_bp.route('/sessions/<int:session_id>/frames', methods=['GET'])
@jwt_required()
def get_session_frames(session_id):
    """
    Get frame-level detection results for a session.
    GET /api/analytics/sessions/<session_id>/frames?page=1&per_page=50
    Headers: Authorization: Bearer <access_token>
    """
    user_id = get_jwt_identity()
    
    session = DetectionSession.query.filter_by(
        id=session_id,
        user_id=user_id
    ).first()
    
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    
    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 50, type=int), current_app.config['MAX_PAGE_SIZE'])
    
    # Query frame results
    pagination = FrameResult.query.filter_by(
        session_id=session_id
    ).order_by(
        FrameResult.timestamp.asc()
    ).paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'frames': [frame.to_dict() for frame in pagination.items],
        'pagination': {
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total': pagination.total,
            'pages': pagination.pages
        }
    }), 200


@analytics_bp.route('/sessions/<int:session_id>/aggregated', methods=['GET'])
@jwt_required()
def get_session_aggregated(session_id):
    """
    Get aggregated verdicts (sliding window) for a session.
    GET /api/analytics/sessions/<session_id>/aggregated
    Headers: Authorization: Bearer <access_token>
    """
    user_id = get_jwt_identity()
    
    session = DetectionSession.query.filter_by(
        id=session_id,
        user_id=user_id
    ).first()
    
    if not session:
        return jsonify({'error': 'Session not found'}), 404
    
    # Get aggregated verdicts
    verdicts = AggregatedVerdict.query.filter_by(
        session_id=session_id
    ).order_by(
        AggregatedVerdict.window_start.asc()
    ).all()
    
    return jsonify({
        'aggregated_verdicts': [verdict.to_dict() for verdict in verdicts]
    }), 200


@analytics_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_user_stats():
    """
    Get overall user statistics.
    GET /api/analytics/stats
    Headers: Authorization: Bearer <access_token>
    """
    user_id = get_jwt_identity()
    
    # Total sessions
    total_sessions = DetectionSession.query.filter_by(user_id=user_id).count()
    
    # Total frames analyzed
    total_frames = db.session.query(
        func.sum(DetectionSession.total_frames)
    ).filter_by(user_id=user_id).scalar() or 0
    
    # Sessions by source
    extension_sessions = DetectionSession.query.filter_by(
        user_id=user_id,
        source='extension'
    ).count()
    
    web_upload_sessions = DetectionSession.query.filter_by(
        user_id=user_id,
        source='web_upload'
    ).count()
    
    # Detection distribution
    detection_counts = db.session.query(
        FrameResult.prediction,
        func.count(FrameResult.id)
    ).join(DetectionSession).filter(
        DetectionSession.user_id == user_id
    ).group_by(FrameResult.prediction).all()
    
    detection_distribution = {pred: count for pred, count in detection_counts}
    
    return jsonify({
        'total_sessions': total_sessions,
        'total_frames_analyzed': int(total_frames),
        'sessions_by_source': {
            'extension': extension_sessions,
            'web_upload': web_upload_sessions
        },
        'detection_distribution': detection_distribution
    }), 200


@analytics_bp.route('/dashboard-stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """
    Get comprehensive dashboard statistics with recent activity.
    GET /api/analytics/dashboard-stats
    Headers: Authorization: Bearer <access_token>
    """
    user_id = get_jwt_identity()
    
    # Calculate time ranges
    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)
    
    # Total statistics
    total_sessions = DetectionSession.query.filter_by(user_id=user_id).count()
    total_frames = db.session.query(
        func.sum(DetectionSession.total_frames)
    ).filter_by(user_id=user_id).scalar() or 0
    
    # Sessions by source
    extension_sessions = DetectionSession.query.filter_by(
        user_id=user_id,
        source='extension'
    ).count()
    
    web_upload_sessions = DetectionSession.query.filter_by(
        user_id=user_id,
        source='web_upload'
    ).count()
    
    # Recent activity (last 24 hours)
    recent_sessions = DetectionSession.query.filter(
        DetectionSession.user_id == user_id,
        DetectionSession.started_at >= last_24h
    ).count()
    
    recent_frames = db.session.query(
        func.sum(DetectionSession.total_frames)
    ).filter(
        DetectionSession.user_id == user_id,
        DetectionSession.started_at >= last_24h
    ).scalar() or 0
    
    # Detection distribution (all time)
    detection_counts = db.session.query(
        FrameResult.prediction,
        func.count(FrameResult.id)
    ).join(DetectionSession).filter(
        DetectionSession.user_id == user_id
    ).group_by(FrameResult.prediction).all()
    
    distribution = {
        'REAL': 0,
        'FAKE': 0,
        'NO_FACE': 0,
        'SUSPICIOUS': 0
    }
    
    for pred, count in detection_counts:
        if pred in distribution:
            distribution[pred] = count
        else:
            distribution['SUSPICIOUS'] += count  # Any other prediction
    
    total_detections = sum(distribution.values())
    distribution_percentage = {
        key: round((count / total_detections * 100), 2) if total_detections > 0 else 0
        for key, count in distribution.items()
    }
    
    # Recent sessions list (last 5)
    recent_session_list = DetectionSession.query.filter_by(
        user_id=user_id
    ).order_by(
        DetectionSession.started_at.desc()
    ).limit(5).all()
    
    # Activity trend (last 7 days)
    daily_activity = db.session.query(
        func.date(DetectionSession.started_at).label('date'),
        func.count(DetectionSession.id).label('sessions'),
        func.sum(DetectionSession.total_frames).label('frames')
    ).filter(
        DetectionSession.user_id == user_id,
        DetectionSession.started_at >= last_7d
    ).group_by(
        func.date(DetectionSession.started_at)
    ).order_by('date').all()
    
    activity_trend = [
        {
            'date': str(row.date),
            'sessions': row.sessions,
            'frames': int(row.frames or 0)
        }
        for row in daily_activity
    ]
    
    return jsonify({
        'overview': {
            'total_sessions': total_sessions,
            'total_frames_analyzed': int(total_frames),
            'extension_sessions': extension_sessions,
            'web_upload_sessions': web_upload_sessions
        },
        'recent_activity': {
            'sessions_24h': recent_sessions,
            'frames_24h': int(recent_frames)
        },
        'detection_distribution': {
            'counts': distribution,
            'percentages': distribution_percentage
        },
        'recent_sessions': [session.to_dict() for session in recent_session_list],
        'activity_trend': activity_trend
    }), 200
