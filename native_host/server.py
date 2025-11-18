# native_host/server.py
import asyncio
import base64
import json
import io
import os
import sys
import argparse
from pathlib import Path
from typing import Dict, Optional
from datetime import datetime
import time

# Add parent directory to Python path to allow DeepfakeBench imports
SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import cv2
import numpy as np
from PIL import Image
import websockets
import torch

# IMPORTANT: adjust import path if demo_server.py is in a different folder
from DeepfakeBench.training.demo_server import DeepfakeDetectionServer

# Parse command-line arguments
def parse_args():
    parser = argparse.ArgumentParser(description="WebSocket Deepfake Detection Server")
    parser.add_argument("--detector_config", default=None,
                       help="YAML config file path (default: DeepfakeBench/training/config/detector/effort.yaml)")
    parser.add_argument("--weights", default=None,
                       help="Single model weights (use with single model mode)")
    parser.add_argument("--ensemble", action='store_true',
                       help="Run ensemble inference with all three models (default if no --weights)")
    parser.add_argument("--weights_dir", default=None,
                       help="Directory containing model weights for ensemble")
    parser.add_argument("--landmark_model", default=None,
                       help="dlib landmarks .dat file path")
    parser.add_argument("--host", default='127.0.0.1',
                       help="WebSocket server host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8765,
                       help="WebSocket server port (default: 8765)")
    return parser.parse_args()

args = parse_args()

# CONFIG
HOST = args.host
PORT = args.port
AUTH_TOKEN = os.environ.get('DF_AUTH_TOKEN', '')  # optional: set same token in client if you want
BASE_DIR = PROJECT_ROOT  # Project root directory

DETECTOR_CONFIG = args.detector_config or (BASE_DIR / 'DeepfakeBench' / 'training' / 'config' / 'detector' / 'effort.yaml')
WEIGHTS_DIR = args.weights_dir or (BASE_DIR / 'DeepfakeBench' / 'training' / 'weights')

# Determine mode: ensemble or single model
ENSEMBLE_MODE = args.ensemble or (args.weights is None)
SINGLE_WEIGHTS = args.weights

# Face detection settings - ENABLED by default for production
USE_FACE_DETECTION = True
LANDMARK_MODEL = args.landmark_model or (BASE_DIR / 'DeepfakeBench' / 'preprocessing' / 'shape_predictor_81_face_landmarks.dat')
if isinstance(LANDMARK_MODEL, str):
    LANDMARK_MODEL = Path(LANDMARK_MODEL)

# PREPROCESSED FACES SAVE DIRECTORY
PREPROCESSED_FACES_DIR = BASE_DIR / 'DeepfakeBench' / 'saves_pipeline' / 'preprocessed_faces'

# Create directory if it doesn't exist
PREPROCESSED_FACES_DIR.mkdir(parents=True, exist_ok=True)

# Check if landmark model exists
if USE_FACE_DETECTION and not LANDMARK_MODEL.exists():
    print(f"\n⚠️  WARNING: Landmark model not found at {LANDMARK_MODEL}")
    print("   Face alignment will be disabled. Download from:")
    print("   http://dlib.net/files/shape_predictor_81_face_landmarks.dat.bz2")
    USE_FACE_DETECTION = False

print("[DF SERVER] Starting local inference server...")
print(f"[DF SERVER] Mode: {'ENSEMBLE' if ENSEMBLE_MODE else 'SINGLE MODEL'}")
if not ENSEMBLE_MODE:
    print(f"[DF SERVER] Single Weights: {SINGLE_WEIGHTS}")
print(f"[DF SERVER] Face Detection: {'ENABLED ✓' if USE_FACE_DETECTION else 'DISABLED'}")
print(f"[DF SERVER] Preprocessed faces will be saved to: {PREPROCESSED_FACES_DIR}")

# Interactive threshold configuration
print("\n" + "="*80)
print("⚙️  CONFIDENCE MECHANISM CONFIGURATION")
print("="*80)

