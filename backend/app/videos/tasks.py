"""
Celery tasks for video processing - Optimized to use running WebSocket server.
"""
from celery import Celery
from app import db, create_app
from app.models import VideoUpload, DetectionSession, FrameResult
import cv2
import os
import sys
import torch
import numpy as np
from PIL import Image
import base64
import io
import json
import asyncio
import websockets
import requests

# Initialize Celery
celery = Celery(__name__)


async def send_frame_to_server(ws_url, frame, frame_id):
    """
    Send frame to running WebSocket server and get prediction.
    Uses the same protocol as the extension for consistency.
    """
    try:
        # Convert frame to base64 JPEG
        success, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not success:
            return None
        
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        data_url = f'data:image/jpeg;base64,{img_base64}'
        
        # Create message in same format as extension
        message = {
            'type': 'frame',
            'id': frame_id,
            'videoId': 'web_upload',
            'ts': 0,
            'frameB64': data_url
        }
        
        # Connect to WebSocket server
        async with websockets.connect(ws_url, ping_timeout=10) as websocket:
            # Send frame
            await websocket.send(json.dumps(message))
            
            # Wait for response
            response = await websocket.recv()
            result = json.loads(response)
            
            return result
            
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        return None


def process_frame_with_ws(ws_url, frame, frame_id):
    """
    Synchronous wrapper for async WebSocket frame processing.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(send_frame_to_server(ws_url, frame, frame_id))
        return result
    finally:
        loop.close()


def apply_confidence_transformations(prediction, confidence):
    """
    Apply same confidence transformations as extension.
    NOTE: Extension expects confidence in 0-1 range (NOT 0-100).
    The native_host server already applies transformations, so we just pass through.
    """
    # Handle NO_FACE
    if prediction == 'NO_FACE':
        return prediction, 0.0
    
    # Ensure confidence is in 0-1 range (native_host already returns 0-1)
    if confidence > 1.0:
        confidence = confidence / 100.0
    
    # Native_host server already applies transformations, just return as-is
    return prediction, confidence


@celery.task(bind=True)
def process_video_task(self, video_id):
    """
    Celery task wrapper for video processing.
    """
    app = create_app()
    with app.app_context():
        return process_video_sync(video_id)


@celery.task(bind=True)
def process_video_task(self, video_id):
    """
    Celery task wrapper for video processing.
    Processes video using WebSocket connection to running demo_server.
    """
    app = create_app()
    with app.app_context():
        return process_video_sync(video_id)


def check_native_host_connection(app):
    """
    Check if native host inference server is running and accessible.
    Returns True if connected, False otherwise.
    """
    try:
        host = app.config.get('INFERENCE_SERVER_HOST', '127.0.0.1')
        port = app.config.get('INFERENCE_SERVER_PORT', 8765)
        url = f"http://{host}:{port}"
        
        response = requests.get(url, timeout=3)
        return True
        
    except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
        return False
    except Exception as e:
        app.logger.error(f"Error checking native host: {str(e)}")
        return False


def process_video_sync(video_id):
    """
    Optimized video processing using WebSocket connection to demo_server.py.
    This avoids loading the 1.5GB model from disk for each video.
    Can be called from background thread - creates its own app context.
    """
    from flask import current_app
    from app import socketio, create_app
    import json
    
    # Create app context if not in one (for background thread execution)
    app = None
    try:
        # Try to use current_app (if in Flask request context)
        app = current_app._get_current_object()
    except:
        # Not in request context, create new app
        app = create_app()
    
    with app.app_context():
        video = VideoUpload.query.get(video_id)
        
        if not video:
            return {'error': 'Video not found'}
        
        # Get session
        session = video.session
        if not session:
            return {'error': 'Detection session not found'}
        
        # CHECK NATIVE HOST CONNECTION BEFORE PROCESSING
        if not check_native_host_connection(app):
            error_msg = 'Native host inference server is not running or not accessible. Please start the server and try again.'
            app.logger.error(f"Video {video_id} processing failed: {error_msg}")
            
            # Update video and session status
            video.status = 'failed'
            video.error_message = error_msg
            session.status = 'error'
            session.error_message = error_msg
            db.session.commit()
            
            # Emit error event
            socketio.emit('processing_error', {
                'video_id': video_id,
                'error': error_msg,
                'status': 'failed'
            }, room=f'video_{video_id}')
            
            return {'error': error_msg}
        
        try:
            # Update status
            video.status = 'processing'
            video.progress = 0.0
            db.session.commit()
            
            # Emit initial status
            socketio.emit('processing_progress', {
                'video_id': video_id,
                'progress': 0,
                'processed_frames': 0,
                'status': 'starting'
            }, room=f'video_{video_id}')
            
            # WebSocket server URL (connects to running demo_server.py via native_host)
            ws_url = os.getenv('WEBSOCKET_URL', 'ws://127.0.0.1:8765')
            app.logger.info(f'Connecting to WebSocket server at {ws_url}')
        
            # Extract video metadata using OpenCV
            cap = cv2.VideoCapture(video.filepath)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            duration = total_frames / fps if fps > 0 else 0
            
            # Update video metadata
            video.duration = duration
            video.fps = int(fps)
            video.width = width
            video.height = height
            db.session.commit()
            
            # Extract frames at configured FPS
            target_fps = app.config.get('UPLOAD_FPS', 1)
            frame_interval = max(1, int(fps / target_fps))
            
            frame_count = 0
            processed_count = 0
            
            app.logger.info(f'Processing video at {target_fps} FPS (every {frame_interval} frames)')
        
            # Process frames using WebSocket
            while cap.isOpened():
                ret, frame = cap.read()
                
                if not ret:
                    break
                
                # Process every Nth frame
                if frame_count % frame_interval == 0:
                    timestamp = frame_count / fps
                    frame_id = f"upload_{video_id}_frame_{processed_count}"
                    
                    # Send frame to WebSocket server for inference
                    result = process_frame_with_ws(ws_url, frame, frame_id)
                    
                    # Extract prediction from result
                    if result and 'prediction' in result:
                        prediction = result['prediction']
                        confidence = result.get('confidence', 0.0)
                        bbox_data = result.get('bbox')
                        
                        # Apply transformations and convert to percentage (0-100)
                        prediction, confidence = apply_confidence_transformations(prediction, confidence)
                        confidence = confidence * 100.0  # Convert 0-1 to 0-100 for database
                        
                        # Format bbox as JSON string
                        bbox = json.dumps(bbox_data) if bbox_data else None
                        
                        app.logger.info(f'Frame {processed_count}: {prediction} ({confidence:.1f}%)')
                    else:
                        # Fallback if WebSocket fails
                        app.logger.warning(f'WebSocket failed for frame {processed_count}, using fallback')
                        prediction = 'REAL'
                        confidence = 50.0
                        bbox = None
                    
                    # Save frame result
                    frame_result = FrameResult(
                        session_id=session.id,
                        timestamp=timestamp,
                        frame_number=processed_count,
                        prediction=prediction,
                        confidence=confidence,
                        bbox=bbox
                    )
                    db.session.add(frame_result)
                    
                    processed_count += 1
                    
                    # Update progress after every frame for real-time feedback
                    progress = (frame_count / total_frames) * 100
                    video.progress = progress
                    
                    # Commit and emit progress every 5 frames
                    if processed_count % 5 == 0:
                        db.session.commit()
                        socketio.emit('processing_progress', {
                            'video_id': video_id,
                            'progress': progress,
                            'processed_frames': processed_count,
                            'total_frames': total_frames,
                            'status': 'processing'
                        }, room=f'video_{video_id}')
                        app.logger.info(f'Processed {processed_count} frames ({progress:.1f}%)')
                
                frame_count += 1
            
            # Cleanup
            cap.release()
            
            # Update final status
            video.status = 'completed'
            video.progress = 100.0
            session.total_frames = processed_count
            db.session.commit()
            
            # Emit completion
            socketio.emit('processing_progress', {
                'video_id': video_id,
                'progress': 100,
                'processed_frames': processed_count,
                'status': 'completed'
            }, room=f'video_{video_id}')
            
            app.logger.info(f'Video {video_id} processed via WebSocket: {processed_count} frames')
            return {'success': True, 'processed_frames': processed_count}
            
        except Exception as e:
            app.logger.error(f"Video processing error: {str(e)}")
            video.status = 'failed'
            video.error_message = str(e)
            session.status = 'error'
            session.error_message = str(e)
            db.session.commit()
            
            # Emit error
            socketio.emit('processing_error', {
                'video_id': video_id,
                'error': str(e),
                'status': 'failed'
            }, room=f'video_{video_id}')
            
            return {'error': str(e)}
