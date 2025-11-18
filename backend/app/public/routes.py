import os
import cv2
import json
import time
import base64
import asyncio
import websockets
import requests
from flask import request, Response, stream_with_context, current_app
from werkzeug.utils import secure_filename
from app.public import public_bp

# Allowed video extensions
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'webm', 'mkv', 'flv'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_sse_message(data):
    """Format data as Server-Sent Event message"""
    return f"data: {json.dumps(data)}\n\n"

def check_native_host_available():
    """Check if native host inference server is running"""
    try:
        host = current_app.config.get('INFERENCE_SERVER_HOST', '127.0.0.1')
        port = current_app.config.get('INFERENCE_SERVER_PORT', 8765)
        url = f"http://{host}:{port}"
        response = requests.get(url, timeout=3)
        return True
    except:
        return False

async def send_frame_to_native_host(ws_url, frame, frame_id):
    """Send frame to native host WebSocket server for inference"""
    try:
        # Convert frame to base64 JPEG
        success, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not success:
            return None
        
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        data_url = f'data:image/jpeg;base64,{img_base64}'
        
        # Create message
        message = {
            'type': 'frame',
            'id': frame_id,
            'videoId': 'public_upload',
            'ts': 0,
            'frameB64': data_url
        }
        
        # Connect and send
        async with websockets.connect(ws_url, ping_timeout=10) as websocket:
            await websocket.send(json.dumps(message))
            response = await websocket.recv()
            result = json.loads(response)
            return result
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        return None