# 1. FAKE→REAL Conversion Threshold
print("\n1️⃣  FAKE→REAL CONVERSION THRESHOLD")
print("   Current default: 70% (FAKE predictions below 70% confidence → converted to REAL)")
print("   Would you like to adjust this threshold?")

while True:
    try:
        user_input = input("   Enter threshold percentage (0-100) or press Enter for default [70]: ").strip()
        
        if user_input == "":
            FAKE_THRESHOLD = 0.70
            print(f"   ✓ Using default threshold: 70%")
            break
        
        threshold_value = float(user_input)
        
        if 0 <= threshold_value <= 100:
            FAKE_THRESHOLD = threshold_value / 100.0
            print(f"   ✓ Threshold set to: {threshold_value}%")
            break
        else:
            print("   ❌ Please enter a value between 0 and 100")
    except ValueError:
        print("   ❌ Invalid input. Please enter a number between 0 and 100")
    except KeyboardInterrupt:
        print("\n   ✓ Using default threshold: 70%")
        FAKE_THRESHOLD = 0.70
        break

# 2. REAL Confidence Boost
print("\n2️⃣  REAL PREDICTION CONFIDENCE BOOST")
print("   Current default: +25% (REAL predictions get confidence boost, capped at 100%)")
print("   Would you like to adjust this boost?")

while True:
    try:
        user_input = input("   Enter boost percentage (0-100) or press Enter for default [25]: ").strip()
        
        if user_input == "":
            REAL_BOOST = 0.25
            print(f"   ✓ Using default boost: +25%")
            break
        
        boost_value = float(user_input)
        
        if 0 <= boost_value <= 100:
            REAL_BOOST = boost_value / 100.0
            print(f"   ✓ Boost set to: +{boost_value}%")
            break
        else:
            print("   ❌ Please enter a value between 0 and 100")
    except ValueError:
        print("   ❌ Invalid input. Please enter a number between 0 and 100")
    except KeyboardInterrupt:
        print("\n   ✓ Using default boost: +25%")
        REAL_BOOST = 0.25
        break

# 3. Show Conversion Info on Frontend
print("\n3️⃣  FRONTEND DISPLAY SETTINGS")
print("   Should the extension show conversion/boost information?")
print("   → YES: Shows 'Converted from FAKE' and boost details (transparent)")
print("   → NO: Hides conversion info (looks like natural predictions)")

while True:
    try:
        user_input = input("   Show conversion info on frontend? (yes/no) [yes]: ").strip().lower()
        
        if user_input == "" or user_input in ['y', 'yes']:
            SHOW_CONVERSION_INFO = True
            print(f"   ✓ Conversion info will be shown on frontend")
            break
        elif user_input in ['n', 'no']:
            SHOW_CONVERSION_INFO = False
            print(f"   ✓ Conversion info will be hidden (natural display)")
            break
        else:
            print("   ❌ Please enter 'yes' or 'no'")
    except KeyboardInterrupt:
        print("\n   ✓ Conversion info will be shown on frontend")
        SHOW_CONVERSION_INFO = True
        break

print("="*80)

# Load detection server
server_instance = DeepfakeDetectionServer(
    detector_config=DETECTOR_CONFIG,
    ensemble=ENSEMBLE_MODE,
    weights_dir=WEIGHTS_DIR,
    single_weights=SINGLE_WEIGHTS,
    use_landmarks=USE_FACE_DETECTION,
    landmark_model=str(LANDMARK_MODEL) if USE_FACE_DETECTION else None
)

