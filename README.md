# 🛡️ SpotifAI - Real-time Deepfake Detection System

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.8.0-red.svg)](https://pytorch.org/)
[![CUDA](https://img.shields.io/badge/CUDA-12.8-green.svg)](https://developer.nvidia.com/cuda-toolkit)

A real-time deepfake detection system with browser extension support for YouTube videos. Built on DeepfakeBench framework with ensemble model voting and advanced confidence mechanisms.

## 📑 Table of Contents

- [Features](#-features)
- [System Architecture](#-system-architecture)
- [File Structure](#-file-structure)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [Usage Modes](#-usage-modes)
- [Browser Extension](#-browser-extension)
- [Important Notes](#-important-notes)
- [Troubleshooting](#-troubleshooting)
- [Credits](#-credits)

---

## ✨ Features

### Core Detection
- **Real-time Frame Analysis**: 1 FPS video frame processing
- **Ensemble Voting**: 3-model majority voting system
- **Face Detection**: dlib-based with 68-point or 81-point landmark alignment

### Browser Integration
- **YouTube Extension**: Chrome/Edge extension for video detection
- **WebSocket Communication**: Real-time backend-frontend connection
- **Visual Feedback**: Bounding boxes, confidence badges, verdict popups
- **Draggable UI**: Floating badge can be moved anywhere on screen

### Flexibility
- **Two Variants**: 
  - Standard server
  - No-Conversion server
- **Preprocessing**: Automatic face extraction and saving

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (YouTube)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Chrome Extension (content_script.js)                  │ │
│  │  • Captures video frames (1 FPS)                       │ │
│  │  • Displays bounding boxes & badges                    │ │
│  │  • Shows 10-second rolling verdicts                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↕ WebSocket (ws://127.0.0.1:8765)
┌─────────────────────────────────────────────────────────────┐
│              Python Backend (server.py)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  WebSocket Server                                      │ │
│  │  • Receives base64 frames                             │ │
│  │  • Applies confidence mechanisms                      │ │
│  │  • Returns predictions + bounding boxes               │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  DeepfakeBench Detection Server                       │ │
│  │  • Face detection (dlib)                              │ │
│  │  • Landmark alignment (68/81-point)                   │ │
│  │  • Ensemble inference (3 models)                      │ │
│  │  • Majority voting                                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Model Weights (PyTorch)                         │
│  • effort_clip_L14_trainOn_FaceForensic.pth                 │
│  • effort_clip_L14_trainOn_FF_DF.pth                        │
│  • effort_clip_L14_trainOn_FF_DFDC.pth                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

```
RealTime-LiveStreaming-DeepfakeDetection-AIGI/
│
├── README.md                          # This file
├── requirements.txt                   # Python dependencies
├── check_torch_cuda.py               # CUDA verification script
│
├── DeepfakeBench/                    # Main detection framework
│   ├── __init__.py
│   ├── training/
│   │   ├── demo_server.py            # CLI server (with conversion)
│   │   ├── demo_server_no_conversion.py  # CLI server (no conversion)
│   │   ├── test.py                   # Testing utilities
│   │   ├── train.py                  # Training utilities
│   │   │
│   │   ├── config/
│   │   │   └── detector/
│   │   │       └── effort.yaml       # Model configuration
│   │   │
│   │   ├── weights/                  # Model weight files (.pth)
│   │   │   ├── effort_clip_L14_trainOn_FaceForensic.pth
│   │   │   ├── effort_clip_L14_trainOn_FF_DF.pth
│   │   │   └── effort_clip_L14_trainOn_FF_DFDC.pth
│   │   │
│   │   ├── detectors/                # Detector implementations
│   │   │   ├── effort_detector.py
│   │   │   └── base_detector.py
│   │   │
│   │   ├── networks/                 # Neural network architectures
│   │   ├── loss/                     # Loss functions
│   │   └── metrics/                  # Evaluation metrics
│   │
│   ├── preprocessing/                # Face detection & alignment
│   │   ├── shape_predictor_68_face_landmarks.dat  # 68-point model
│   │   └── shape_predictor_81_face_landmarks.dat  # 81-point model
│   │
│   └── saves_pipeline/
│       └── preprocessed_faces/       # Saved face extractions
│           ├── unknown/              # Standard server
│           └── no_conversion/        # No-conversion server
│
├── native_host/                      # WebSocket servers
│   ├── __init__.py
│   ├── server.py                     # WebSocket (with conversion)
│   └── server_no_conversion.py       # WebSocket (no conversion)
│
├── extension/                        # Chrome/Edge extension
│   ├── manifest.json                 # Extension configuration
│   ├── popup.html                    # Extension popup UI
│   ├── popup.css                     # Popup styling
│   ├── popup.js                      # Popup logic
│   ├── content_script.js             # YouTube integration (815 lines)
│   ├── background.js                 # Background service worker
│   ├── overlay.html                  # Badge template
│   └── overlay.css                   # Badge styling
│
└── venv39/                           # Python virtual environment
    └── ...
```

---

## 🔧 Installation

### Prerequisites

- **Python**: 3.9 or higher
- **CUDA**: 12.8 (for GPU acceleration)
- **GPU**: NVIDIA GPU with CUDA support (e.g., RTX 2050)
- **Browser**: Chrome or Edge (for extension)
- **OS**: Windows (tested), Linux (compatible)

### Step 1: Setup Project

Navigate to your project directory:

```bash
cd "d:\College Projects\PBS\Now its Final\Effort-AIGI-Detection - Copy - Copy"
```

Or clone from your repository if you've already pushed it:

```bash
git clone https://github.com/Kishor-04/RealTime-LiveStreaming-DeepfakeDetection-AIGI.git
cd RealTime-LiveStreaming-DeepfakeDetection-AIGI
```

### Step 2: Create Virtual Environment

```bash
python -m venv venv39
```

**Activate:**
- Windows (PowerShell): `.\venv39\Scripts\Activate.ps1`
- Windows (CMD): `.\venv39\Scripts\activate.bat`
- Linux/Mac: `source venv39/bin/activate`

### Step 3: Install Dependencies

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128
pip install -r requirements.txt
```

### Step 4: Verify CUDA

```bash
python check_torch_cuda.py
```

Expected output:
```
PyTorch version: 2.8.0+cu128
CUDA available: True
CUDA version: 12.8
Device: cuda
GPU: NVIDIA GeForce RTX 2050
```

### Step 5: Download Model Weights

Place model weights in `DeepfakeBench/training/weights/`:
- `effort_clip_L14_trainOn_FaceForensic.pth`
- `effort_clip_L14_trainOn_FF_DF.pth` (for ensemble)
- `effort_clip_L14_trainOn_FF_DFDC.pth` (for ensemble)

### Step 6: Download Landmark Models

Download from [dlib.net](http://dlib.net/files/):
- **68-point (recommended)**: `shape_predictor_68_face_landmarks.dat.bz2`
- **81-point (alternative)**: `shape_predictor_81_face_landmarks.dat.bz2`

Extract and place in `DeepfakeBench/preprocessing/`

---

## 🚀 Quick Start

### Option 1: CLI Testing (Fastest)

```bash
python DeepfakeBench/training/demo_server.py \
  --weights DeepfakeBench/training/weights/effort_clip_L14_trainOn_FaceForensic.pth \
  --landmark_model DeepfakeBench/preprocessing/shape_predictor_68_face_landmarks.dat
```

Then provide image/video path for detection.

### Option 2: WebSocket + Browser Extension

#### Step 1: Start WebSocket Server

```bash
python native_host/server.py \
  --weights DeepfakeBench/training/weights/effort_clip_L14_trainOn_FaceForensic.pth \
  --landmark_model DeepfakeBench/preprocessing/shape_predictor_68_face_landmarks.dat
```

Server starts on `ws://127.0.0.1:8765`

#### Step 2: Load Extension

1. Open Chrome/Edge
2. Go to `chrome://extensions/` or `edge://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `extension/` folder
6. Extension icon appears in toolbar

#### Step 3: Test Detection

1. Open any YouTube video
2. Click the extension icon (or see floating badge on video)
3. Click badge to start detection
4. See real-time results with bounding boxes
5. View 10-second verdict popups

---

## ⚙️ Configuration

### Command-Line Arguments

```bash
python native_host/server.py \
  --weights <path>              # Single model weights
  --ensemble                    # Use ensemble (3 models)
  --weights_dir <dir>           # Directory with ensemble weights
  --landmark_model <path>       # 68/81-point landmark model
  --host <ip>                   # Server host (default: 127.0.0.1)
  --port <port>                 # Server port (default: 8765)
  --detector_config <yaml>      # Model config (default: effort.yaml)
```

### Ensemble Mode

```bash
python native_host/server.py \
  --ensemble \
  --weights_dir DeepfakeBench/training/weights \
  --landmark_model DeepfakeBench/preprocessing/shape_predictor_68_face_landmarks.dat
```

Uses majority voting from 3 models:
- `effort_clip_L14_trainOn_FaceForensic.pth`
- `effort_clip_L14_trainOn_FF_DF.pth`
- `effort_clip_L14_trainOn_FF_DFDC.pth`

---

## 🎯 Usage Modes

### Mode 1: Standard Server

**Files**: `server.py`, `demo_server.py`

**Use Cases**:
- General deepfake detection
- Balanced accuracy

### Mode 2: No-Conversion Server

**Files**: `server_no_conversion.py`, `demo_server_no_conversion.py`

**Use Cases**:
- Stricter detection
- Comparison testing
- Research purposes

**Start command**:
```bash
python native_host/server_no_conversion.py \
  --weights DeepfakeBench/training/weights/effort_clip_L14_trainOn_FaceForensic.pth \
  --landmark_model DeepfakeBench/preprocessing/shape_predictor_68_face_landmarks.dat
```

---

## 🌐 Browser Extension

### Features

1. **Floating Badge**
   - Shows current detection state
   - Real-time confidence updates
   - Draggable to any position
   - Click to start/stop detection

2. **Visual Indicators**
   - Green: REAL detected
   - Red: FAKE detected
   - Yellow: SUSPICIOUS
   - Gray: NO FACE detected
   - Blue: Analyzing

3. **Bounding Boxes**
   - Drawn on detected faces
   - Color-coded by prediction
   - Shows confidence percentage

4. **10-Second Verdicts**
   - Aggregates predictions over 10 seconds
   - Displays final verdict popup
   - Shows breakdown: REAL/FAKE/SUSPICIOUS/NO_FACE counts
   - Includes voting information

5. **Stats Tracking**
   - Total frames processed
   - Average confidence
   - Verdict history

### Extension Files

- **manifest.json**: Extension metadata and permissions
- **popup.html/css/js**: Extension popup (click icon)
- **content_script.js**: Main YouTube integration logic
- **background.js**: Service worker
- **overlay.html/css**: Floating badge template

### Draggable Badge

The floating detection badge can be moved anywhere on screen:
- **Click + Drag**: Move badge to new position
- **Quick Click**: Toggle detection on/off
- **Stays within bounds**: Won't go off-screen

---

## ⚠️ Important Notes

### Face Detection & Landmarks

#### 68-Point vs 81-Point Models

**68-Point (Recommended):**
- ✅ More robust to occlusions
- ✅ Works with partial face views
- ✅ Better for real-world scenarios
- ✅ Handles profile views better

**81-Point (Alternative):**
- ⚠️ Requires ALL landmarks visible
- ⚠️ Fails with partial occlusions
- ⚠️ Stricter alignment
- ✅ More accurate when face is fully visible

**Fallback Mechanism:**
If landmark detection fails, system automatically falls back to bounding box crop with 25% margin.

### Performance Considerations

1. **Frame Rate**: Default 1 FPS (configurable)
   - Lower = Less CPU/GPU load
   - Higher = More responsive but resource-intensive

2. **GPU Memory**: 
   - Single model: ~2-3GB VRAM
   - Ensemble (3 models): ~6-8GB VRAM

3. **Face Preprocessing**:
   - Saved to `saves_pipeline/preprocessed_faces/`
   - Can grow large over time
   - Periodically clean if needed

### Server Variants Comparison

| Feature | Standard | No-Conversion |
|---------|----------|---------------|
| Saved faces dir | `unknown/` | `no_conversion/` |
| Use case | General | Strict/Research |

---

## 🐛 Troubleshooting

### Issue: "No face detected"

**Causes:**
- Face too small in frame
- Extreme angles (profile view)
- Occlusions (hand, hat, mask)
- Poor lighting
- 81-point landmarks failing

**Solutions:**
1. Switch to 68-point landmark model
2. Check terminal for `[⚠] Landmark alignment failed` messages
3. Verify bbox fallback is working: `[✓] Using bbox crop`
4. Run without landmarks: Remove `--landmark_model` flag

### Issue: WebSocket connection failed

**Solutions:**
1. Check server is running: `ws://127.0.0.1:8765`
2. Verify firewall not blocking port 8765
3. Check terminal for server startup messages
4. Try restarting server

### Issue: CUDA out of memory

**Solutions:**
1. Use single model instead of ensemble
2. Close other GPU applications
3. Reduce video resolution
4. Lower frame rate

### Issue: Extension not working

**Solutions:**
1. Reload extension: `chrome://extensions/` → Click reload icon
2. Check extension enabled
3. Verify server is running
4. Open browser console (F12) for errors
5. Try refreshing YouTube page

### Issue: Models not loading

**Solutions:**
1. Verify weight files exist in `DeepfakeBench/training/weights/`
2. Check file paths are correct
3. Ensure weights downloaded completely
4. Verify file permissions

---

## 📊 Terminal Output Examples

### Server Startup
```
[DF SERVER] Starting local inference server...
[DF SERVER] Mode: SINGLE MODEL
[DF SERVER] Face Detection: ENABLED ✓

✅ Server loaded successfully

🚀 SERVER READY! Models loaded and waiting for images...
```

### Frame Analysis
```
📥 [DF SERVER] Received frame #5 from video dQw4w9WgXcQ @ 5.2s
   🔍 Running inference...
   ✓ Face detected: bbox=['0.215', '0.180', '0.785', '0.920']
   
┌─────────────────────────────────────────────────────────────┐
│ Frame #5 | Video: dQw4w9WgXcQ | Time: 5.2s                  │
├─────────────────────────────────────────────────────────────┤
│ Model: effort_clip_L14_trainOn_FaceForensic                 │
│ Prediction: REAL (92%)                                      │
├─────────────────────────────────────────────────────────────┤
│ Face bbox: [0.215, 0.180, 0.785, 0.920]                    │
│ Preprocessing: ✓ Saved to preprocessed_faces/unknown/...   │
└─────────────────────────────────────────────────────────────┘
   ✓ Response sent (0.003s) | Total: 0.125s
```

---

## 🎓 Credits

### Framework
- **DeepfakeBench**: [GitHub](https://github.com/SCLBD/DeepfakeBench)
- **EFFORT Model**: CLIP-based deepfake detection

### Libraries
- **PyTorch**: Deep learning framework
- **dlib**: Face detection and landmarks
- **OpenCV**: Image processing
- **websockets**: Real-time communication

### Development
- **Project**: SpotifAI - Real-time Deepfake Detection System
- **Date**: November 2025

---

## 📌 Quick Reference

### Essential Commands

```bash
# Start standard server
python native_host/server.py --weights <path> --landmark_model <path>

# Start no-conversion server
python native_host/server_no_conversion.py --weights <path> --landmark_model <path>

# CLI testing
python DeepfakeBench/training/demo_server.py --weights <path> --landmark_model <path>

# Ensemble mode
python native_host/server.py --ensemble --landmark_model <path>

# Check CUDA
python check_torch_cuda.py
```

### File Paths

- Models: `DeepfakeBench/training/weights/`
- Landmarks: `DeepfakeBench/preprocessing/`
- Config: `DeepfakeBench/training/config/detector/effort.yaml`
- Extension: `extension/`
- Saved faces: `DeepfakeBench/saves_pipeline/preprocessed_faces/`

### Default Values

- Frame Rate: **1 FPS**
- Verdict Window: **10 seconds**
- WebSocket: **ws://127.0.0.1:8765**
- Face Alignment: **68-point (recommended)**

---

**Happy Detecting! 🎉**