def process_frame_with_native_host(ws_url, frame, frame_id):
    """Synchronous wrapper for async WebSocket frame processing"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(send_frame_to_native_host(ws_url, frame, frame_id))
        return result
    finally:
        loop.close()

def apply_confidence_transformations(prediction, confidence):
    """Apply confidence transformations"""
    if prediction == 'NO_FACE':
        return prediction, 0.0
    
    # Ensure confidence is in 0-1 range
    if confidence > 1.0:
        confidence = confidence / 100.0
    
    return prediction, confidence

@public_bp.route('/analyze', methods=['POST'])
def analyze_video():
    """
    Public endpoint for anonymous video analysis.
    Streams progress updates using Server-Sent Events (SSE).
    Does not store results in database - perfect for free/demo usage.
    """
    try:
        # Check native host availability first
        if not check_native_host_available():
            def error_stream():
                yield generate_sse_message({
                    'type': 'error',
                    'message': 'AI inference server is not running. Please try again later.'
                })
            return Response(stream_with_context(error_stream()), mimetype='text/event-stream')
        
        # Check if file is in request
        if 'video' not in request.files:
            def error_stream():
                yield generate_sse_message({
                    'type': 'error',
                    'message': 'No video file provided'
                })
            return Response(stream_with_context(error_stream()), mimetype='text/event-stream')
        
        file = request.files['video']
        
        # Check if filename is empty
        if file.filename == '':
            def error_stream():
                yield generate_sse_message({
                    'type': 'error',
                    'message': 'No file selected'
                })
            return Response(stream_with_context(error_stream()), mimetype='text/event-stream')
        
        # Check file extension
        if not allowed_file(file.filename):
            def error_stream():
                yield generate_sse_message({
                    'type': 'error',
                    'message': f'Invalid file format. Supported formats: {", ".join(ALLOWED_EXTENSIONS)}'
                })
            return Response(stream_with_context(error_stream()), mimetype='text/event-stream')
        
        # Check file size (100MB limit for public uploads)
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        max_size = 100 * 1024 * 1024  # 100MB
        
        if file_size > max_size:
            def error_stream():
                yield generate_sse_message({
                    'type': 'error',
                    'message': 'File too large. Maximum size: 100MB. Create a free account for 500MB limit.'
                })
            return Response(stream_with_context(error_stream()), mimetype='text/event-stream')
        
        # Create temporary file
        filename = secure_filename(file.filename)
        temp_dir = os.path.join(os.getcwd(), 'media', 'temp')
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, f'upload_{int(time.time())}_{filename}')
        file.save(temp_path)
        
        def process_video():
            try:
                # WebSocket URL for native host
                ws_url = os.getenv('WEBSOCKET_URL', 'ws://127.0.0.1:8765')
                
                # Open video
                cap = cv2.VideoCapture(temp_path)
                if not cap.isOpened():
                    yield generate_sse_message({
                        'type': 'error',
                        'message': 'Failed to open video file'
                    })
                    return
                
                fps = cap.get(cv2.CAP_PROP_FPS)
                total_frames_in_video = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                
                # Calculate frames to extract (1 FPS for public uploads)
                frame_interval = max(1, int(fps))
                total_frames_to_analyze = max(1, total_frames_in_video // frame_interval)
                
                # Storage for predictions
                predictions = []
                frame_results = []
                frame_count = 0
                analyzed_count = 0
                
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    
                    # Process frame at 1 FPS interval
                    if frame_count % frame_interval == 0:
                        analyzed_count += 1
                        frame_id = f"public_{int(time.time())}_{analyzed_count}"
                        
                        # Run deepfake detection using native host
                        try:
                            result = process_frame_with_native_host(ws_url, frame, frame_id)
                            
                            if result and 'prediction' in result:
                                prediction = result['prediction']
                                confidence = result.get('confidence', 0.0)
                                
                                # Apply transformations
                                prediction, confidence = apply_confidence_transformations(prediction, confidence)
                                
                                # Store result
                                frame_results.append({
                                    'prediction': prediction,
                                    'confidence': confidence,
                                    'frame_number': analyzed_count
                                })
                                
                                # Add to predictions for verdict calculation
                                if prediction != 'NO_FACE':
                                    predictions.append({
                                        'label': prediction.lower(),
                                        'confidence': confidence
                                    })
                        except Exception as e:
                            # If processing fails, skip frame
                            print(f"Frame {analyzed_count} processing failed: {str(e)}")
                            pass
                        
                        # Send progress update AFTER processing
                        progress = int((analyzed_count / total_frames_to_analyze) * 100)
                        yield generate_sse_message({
                            'type': 'progress',
                            'progress': min(progress, 99),
                            'current_frame': analyzed_count,
                            'total_frames': total_frames_to_analyze
                        })
                    
                    frame_count += 1
                
                cap.release()
                
                # Calculate final verdict
                if not predictions:
                    # No faces detected in any frame
                    yield generate_sse_message({
                        'type': 'complete',
                        'results': {
                            'verdict': 'NO_FACE',
                            'confidence': 0.0,
                            'total_frames': analyzed_count,
                            'fake_count': 0,
                            'real_count': 0,
                            'no_face_count': analyzed_count,
                            'frame_results': frame_results
                        }
                    })
                else:
                    # Count fake vs real predictions
                    fake_count = sum(1 for p in predictions if p['label'] == 'fake')
                    real_count = sum(1 for p in predictions if p['label'] == 'real')
                    no_face_count = analyzed_count - len(predictions)
                    
                    # Determine verdict by majority voting
                    if fake_count > real_count:
                        verdict = 'FAKE'
                        # Average confidence of fake predictions
                        fake_confidences = [p['confidence'] for p in predictions if p['label'] == 'fake']
                        confidence = sum(fake_confidences) / len(fake_confidences) if fake_confidences else 0.0
                    else:
                        verdict = 'REAL'
                        # Average confidence of real predictions
                        real_confidences = [p['confidence'] for p in predictions if p['label'] == 'real']
                        confidence = sum(real_confidences) / len(real_confidences) if real_confidences else 0.0
                    
                    yield generate_sse_message({
                        'type': 'complete',
                        'results': {
                            'verdict': verdict,
                            'confidence': round(confidence * 100, 1),
                            'total_frames': analyzed_count,
                            'fake_count': fake_count,
                            'real_count': real_count,
                            'no_face_count': no_face_count,
                            'frame_results': frame_results
                        }
                    })
            
            except Exception as e:
                yield generate_sse_message({
                    'type': 'error',
                    'message': f'Processing error: {str(e)}'
                })
            
            finally:
                # Clean up temporary file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
        
        return Response(stream_with_context(process_video()), mimetype='text/event-stream')
    
    except Exception as e:
        def error_stream():
            yield generate_sse_message({
                'type': 'error',
                'message': f'Server error: {str(e)}'
            })
        return Response(stream_with_context(error_stream()), mimetype='text/event-stream')