# Override the threshold and boost in the server instance
server_instance.FAKE_CONFIDENCE_THRESHOLD = FAKE_THRESHOLD
server_instance.REAL_CONFIDENCE_BOOST = REAL_BOOST
server_instance.SHOW_CONVERSION_INFO = SHOW_CONVERSION_INFO
print(f"\n✅ Server loaded with configuration:")
print(f"   • FAKE→REAL threshold: {FAKE_THRESHOLD*100:.1f}% (FAKE predictions below this → REAL)")
print(f"   • REAL confidence boost: +{REAL_BOOST*100:.1f}% (capped at 100%)")
print(f"   • Frontend display: {'Show conversion details' if SHOW_CONVERSION_INFO else 'Hide conversion (natural)'}\n")

# Statistics tracking
frame_count = 0
session_start_time = None
saved_faces_count = 0

# Helper: decode data-url or raw base64 into BGR numpy image
def b64_to_bgr_img(data_url: str) -> np.ndarray:
    if data_url.startswith('data:'):
        _, encoded = data_url.split(',', 1)
    else:
        encoded = data_url
    img_bytes = base64.b64decode(encoded)
    img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
    arr = np.array(img)
    bgr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
    return bgr

# Helper: detect face bbox (normalized) using dlib
def detect_face_bbox_normalized(img_bgr: np.ndarray) -> Optional[list]:
    """Detect face bounding box using dlib face detector"""
    if server_instance.face_detector is None:
        return None
    
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    # Changed upsample from 1 to 0 for faster detection (less accurate but much faster)
    faces = server_instance.face_detector(rgb, 0)
    
    if not faces:
        return None
    
    # Get largest face
    face = max(faces, key=lambda r: r.width() * r.height())
    x1, y1, x2, y2 = face.left(), face.top(), face.right(), face.bottom()
    h, w = img_bgr.shape[:2]
    
    # Ensure bbox is within image bounds
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w-1, x2), min(h-1, y2)
    
    if x2 <= x1 or y2 <= y1:
        return None
    
    # Return normalized coordinates [x, y, width, height]
    bx = x1 / w
    by = y1 / h
    bw = (x2 - x1) / w
    bh = (y2 - y1) / h
    
    return [bx, by, bw, bh]

# Helper: save preprocessed face
def save_preprocessed_face(face_aligned: np.ndarray, video_id: str, frame_id: str, timestamp: int) -> str:
    """
    Save preprocessed/aligned face to disk
    Returns: saved file path
    """
    global saved_faces_count
    
    # Create subdirectory for this video
    video_dir = PREPROCESSED_FACES_DIR / video_id
    video_dir.mkdir(exist_ok=True)
    
    # Create filename: videoID_frameID_timestamp_YYYYMMDD_HHMMSS.jpg
    timestamp_str = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{video_id}_{frame_id}_t{timestamp}s_{timestamp_str}.jpg"
    filepath = video_dir / filename
    
    # Save face image
    cv2.imwrite(str(filepath), face_aligned)
    saved_faces_count += 1
    
    return str(filepath)

