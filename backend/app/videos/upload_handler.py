import os
import cv2
import json
import time
import base64
import threading
import asyncio
from concurrent.futures import ThreadPoolExecutor
from websocket import create_connection
from datetime import datetime
from app.models import db, VideoUpload, DetectionSession, FrameResult
from app import socketio


def emit_progress(app, video_id, data):
    """Helper function to emit progress updates via SocketIO"""
    with app.app_context():
        try:
            socketio.emit('video_upload_progress', {
                'video_id': video_id,
                **data
            })
            print(f"[UPLOAD] ✅ Emitted progress for video {video_id}: {data.get('message', '')}")
        except Exception as e:
            print(f"[UPLOAD] ❌ Error emitting progress: {e}")
            import traceback
            traceback.print_exc()


def emit_error(app, video_id, error):
    """Helper function to emit errors via SocketIO"""
    with app.app_context():
        try:
            socketio.emit('video_upload_progress', {
                'video_id': video_id,
                'error': str(error),
                'status': 'error'
            })
            print(f"[UPLOAD] ✅ Emitted error for video {video_id}")
        except Exception as e:
            print(f"[UPLOAD] ❌ Error emitting error: {e}")


def process_video_upload(app, video_id, ws_url='ws://127.0.0.1:8765'):
    """Process uploaded video: extract frames and send to server.py for analysis"""
    print(f"\n{'='*80}")
    print(f"[UPLOAD] 🎬 Starting video processing for video_id: {video_id}")
    print(f"[UPLOAD] WebSocket URL: {ws_url}")
    print(f"{'='*80}\n")
    
    ws_conn = None
    cap = None
    session_id = None
    
    try:
        with app.app_context():
            # Get video info from database
            video = VideoUpload.query.get(video_id)
            if not video:
                print(f"[UPLOAD] ❌ Video {video_id} not found")
                return
            
            video_path = video.filepath
            session = DetectionSession.query.filter_by(video_id=video_id).first()
            
            if not session:
                print(f"[UPLOAD] ❌ No session found for video {video_id}")
                return
            
            # Store session ID for later use (avoid detached instance issues)
            session_id = session.id
            
            # Extract video metadata
            print(f"[UPLOAD] 📹 Opening video file: {video_path}")
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                print(f"[UPLOAD] ❌ Failed to open video file: {video_path}")
                emit_error(app, video_id, "Failed to open video file")
                return
            
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = total_frames / fps if fps > 0 else 0
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            # Calculate how many frames we'll process (1 FPS)
            frame_interval = max(1, int(fps))  # Process 1 frame per second
            total_frames_to_process = int(duration)  # Total seconds
            
            print(f"[UPLOAD] 📊 Video metadata:")
            print(f"  - Duration: {duration:.2f}s")
            print(f"  - FPS: {fps:.2f}")
            print(f"  - Total frames: {total_frames}")
            print(f"  - Resolution: {width}x{height}")
            print(f"  - Processing interval: {frame_interval} frames (1 FPS)")
            print(f"  - Frames to process: {total_frames_to_process}")
            
            # Update session status
            session.status = 'processing'
            session.total_frames = total_frames_to_process
            db.session.commit()
            print(f"[UPLOAD] ✅ Session status updated to 'processing'")
        
        # Connect to WebSocket server (synchronous)
        print(f"[UPLOAD] 🔌 Connecting to WebSocket server at {ws_url}...")
        ws_conn = create_connection(ws_url, timeout=10)
        print(f"[UPLOAD] ✅ Connected to server.py successfully!")
        
        frame_count = 0
        processed_count = 0
        sent_frames = []  # Track sent frames for matching responses
        
        # PHASE 1: Send all frames (non-blocking)
        print(f"[UPLOAD] 📤 PHASE 1: Sending all frames to server...")
        send_start_time = time.time()
        
        # Process frames
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                print(f"[UPLOAD] 🏁 No more frames to read (total read: {frame_count})")
                break
            
            # Process every Nth frame (1 FPS)
            if frame_count % frame_interval == 0:
                timestamp = frame_count / fps
                current_second = int(timestamp)
                
                # Resize frame to reduce processing time (max width 640px)
                h, w = frame.shape[:2]
                if w > 640:
                    scale = 640 / w
                    new_w, new_h = 640, int(h * scale)
                    frame = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)
                
                # Encode frame to JPEG base64 (65% quality for much faster processing)
                success, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 65])
                if not success:
                    print(f"[UPLOAD] ❌ Failed to encode frame {frame_count}")
                    frame_count += 1
                    continue
                
                # Convert to base64
                jpg_as_text = base64.b64encode(buffer).decode('utf-8')
                data_url = f"data:image/jpeg;base64,{jpg_as_text}"
                
                # Prepare message (same format as extension)
                message = {
                    'type': 'frame',
                    'id': f'upload_{video_id}_frame_{processed_count}',
                    'videoId': f'upload_{video_id}',
                    'ts': timestamp,
                    'frameB64': data_url,
                    'source': 'web_upload',
                    'totalFrames': total_frames_to_process,
                    'currentFrame': processed_count + 1,
                    'videoDuration': duration
                }
                
                # Send frame to server.py
                try:
                    ws_conn.send(json.dumps(message))
                except Exception as e:
                    print(f"[UPLOAD] ❌ ERROR sending frame {processed_count}: {e}")
                    emit_error(app, video_id, f"Failed to send frame: {str(e)}")
                    break
                
                # Wait for response from server.py
                try:
                    response = ws_conn.recv()
                    result = json.loads(response)
                    
                    # Process analysis result
                    if result.get('type') == 'result':
                        # Extract data first
                        prediction = result.get('prediction', 'UNKNOWN')
                        confidence = result.get('confidence', 0.0)
                        bbox = result.get('bbox')
                        progress_percent = result.get('progress', 0)
                        current_sec = result.get('currentSecond', current_second)
                        total_secs = result.get('totalSeconds', int(duration))
                        is_complete = result.get('isComplete', False)
                        
                        # Convert confidence from 0-1 to 0-100
                        confidence_pct = confidence * 100.0
                        
                        # Save result to database in app context
                        with app.app_context():
                            frame_result = FrameResult(
                                session_id=session_id,
                                timestamp=timestamp,
                                frame_number=processed_count,
                                prediction=prediction,
                                confidence=confidence_pct,
                                bbox=json.dumps(bbox) if bbox else None
                            )
                            db.session.add(frame_result)
                            db.session.commit()
                        
                        processed_count += 1
                        
                        # Emit progress to frontend (has its own app context)
                        if 'progress' in result:
                            emit_progress(app, video_id, {
                                'progress': progress_percent,
                                'message': f'Analyzing: {current_sec}s / {total_secs}s',
                                'total_seconds': total_secs,
                                'current_second': current_sec,
                                'processed_frames': processed_count
                            })
                            
                            if processed_count % 3 == 0:  # Log every 3 frames instead of every frame
                                print(f"[UPLOAD] 📊 Progress: {progress_percent:.1f}% ({current_sec}s / {total_secs}s)")
                            
                            # Check for completion
                            if is_complete:
                                print(f"[UPLOAD] 🎉 Received completion flag from server.py")
                                break
                    
                except Exception as e:
                    print(f"[UPLOAD] ❌ ERROR receiving/processing response: {e}")
                    import traceback
                    traceback.print_exc()
                    emit_error(app, video_id, f"Error processing frame: {str(e)}")
            
            frame_count += 1
        
        # Cleanup and mark as completed
        with app.app_context():
            session = DetectionSession.query.get(session_id)
            session.status = 'completed'
            session.processed_frames = processed_count
            db.session.commit()
            
            # Final progress update
            emit_progress(app, video_id, {
                'progress': 100.0,
                'message': 'Analysis complete!',
                'total_seconds': int(duration),
                'current_second': int(duration),
                'processed_frames': processed_count,
                'status': 'completed',
                'session_id': session_id
            })
            
            print(f"\n{'='*80}")
            print(f"[UPLOAD] ✅ Video processing completed!")
            print(f"[UPLOAD] Total frames processed: {processed_count}/{total_frames_to_process}")
            print(f"{'='*80}\n")
    
    except Exception as e:
        print(f"[UPLOAD] ❌ FATAL ERROR in video processing: {e}")
        import traceback
        traceback.print_exc()
        
        try:
            with app.app_context():
                session = DetectionSession.query.filter_by(video_id=video_id).first()
                if session:
                    session.status = 'failed'
                    db.session.commit()
            emit_error(app, video_id, str(e))
        except:
            pass
    
    finally:
        # Cleanup resources
        if cap:
            cap.release()
            print("[UPLOAD] 🧹 Released video capture")
        if ws_conn:
            ws_conn.close()
            print("[UPLOAD] 🧹 Closed WebSocket connection")


def start_video_processing(app, video_id):
    """Start video processing in a background thread"""
    print(f"[UPLOAD] 🚀 Starting background thread for video {video_id}")
    
    # Use threading instead of socketio background task
    thread = threading.Thread(
        target=process_video_upload,
        args=(app, video_id),
        daemon=True
    )
    thread.start()
    
    print(f"[UPLOAD] ✅ Background thread started (thread_id: {thread.ident})")
