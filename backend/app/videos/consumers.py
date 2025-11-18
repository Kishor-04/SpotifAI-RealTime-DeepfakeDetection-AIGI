"""
WebSocket consumers for real-time video processing updates.
"""
from flask_socketio import emit, join_room, leave_room
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app import socketio, db
from app.models import VideoUpload


@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection."""
    print('Client connected')


@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket disconnection."""
    print('Client disconnected')


@socketio.on('join_video_room')
def handle_join_video_room(data):
    """
    Join a video processing room to receive real-time updates.
    data: { "video_id": 123, "token": "jwt_token" }
    """
    try:
        # Verify JWT token from WebSocket message
        # Note: In production, use proper JWT verification for WebSocket
        video_id = data.get('video_id')
        
        if not video_id:
            emit('error', {'message': 'Video ID required'})
            return
        
        room = f'video_{video_id}'
        join_room(room)
        
        emit('joined', {
            'message': f'Joined video {video_id} room',
            'video_id': video_id
        })
        
    except Exception as e:
        emit('error', {'message': str(e)})


@socketio.on('leave_video_room')
def handle_leave_video_room(data):
    """
    Leave a video processing room.
    data: { "video_id": 123 }
    """
    video_id = data.get('video_id')
    
    if not video_id:
        emit('error', {'message': 'Video ID required'})
        return
    
    room = f'video_{video_id}'
    leave_room(room)
    
    emit('left', {
        'message': f'Left video {video_id} room',
        'video_id': video_id
    })