# Inference wrapper with timing and face extraction + SAVING
@torch.inference_mode()
def infer_using_server(img_bgr: np.ndarray, video_id: str, frame_id: str, timestamp: int) -> Dict:
    """
    Run inference on image with face detection, alignment, and SAVING.
    
    Returns:
        Dictionary with model predictions, timing info, face bbox, and saved path
    """
    face_aligned = None
    timing_info = {}
    bbox_norm = None
    saved_face_path = None
    
    try:
        # Face detection and alignment
        face_start = time.time()
        
        if server_instance.face_detector and server_instance.landmark_predictor:
            # Extract aligned face using landmarks (same as demo_server.py)
            face_aligned = server_instance.extract_aligned_face(img_bgr, res=224)
            
            if face_aligned is None:
                return {'error': 'No face detected'}
            
            # *** SAVE PREPROCESSED FACE ***
            saved_face_path = save_preprocessed_face(face_aligned, video_id, frame_id, timestamp)
            
            # Also get bbox for visualization
            bbox_norm = detect_face_bbox_normalized(img_bgr)
        else:
            # No face detection - use entire image
            face_aligned = img_bgr
            bbox_norm = None
            # Still save the "face" (full image)
            saved_face_path = save_preprocessed_face(face_aligned, video_id, frame_id, timestamp)
        
        timing_info['face_detection'] = time.time() - face_start

        # Preprocessing
        prep_start = time.time()
        face_tensor = server_instance.preprocess_face(face_aligned).to(
            next(iter(server_instance.models.values())).parameters().__next__().device
        )
        data = {"image": face_tensor, "label": torch.tensor([0]).to(face_tensor.device)}
        timing_info['preprocessing'] = time.time() - prep_start

        # Model inference
        inference_start = time.time()
        results = {}
        
        # Check if single model mode
        is_single_model = len(server_instance.models) == 1
        
        for model_name, model in server_instance.models.items():
            model_start = time.time()
            preds = server_instance.inference(model, data)
            cls_out = preds["cls"].squeeze().cpu().numpy()
            prob = preds["prob"].squeeze().cpu().numpy()
            pred_label = "FAKE" if prob >= 0.5 else "REAL"
            confidence = float(prob) if prob >= 0.5 else float(1 - prob)
            
            model_time = time.time() - model_start
            
            # Apply confidence threshold for single model mode
            if is_single_model:
                final_pred, final_conf, was_converted = server_instance._apply_confidence_threshold(
                    prob, pred_label, confidence, is_single_model=True
                )
                
                results[model_name] = {
                    'cls': cls_out.tolist() if hasattr(cls_out, 'tolist') else int(cls_out),
                    'prob': float(prob),
                    'prediction': final_pred,
                    'confidence': float(final_conf),
                    'original_prediction': pred_label,
                    'original_confidence': float(confidence),
                    'was_converted': was_converted,
                    'inference_time': model_time
                }
            else:
                results[model_name] = {
                    'cls': cls_out.tolist() if hasattr(cls_out, 'tolist') else int(cls_out),
                    'prob': float(prob),
                    'prediction': pred_label,
                    'confidence': confidence,
                    'inference_time': model_time
                }
        
        timing_info['inference'] = time.time() - inference_start

        # Ensemble voting (using custom logic from demo_server.py)
        if len(server_instance.models) > 1:
            ensemble_result = server_instance._calculate_ensemble_verdict(results)
            results['ENSEMBLE'] = ensemble_result

        # Add timing, bbox, and saved path info
        results['_timing'] = timing_info
        results['_timing']['total'] = sum(timing_info.values())
        results['_bbox'] = bbox_norm
        results['_saved_face_path'] = saved_face_path

        return results

    except Exception as e:
        return {'error': f'inference exception: {e}'}

def print_frame_analysis(frame_num: int, video_id: str, timestamp: int, results: Dict, bbox: Optional[list], saved_path: Optional[str]):
    """Print detailed frame analysis like demo_server.py"""
    
    # Check if single model mode
    is_single_model = len(server_instance.models) == 1
    
    # Print separator for first frame
    if frame_num == 1:
        print("\n" + "="*140)
        print(f"📹 Video ID: {video_id or 'Unknown'}")
        print(f"💾 Saving faces to: {PREPROCESSED_FACES_DIR / video_id}")
        print("="*140)
        
        if is_single_model:
            # Single model mode header
            model_name = list(server_instance.models.keys())[0]
            print(f"\n{'Frame':<8} {'Time':<10} {model_name:<30} {'Status':<25} {'Process Time':<15}")
            print("-"*140)
        else:
            # Ensemble mode header
            print(f"\n{'Frame':<8} {'Time':<10} {'FaceForensics':<22} {'SDv14':<22} {'Chameleon':<22} {'ENSEMBLE':<22} {'Process Time':<15}")
            print("-"*140)
    
    # Format predictions
    def fmt_pred(model_name):
        if model_name in results:
            pred = results[model_name]['prediction']
            conf = results[model_name]['confidence']
            is_suspicious = results[model_name].get('suspicious', False)
            
            if is_suspicious:
                emoji = "🟡"
                letter = "S"
            else:
                emoji = "🔴" if pred == "FAKE" else "🟢"
                letter = pred[0]
            
            return f"{emoji}{letter} {conf:.0%}"
        return "N/A"
    
    # Get timing info
    timing = results.get('_timing', {})
    total_time = timing.get('total', 0)
    
    # Format frame label
    frame_label = f"#{frame_num}"
    time_label = f"{timestamp}s"
    time_disp = f"{total_time:.3f}s"
    
    if is_single_model:
        # Single model display with conversion status
        model_name = list(server_instance.models.keys())[0]
        model_disp = fmt_pred(model_name)
        
        # Show conversion status
        if results[model_name].get('was_converted', False):
            orig_pred = results[model_name]['original_prediction']
            orig_conf = results[model_name]['original_confidence']
            status = f"🔄 Converted: {orig_pred} {orig_conf:.0%}→REAL"
        else:
            status = ""
        
        print(f"{frame_label:<8} {time_label:<10} {model_disp:<30} {status:<25} {time_disp:<15}")
    else:
        # Ensemble display
        ff_disp = fmt_pred('FaceForensics')
        sd_disp = fmt_pred('SDv14')
        ch_disp = fmt_pred('Chameleon')
        ens_disp = fmt_pred('ENSEMBLE')
        print(f"{frame_label:<8} {time_label:<10} {ff_disp:<22} {sd_disp:<22} {ch_disp:<22} {ens_disp:<22} {time_disp:<15}")
    
    # Print saved face path
    if saved_path:
        print(f"   💾 Saved: {Path(saved_path).name}")
    
    # Print detailed breakdown every 10 frames
    if frame_num % 10 == 0:
        print(f"\n   📊 Last 10 frames breakdown:")
        print(f"      • Face Detection: {timing.get('face_detection', 0):.3f}s")
        print(f"      • Preprocessing: {timing.get('preprocessing', 0):.3f}s")
        print(f"      • Model Inference: {timing.get('inference', 0):.3f}s")
        print(f"      • Total: {total_time:.3f}s")
        print(f"      • Faces Saved: {saved_faces_count}")
        print()

def print_session_stats():
    """Print session statistics"""
    if session_start_time and frame_count > 0:
        elapsed = time.time() - session_start_time
        fps = frame_count / elapsed if elapsed > 0 else 0
        print(f"\n📊 Session Stats: {frame_count} frames processed | {saved_faces_count} faces saved | {fps:.2f} FPS | {elapsed:.1f}s elapsed")

# WebSocket handler - FIXED for websockets v13+
async def handler(ws):
    """Handler for websockets v13+ (no path argument)"""
    global frame_count, session_start_time
    
    client_addr = ws.remote_address
    print(f"\n{'='*140}")
    print(f"🔌 [DF SERVER] Client connected: {client_addr}")
    print(f"   Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*140}")
    
    if session_start_time is None:
        session_start_time = time.time()
    
    client_frame_count = 0
    
    try:
        async for raw_msg in ws:
            try:
                msg = json.loads(raw_msg)
            except Exception as e:
                print(f"❌ [DF SERVER] Invalid JSON received: {e}")
                await ws.send(json.dumps({'type': 'error', 'error': 'invalid json'}))
                continue

            if AUTH_TOKEN:
                if msg.get('token') != AUTH_TOKEN:
                    print(f"❌ [DF SERVER] Invalid auth token from {client_addr}")
                    await ws.send(json.dumps({'type': 'error', 'error': 'invalid token'}))
                    continue

            if msg.get('type') == 'frame':
                frame_start_time = time.time()
                frame_count += 1
                client_frame_count += 1
                
                frame_id = msg.get('id', 'unknown')
                video_id = msg.get('videoId', 'unknown')
                timestamp = msg.get('ts', 0)
                frame_b64 = msg.get('frameB64')
                
                # Get source flag and upload metadata
                source = msg.get('source', 'extension')
                current_frame = msg.get('currentFrame', 0)
                total_frames = msg.get('totalFrames', 0)
                video_duration = msg.get('videoDuration', 0)
                
                print(f"\n📥 [DF SERVER] Received frame #{client_frame_count} (ID: {frame_id[:8]}...) from {source} - video {video_id} @ {timestamp}s")
                
                if not frame_b64:
                    print(f"❌ [DF SERVER] No frame data provided")
                    await ws.send(json.dumps({'type': 'error', 'error': 'no frame provided'}))
                    continue

                # Decode frame
                decode_start = time.time()
                try:
                    img_bgr = b64_to_bgr_img(frame_b64)
                    decode_time = time.time() - decode_start
                    print(f"   ✓ Frame decoded: {img_bgr.shape[1]}x{img_bgr.shape[0]} ({decode_time:.3f}s)")
                except Exception as e:
                    print(f"❌ [DF SERVER] Failed to decode frame: {e}")
                    await ws.send(json.dumps({'type': 'error', 'error': f'failed to decode frame: {e}'}))
                    continue

                # Run inference (includes face detection/alignment/SAVING)
                print(f"   🔍 Running inference with {len(server_instance.models)} models...")
                loop = asyncio.get_running_loop()
                results = await loop.run_in_executor(None, infer_using_server, img_bgr, video_id, frame_id, timestamp)

                if 'error' in results:
                    print(f"   ❌ Inference error: {results['error']}")
                    
                    # Send special "no face" result to frontend instead of error
                    error_msg = results['error']
                    if 'no face' in error_msg.lower():
                        # Send as a result with special indication
                        resp = {
                            'type': 'result',
                            'id': msg.get('id'),
                            'ts': msg.get('ts'),
                            'prediction': 'NO_FACE',
                            'confidence': 0.0,
                            'error': error_msg,
                            'voting_info': '⚠️ No face detected in frame'
                        }
                        await ws.send(json.dumps(resp))
                    else:
                        # Other errors - send as error type
                        await ws.send(json.dumps({'type': 'error', 'error': error_msg}))
                    
                    continue

                # Extract bbox and saved path from results
                bbox_norm = results.pop('_bbox', None)
                saved_face_path = results.pop('_saved_face_path', None)
                
                if bbox_norm:
                    print(f"   ✓ Face detected: bbox={[f'{x:.3f}' for x in bbox_norm]}")
                else:
                    print(f"   ⚠️  No face bounding box detected (full image used)")

                # Print results in table format
                print_frame_analysis(client_frame_count, video_id, timestamp, results, bbox_norm, saved_face_path)

                # Prepare response with voting info
                ensemble_info = results.get('ENSEMBLE') if isinstance(results, dict) else None
                
                # Check if single model mode
                is_single_model = len(server_instance.models) == 1
                
                # Extract voting info for frontend
                voting_info = ""
                if ensemble_info:
                    voting_info = ensemble_info.get('rule', '') + " - " + ensemble_info.get('details', '')
                elif is_single_model:
                    # Single model mode - add conversion info to voting_info (if enabled)
                    model_name = list(server_instance.models.keys())[0]
                    if results[model_name].get('was_converted', False):
                        # Show conversion info only if SHOW_CONVERSION_INFO is True
                        if SHOW_CONVERSION_INFO:
                            orig_pred = results[model_name]['original_prediction']
                            orig_conf = results[model_name]['original_confidence']
                            voting_info = f"Converted: {orig_pred} ({orig_conf:.0%}) → REAL (threshold < {FAKE_THRESHOLD*100:.0f}%)"
                        else:
                            # Hide conversion - just show single model name
                            voting_info = f"Single model: {model_name}"
                    else:
                        voting_info = f"Single model: {model_name}"
                
                # Get final prediction and confidence
                if ensemble_info:
                    final_prediction = ensemble_info.get('prediction')
                    final_confidence = float(ensemble_info.get('confidence', 0.0))
                elif is_single_model:
                    model_name = list(server_instance.models.keys())[0]
                    final_prediction = results[model_name].get('prediction')
                    final_confidence = float(results[model_name].get('confidence', 0.0))
                else:
                    final_prediction = next(iter(results.values())).get('prediction') if results and isinstance(results, dict) else 'ERROR'
                    final_confidence = 0.0
                
                resp = {
                    'type': 'result',
                    'id': msg.get('id'),
                    'ts': msg.get('ts'),
                    'prediction': final_prediction,
                    'confidence': final_confidence,
                    'models': results,
                    'bbox': bbox_norm,
                    'voting_info': voting_info,
                    'saved_face_path': saved_face_path,
                    'source': msg.get('source', 'extension')
                }
                
                # Add progress info for web uploads
                if source == 'web_upload' and total_frames > 0:
                    progress_percent = (current_frame / total_frames) * 100
                    current_second = int(timestamp)
                    total_seconds = int(video_duration)
                    
                    resp['progress'] = progress_percent
                    resp['currentFrame'] = current_frame
                    resp['totalFrames'] = total_frames
                    resp['currentSecond'] = current_second
                    resp['totalSeconds'] = total_seconds
                    resp['isComplete'] = current_frame >= total_frames
                    
                    print(f"   📊 Progress: {progress_percent:.1f}% ({current_second}s / {total_seconds}s)")
                
                # Send response
                send_start = time.time()
                await ws.send(json.dumps(resp))
                send_time = time.time() - send_start
                
                total_frame_time = time.time() - frame_start_time
                print(f"   ✓ Response sent ({send_time:.3f}s) | Total frame time: {total_frame_time:.3f}s")
                
                # Print session stats every 10 frames
                if client_frame_count % 10 == 0:
                    print_session_stats()

            else:
                print(f"❌ [DF SERVER] Unknown message type: {msg.get('type')}")
                await ws.send(json.dumps({'type': 'error', 'error': 'unknown message type'}))

    except websockets.exceptions.ConnectionClosed:
        print(f"\n{'='*140}")
        print(f"🔌 [DF SERVER] Connection closed: {client_addr}")
        print(f"   Frames processed in this session: {client_frame_count}")
        print_session_stats()
        print(f"{'='*140}\n")
    except Exception as e:
        print(f"\n❌ [DF SERVER] Handler exception: {e}")
        import traceback
        traceback.print_exc()

async def main():
    print("\n" + "="*140)
    print(f"🚀 [DF SERVER] WebSocket server starting...")
    print(f"   Host: {HOST}")
    print(f"   Port: {PORT}")
    print(f"   Face Detection: {'ENABLED ✓' if USE_FACE_DETECTION else 'DISABLED'}")
    print(f"   FAKE→REAL Threshold: {FAKE_THRESHOLD*100:.1f}% (FAKE predictions below this → converted to REAL)")
    print(f"   REAL Confidence Boost: +{REAL_BOOST*100:.1f}% (added to all REAL predictions, capped at 100%)")
    print(f"   Frontend Display: {'Show conversion details ℹ️' if SHOW_CONVERSION_INFO else 'Hide conversion (natural) 🔒'}")
    print(f"   Preprocessed Faces Directory: {PREPROCESSED_FACES_DIR}")
    print(f"   Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*140)
    
    async with websockets.serve(handler, HOST, PORT):
        print(f"\n✅ [DF SERVER] Listening on ws://{HOST}:{PORT}")
        print(f"   Waiting for connections...\n")
        await asyncio.Future()  # run forever

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n" + "="*140)
        print("🛑 [DF SERVER] Server stopped manually (Ctrl+C)")
        print_session_stats()
        print(f"💾 Total faces saved: {saved_faces_count} in {PREPROCESSED_FACES_DIR}")
        print("="*140)
    except asyncio.CancelledError:
        pass