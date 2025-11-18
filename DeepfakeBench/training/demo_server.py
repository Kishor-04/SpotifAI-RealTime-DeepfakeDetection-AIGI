#!/usr/bin/env python3
"""
Persistent Deepfake Detection Server with Folder Support
Load models once, process multiple images/videos/folders without reloading.

FIXES:
- Single model mode now correctly counts FAKE/REAL frames for video verdict
- Added 70% confidence threshold: FAKE predictions below 70% are converted to REAL
- Terminal now shows when frames are converted from FAKE to REAL
- Video verdict based on majority voting (most frames win)
- Video confidence is the maximum confidence among winning class frames
"""

import numpy as np
import cv2
import yaml
import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image as pil_image
import dlib
from imutils import face_utils
from skimage import transform as trans
import torchvision.transforms as T
from pathlib import Path
from typing import Tuple, List, Dict
import argparse
import sys
import os
from datetime import timedelta
import time
import glob

# Import your detectors registry
from .detectors import DETECTOR

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Print device information at startup
print("\n" + "="*80)
print("🖥️  DEVICE INFORMATION")
print("="*80)
print(f"PyTorch Version: {torch.__version__}")
print(f"CUDA Available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    try:
        print(f"CUDA Version: {torch.version.cuda}")
    except Exception:
        pass
    try:
        print(f"GPU Device: {torch.cuda.get_device_name(0)}")
        print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
    except Exception:
        pass
    print(f"Current Device: cuda:0 🟢")
else:
    print(f"Current Device: cpu ⚠️")
    print("Note: Running on CPU will be slower. Install CUDA-enabled PyTorch for GPU acceleration.")
print("="*80 + "\n")


class DeepfakeDetectionServer:
    """Persistent server that keeps models loaded in memory and optionally saves debug images."""

    # Define supported file extensions
    VIDEO_EXTENSIONS = {'.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm', '.m4v'}
    IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}
    
    # Confidence threshold for FAKE predictions
    FAKE_CONFIDENCE_THRESHOLD = 0.70
    
    # Confidence boost for REAL predictions (+25% by default)
    REAL_CONFIDENCE_BOOST = 0.25
    
    def __init__(self, detector_config: str, ensemble: bool = False,
                 weights_dir: str = './training/weights',
                 single_weights: str = None,
                 use_landmarks: bool = False,
                 landmark_model: str = None,
                 save_frames_dir: str = None,
                 save_preprocessed_dir: str = None):

        self.detector_config = detector_config
        self.ensemble = ensemble
        self.models = {}
        self.face_detector = None
        self.landmark_predictor = None

        # Debug save directories
        self.save_frames_dir = save_frames_dir
        self.save_preprocessed_dir = save_preprocessed_dir
        if self.save_frames_dir:
            self._ensure_dir(self.save_frames_dir)
        if self.save_preprocessed_dir:
            self._ensure_dir(self.save_preprocessed_dir)

        # Always load a face detector (dlib)
        try:
            print("Initializing face detector...")
            self.face_detector = dlib.get_frontal_face_detector()
            print("[✓] Face detector ready.")
        except Exception as e:
            print(f"[!] Failed to initialize dlib face detector: {e}")
            self.face_detector = None

        # Load landmark predictor optionally
        if use_landmarks and landmark_model:
            try:
                print("Loading landmark predictor...")
                self.landmark_predictor = dlib.shape_predictor(landmark_model)
                print("[✓] Landmark predictor loaded.")
            except Exception as e:
                print(f"[!] Failed to load landmark predictor '{landmark_model}': {e}")
                self.landmark_predictor = None
        else:
            if use_landmarks and not landmark_model:
                print("[!] use_landmarks=True but no --landmark_model provided. Continuing without landmarks.")
            else:
                print("[i] Running with face-detector-only (no landmark alignment).")

        # Load models
        self._load_models(ensemble, weights_dir, single_weights)

        print("\n" + "=" * 80)
        print("🚀 SERVER READY! Models loaded and waiting for images...")
        if not ensemble:
            print(f"⚙️  FAKE Confidence Threshold: {self.FAKE_CONFIDENCE_THRESHOLD*100:.0f}%")
            print(f"   (FAKE predictions below {self.FAKE_CONFIDENCE_THRESHOLD*100:.0f}% confidence will be converted to REAL)")
            print(f"⚙️  REAL Confidence Boost: +{self.REAL_CONFIDENCE_BOOST*100:.0f}%")
            print(f"   (REAL predictions get +{self.REAL_CONFIDENCE_BOOST*100:.0f}% boost, capped at 100%)")
        print("=" * 80)
        print("\n💡 [CONFIGURATION TIP]")
        print("   To adjust FAKE→REAL conversion rate:")
        print("   → Modify '_apply_confidence_threshold()' method in this file")
        print("   → Line ~148-180: Change 'if pred == 0 and conf < 0.70' threshold")
        print("   → Also update native_host/server.py for WebSocket/Extension")
        print("=" * 80)

    # ---- utilities for saving images and converting tensors ----
    @staticmethod
    def _ensure_dir(path: str):
        os.makedirs(path, exist_ok=True)

    @staticmethod
    def _save_bgr_image(path: str, img_bgr: np.ndarray):
        """Save a BGR uint8 image (OpenCV style) to disk."""
        if img_bgr is None:
            return
        if img_bgr.dtype != np.uint8:
            img = np.clip(img_bgr, 0, 255).astype(np.uint8)
        else:
            img = img_bgr
        cv2.imwrite(path, img)

    def _tensor_to_bgr_image(self, tensor: torch.Tensor):
        """Convert a normalized tensor (1,3,H,W) with CLIP-like normalization
        back to a BGR uint8 image suitable for saving/viewing."""
        t = tensor.detach().cpu().squeeze(0).clone()
        mean = torch.tensor([0.48145466, 0.4578275, 0.40821073], dtype=t.dtype, device=t.device).view(3, 1, 1)
        std = torch.tensor([0.26862954, 0.26130258, 0.27577711], dtype=t.dtype, device=t.device).view(3, 1, 1)
        t = t * std + mean
        t = torch.clamp(t, 0.0, 1.0)
        img = (t.permute(1, 2, 0).numpy() * 255.0).astype(np.uint8)
        img_bgr = img[:, :, ::-1].copy()
        return img_bgr

    def _load_models(self, ensemble: bool, weights_dir: str, single_weights: str):
        """Load all models into memory once"""

        if ensemble:
            weights_dir = os.path.join(os.getcwd(), "training", "weights")
            weights_dir = Path(weights_dir)
            model_weights = {
                'FaceForensics': weights_dir / 'effort_clip_L14_trainOn_FaceForensic.pth',
                'SDv14': weights_dir / 'effort_clip_L14_trainOn_sdv14.pth',
                'Chameleon': weights_dir / 'effort_clip_L14_trainOn_chameleon.pth',
            }

            shared_backbone = None
            print("=" * 80)
            print("Loading Ensemble Models (with shared CLIP backbone)...")
            print("=" * 80)

            for idx, (name, weight_path) in enumerate(model_weights.items()):
                if weight_path.exists():
                    print(f"Loading {name} model from {weight_path.name}...", end=" ")

                    if idx == 0:
                        model = self._load_detector(str(weight_path))
                        self.models[name] = model
                        shared_backbone = getattr(model, "backbone", None)
                        print("(with CLIP backbone)")
                    else:
                        model = self._load_detector(str(weight_path), shared_backbone)
                        self.models[name] = model
                        print("(reusing backbone)")
                else:
                    print(f"[Warning] {name} weights not found: {weight_path}")

            if not self.models:
                raise RuntimeError("No model weights found for ensemble!")
            print(f"\n[✓] Loaded {len(self.models)} models for ensemble inference.")

        else:
            if not single_weights:
                raise ValueError("Must specify --weights for single model mode")
            
            # Detect model name from weight file path
            weight_path = Path(single_weights)
            weight_name = weight_path.stem
            
            # Map common weight names to friendly names
            if 'FaceForensic' in weight_name:
                model_display_name = 'FaceForensics'
            elif 'sdv14' in weight_name or 'SDv14' in weight_name:
                model_display_name = 'SDv14'
            elif 'chameleon' in weight_name or 'Chameleon' in weight_name:
                model_display_name = 'Chameleon'
            else:
                model_display_name = 'Custom'
            
            print("=" * 80)
            print(f"Loading Single Model: {model_display_name}")
            print("=" * 80)
            print(f"Weight file: {weight_path.name}")
            self.models[model_display_name] = self._load_detector(single_weights)
            print(f"[✓] {model_display_name} model loaded successfully.")
            print(f"[i] Running in SINGLE MODEL mode (no ensemble voting)")
            print("=" * 80)

    def _load_detector(self, weights: str, shared_backbone=None):
        """Load a single detector"""
        with open(self.detector_config, "r") as f:
            cfg = yaml.safe_load(f)

        model_cls = DETECTOR[cfg["model_name"]]

        if shared_backbone is not None:
            model = model_cls(cfg).to(device)
            model.backbone = shared_backbone
        else:
            model = model_cls(cfg).to(device)

        ckpt = torch.load(weights, map_location=device)
        state = ckpt.get("state_dict", ckpt)
        state = {k.replace("module.", ""): v for k, v in state.items()}

        if shared_backbone is not None:
            head_state = {k: v for k, v in state.items() if k.startswith('head')}
            model.load_state_dict(head_state, strict=False)
        else:
            model.load_state_dict(state, strict=False)

        model.eval()
        return model

    @staticmethod
    def get_keypts(image, face, predictor, face_detector):
        shape = predictor(image, face)
        leye = np.array([shape.part(37).x, shape.part(37).y]).reshape(-1, 2)
        reye = np.array([shape.part(44).x, shape.part(44).y]).reshape(-1, 2)
        nose = np.array([shape.part(30).x, shape.part(30).y]).reshape(-1, 2)
        lmouth = np.array([shape.part(49).x, shape.part(49).y]).reshape(-1, 2)
        rmouth = np.array([shape.part(55).x, shape.part(55).y]).reshape(-1, 2)
        pts = np.concatenate([leye, reye, nose, lmouth, rmouth], axis=0)
        return pts

    def _img_align_crop(self, img, landmark, outsize):
        """The transform & warp logic extracted from extract_aligned_face for reuse."""
        dst = np.array([
            [30.2946, 51.6963], [65.5318, 51.5014], [48.0252, 71.7366],
            [33.5493, 92.3655], [62.7299, 92.2041]], dtype=np.float32)

        if outsize[1] == 112:
            dst[:, 0] += 8.0

        dst[:, 0] = dst[:, 0] * outsize[0] / 112
        dst[:, 1] = dst[:, 1] * outsize[1] / 112

        scale = 1.3
        margin_rate = scale - 1
        x_margin = outsize[0] * margin_rate / 2.
        y_margin = outsize[1] * margin_rate / 2.

        dst[:, 0] += x_margin
        dst[:, 1] += y_margin
        dst[:, 0] *= outsize[0] / (outsize[0] + 2 * x_margin)
        dst[:, 1] *= outsize[1] / (outsize[1] + 2 * y_margin)

        src = landmark.astype(np.float32)
        tform = trans.SimilarityTransform()
        tform.estimate(src, dst)
        M = tform.params[0:2, :]
        img = cv2.warpAffine(img, M, (outsize[1], outsize[0]))
        return cv2.resize(img, (outsize[1], outsize[0]))

    def extract_aligned_face(self, image, res=224):
        """Extract and align face from image. Returns BGR image or None."""
        if self.face_detector is None:
            return None

        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        # Changed upsample from 1 to 0 for faster detection (2x faster, slightly less accurate)
        faces = self.face_detector(rgb, 0)

        if len(faces):
            face = max(faces, key=lambda rect: rect.width() * rect.height())
            
            # Try landmark-based alignment first
            if self.landmark_predictor is not None:
                try:
                    landmarks = self.get_keypts(rgb, face, self.landmark_predictor, self.face_detector)
                    cropped_face = self._img_align_crop(rgb, landmarks, outsize=(res, res))
                    return cv2.cvtColor(cropped_face, cv2.COLOR_RGB2BGR)
                except Exception as e:
                    # Landmark detection failed - fall back to bounding box
                    print(f"[⚠] Landmark alignment failed: {e} — using bbox crop instead")
            
            # Fallback: Use bounding-box crop (when no landmarks or landmarks failed)
            left = max(0, face.left())
            top = max(0, face.top())
            right = min(rgb.shape[1], face.right())
            bottom = min(rgb.shape[0], face.bottom())
            w = right - left
            h = bottom - top
            
            # Add margin around face
            margin = int(0.25 * max(w, h))
            cx = (left + right) // 2
            cy = (top + bottom) // 2
            new_left = max(0, cx - (w // 2) - margin)
            new_top = max(0, cy - (h // 2) - margin)
            new_right = min(rgb.shape[1], cx + (w // 2) + margin)
            new_bottom = min(rgb.shape[0], cy + (h // 2) + margin)
            
            crop = rgb[new_top:new_bottom, new_left:new_right]
            if crop.size == 0:
                print(f"[!] Bounding box crop failed - empty crop region")
                return None
            
            crop = cv2.resize(crop, (res, res), interpolation=cv2.INTER_LINEAR)
            print(f"[✓] Using bbox crop: {w}x{h} → {res}x{res}")
            return cv2.cvtColor(crop, cv2.COLOR_RGB2BGR)
        
        return None

    @staticmethod
    def preprocess_face(img_bgr: np.ndarray):
        """BGR → tensor (1,3,224,224)"""
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        img_rgb = cv2.resize(img_rgb, (224, 224), interpolation=cv2.INTER_LINEAR)
        transform = T.Compose([
            T.ToTensor(),
            T.Normalize([0.48145466, 0.4578275, 0.40821073],
                        [0.26862954, 0.26130258, 0.27577711]),
        ])
        return transform(pil_image.fromarray(img_rgb)).unsqueeze(0)

    @torch.inference_mode()
    def inference(self, model, data_dict):
        """Run inference on a single model"""
        data, label = data_dict['image'], data_dict['label']
        data_dict['image'], data_dict['label'] = data.to(device), label.to(device)
        predictions = model(data_dict, inference=True)
        return predictions

    def _apply_confidence_threshold(self, prob: float, original_prediction: str, original_confidence: float, is_single_model: bool = False):
        """
        Apply confidence threshold logic with confidence boost:
        - If prediction is FAKE but confidence < threshold%, convert to REAL
        - If prediction is REAL, add boost% confidence boost (capped at 100%)
        - If prediction was converted to REAL, use FAKE's confidence + boost% (capped at 100%)
        - Returns: (final_prediction, final_confidence, was_converted)
        """
        if original_prediction == "FAKE" and original_confidence < self.FAKE_CONFIDENCE_THRESHOLD:
            # Convert FAKE to REAL
            # Use the FAKE's confidence as base and add boost (capped at 100%)
            base_confidence = original_confidence
            boosted_confidence = min(base_confidence + self.REAL_CONFIDENCE_BOOST, 1.0)
            return "REAL", boosted_confidence, True
        elif original_prediction == "REAL":
            # Apply confidence boost to REAL predictions (capped at 100%)
            boosted_confidence = min(original_confidence + self.REAL_CONFIDENCE_BOOST, 1.0)
            return "REAL", boosted_confidence, False
        else:
            # FAKE prediction with confidence >= threshold - no changes
            return original_prediction, original_confidence, False

    @torch.inference_mode()
    def process_image(self, img_path: str) -> Dict:
        """Process a single image through all loaded models"""

        # Load image
        img = cv2.imread(img_path)
        if img is None:
            return {'error': f'Failed to load image: {img_path}'}

        # Extract face
        if self.face_detector:
            face_aligned = self.extract_aligned_face(img)
            if face_aligned is None:
                return {'error': 'No face detected in image'}
        else:
            face_aligned = img

        # Save extracted face
        if self.save_frames_dir is not None and face_aligned is not None:
            base = Path(img_path).stem
            face_save_path = os.path.join(self.save_frames_dir, f"{base}_face.jpg")
            self._save_bgr_image(face_save_path, face_aligned)

        # Preprocess
        face_tensor = self.preprocess_face(face_aligned).to(device)

        # Save preprocessed tensor
        if self.save_preprocessed_dir is not None:
            base = Path(img_path).stem
            preproc_save_path = os.path.join(self.save_preprocessed_dir, f"{base}_preproc.jpg")
            img_bgr_preproc = self._tensor_to_bgr_image(face_tensor)
            self._save_bgr_image(preproc_save_path, img_bgr_preproc)

        data = {"image": face_tensor, "label": torch.tensor([0]).to(device)}

        # Check if single model mode
        is_single_model = len(self.models) == 1

        # Run inference with all models
        results = {}
        for model_name, model in self.models.items():
            preds = self.inference(model, data)
            cls_out = preds["cls"].squeeze().cpu().numpy()
            prob = preds["prob"].squeeze().cpu().numpy()

            pred_label = "FAKE" if prob >= 0.5 else "REAL"
            confidence = prob if prob >= 0.5 else (1 - prob)

            # Apply confidence threshold for single model mode
            if is_single_model:
                final_pred, final_conf, was_converted = self._apply_confidence_threshold(
                    prob, pred_label, confidence, is_single_model=True
                )
                
                results[model_name] = {
                    'cls': cls_out,
                    'prob': float(prob),
                    'prediction': final_pred,
                    'confidence': float(final_conf),
                    'original_prediction': pred_label,
                    'original_confidence': float(confidence),
                    'was_converted': was_converted
                }
            else:
                results[model_name] = {
                    'cls': cls_out,
                    'prob': float(prob),
                    'prediction': pred_label,
                    'confidence': float(confidence)
                }

        # Calculate ensemble verdict
        if len(self.models) > 1:
            ensemble_result = self._calculate_ensemble_verdict(results)
            results['ENSEMBLE'] = ensemble_result

        return results

    @staticmethod
    def _add_suspicious_flag(result: Dict) -> Dict:
        """Add suspicious flag if confidence is between 50-65%"""
        confidence = result['confidence']

        if 0.50 <= confidence <= 0.65:
            result['suspicious'] = True
            result['warning'] = '⚠️ LOW CONFIDENCE - Result uncertain'
        else:
            result['suspicious'] = False

        return result

    def _calculate_ensemble_verdict(self, results: Dict) -> Dict:
        """Custom voting logic for ensemble prediction"""
        fake_predictions = []
        real_predictions = []

        for model_name, result in results.items():
            if result['prediction'] == 'FAKE':
                fake_predictions.append({
                    'model': model_name,
                    'confidence': result['confidence'],
                    'prob': result['prob']
                })
            else:
                real_predictions.append({
                    'model': model_name,
                    'confidence': result['confidence'],
                    'prob': result['prob']
                })

        num_fake = len(fake_predictions)
        num_real = len(real_predictions)

        # Rule 1: All predict FAKE
        if num_fake == 3 and num_real == 0:
            best_fake = max(fake_predictions, key=lambda x: x['confidence'])
            result = {
                'prob': best_fake['prob'],
                'prediction': 'FAKE',
                'confidence': best_fake['confidence'],
                'rule': 'Rule 1: All models predict FAKE',
                'details': f"Using highest confidence: {best_fake['model']} ({best_fake['confidence']:.2%})"
            }
            return self._add_suspicious_flag(result)

        # Rule 2: All predict REAL
        elif num_fake == 0 and num_real == 3:
            best_real = max(real_predictions, key=lambda x: x['confidence'])
            result = {
                'prob': best_real['prob'],
                'prediction': 'REAL',
                'confidence': best_real['confidence'],
                'rule': 'Rule 2: All models predict REAL',
                'details': f"Using highest confidence: {best_real['model']} ({best_real['confidence']:.2%})"
            }
            return self._add_suspicious_flag(result)

        # Rule 3: 1 FAKE, 2 REAL
        elif num_fake == 1 and num_real == 2:
            fake_model = fake_predictions[0]
            best_real = max(real_predictions, key=lambda x: x['confidence'])

            if fake_model['confidence'] > 0.85:
                if best_real['confidence'] > 0.85:
                    result = {
                        'prob': best_real['prob'],
                        'prediction': 'REAL',
                        'confidence': best_real['confidence'],
                        'rule': 'Rule 3: Counter-Override - Both sides >85%, majority wins (REAL)',
                        'details': f"REAL wins high-confidence tie"
                    }
                else:
                    result = {
                        'prob': fake_model['prob'],
                        'prediction': 'FAKE',
                        'confidence': fake_model['confidence'],
                        'rule': 'Rule 3: Override - FAKE model has >85% confidence',
                        'details': f"FAKE override by {fake_model['model']}"
                    }
            else:
                result = {
                    'prob': best_real['prob'],
                    'prediction': 'REAL',
                    'confidence': best_real['confidence'],
                    'rule': 'Rule 3: Majority vote REAL (2 vs 1)',
                    'details': f"Using highest REAL confidence: {best_real['model']}"
                }
            return self._add_suspicious_flag(result)

        # Rule 4: 2 FAKE, 1 REAL
        elif num_fake == 2 and num_real == 1:
            real_model = real_predictions[0]
            best_fake = max(fake_predictions, key=lambda x: x['confidence'])

            if real_model['confidence'] > 0.85:
                if best_fake['confidence'] > 0.85:
                    result = {
                        'prob': best_fake['prob'],
                        'prediction': 'FAKE',
                        'confidence': best_fake['confidence'],
                        'rule': 'Rule 4: Counter-Override - Both sides >85%, majority wins (FAKE)',
                        'details': f"FAKE wins high-confidence tie"
                    }
                else:
                    result = {
                        'prob': real_model['prob'],
                        'prediction': 'REAL',
                        'confidence': real_model['confidence'],
                        'rule': 'Rule 4: Override - REAL model has >85% confidence',
                        'details': f"REAL override by {real_model['model']}"
                    }
            else:
                result = {
                    'prob': best_fake['prob'],
                    'prediction': 'FAKE',
                    'confidence': best_fake['confidence'],
                    'rule': 'Rule 4: Majority vote FAKE (2 vs 1)',
                    'details': f"Using highest FAKE confidence: {best_fake['model']}"
                }
            return self._add_suspicious_flag(result)

        # Fallback
        else:
            avg_prob = np.mean([r['prob'] for r in results.values()])
            avg_pred_label = "FAKE" if avg_prob >= 0.5 else "REAL"
            avg_confidence = avg_prob if avg_prob >= 0.5 else (1 - avg_prob)

            result = {
                'prob': float(avg_prob),
                'prediction': avg_pred_label,
                'confidence': float(avg_confidence),
                'rule': 'Fallback: Simple average',
                'details': 'Using standard averaging'
            }
            return self._add_suspicious_flag(result)

    def extract_frames_from_video(self, video_path: str, fps: int = 1):
        """Extract frames from video at specified FPS"""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return None, "Failed to open video file"

        video_fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frame_interval = max(1, int(video_fps / fps)) if video_fps > 0 else 1

        if self.save_frames_dir:
            os.makedirs(self.save_frames_dir, exist_ok=True)
        if self.save_preprocessed_dir:
            os.makedirs(self.save_preprocessed_dir, exist_ok=True)

        frames_data = []
        frame_count = 0
        extracted_count = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_count % frame_interval == 0:
                timestamp = frame_count / video_fps if video_fps > 0 else extracted_count

                if self.face_detector:
                    face_aligned = self.extract_aligned_face(frame)
                    if face_aligned is None:
                        frame_count += 1
                        continue
                else:
                    face_aligned = frame

                if self.save_frames_dir:
                    video_stem = Path(video_path).stem
                    face_path = os.path.join(
                        self.save_frames_dir, f"{video_stem}_frame{frame_count:06d}.jpg"
                    )
                    self._save_bgr_image(face_path, face_aligned)

                if self.save_preprocessed_dir:
                    face_tensor = self.preprocess_face(face_aligned)
                    video_stem = Path(video_path).stem
                    preproc_path = os.path.join(
                        self.save_preprocessed_dir,
                        f"{video_stem}_frame{frame_count:06d}_preproc.jpg"
                    )
                    img_bgr_preproc = self._tensor_to_bgr_image(face_tensor)
                    self._save_bgr_image(preproc_path, img_bgr_preproc)

                frames_data.append({
                    'frame': frame,
                    'frame_number': frame_count,
                    'timestamp': timestamp,
                    'time_str': str(timedelta(seconds=int(timestamp)))
                })
                extracted_count += 1

            frame_count += 1

        cap.release()
        print(f"✅ Extracted {extracted_count} frames from video\n")
        return frames_data, None

    @torch.inference_mode()
    def process_video(self, video_path: str, fps: int = 1) -> Dict:
        """Process video by extracting and analyzing frames"""

        frames_data, error = self.extract_frames_from_video(video_path, fps)

        if error:
            return {'error': error}

        if not frames_data:
            return {'error': 'No frames extracted from video'}

        frame_results = []
        fake_count = 0
        real_count = 0
        suspicious_count = 0
        converted_count = 0  # Track converted frames

        total_inference_time = 0
        total_face_detection_time = 0
        total_preprocessing_time = 0
        frame_times = []

        # Check if single model mode
        is_single_model = len(self.models) == 1

        print(f"🔍 Processing {len(frames_data)} frames...\n")

        for idx, frame_data in enumerate(frames_data, 1):
            frame_start_time = time.time()
            frame = frame_data['frame']

            face_detection_start = time.time()

            if self.face_detector:
                face_aligned = self.extract_aligned_face(frame)
                if face_aligned is None:
                    print(f"⚠️  Frame {idx}/{len(frames_data)} @ {frame_data['time_str']}: No face detected, skipping...")
                    continue
            else:
                face_aligned = frame

            face_detection_time = time.time() - face_detection_start
            total_face_detection_time += face_detection_time

            if self.save_frames_dir is not None and face_aligned is not None:
                video_stem = Path(video_path).stem
                fname = f"{video_stem}_frame{frame_data['frame_number']:06d}_time{int(frame_data['timestamp'])}s_face.jpg"
                save_path = os.path.join(self.save_frames_dir, fname)
                self._save_bgr_image(save_path, face_aligned)

            preprocess_start = time.time()
            face_tensor = self.preprocess_face(face_aligned).to(device)
            data = {"image": face_tensor, "label": torch.tensor([0]).to(device)}
            preprocess_time = time.time() - preprocess_start
            total_preprocessing_time += preprocess_time

            if self.save_preprocessed_dir is not None:
                try:
                    video_stem = Path(video_path).stem
                    fname = f"{video_stem}_frame{frame_data['frame_number']:06d}_time{int(frame_data['timestamp'])}s_preproc.jpg"
                    save_path = os.path.join(self.save_preprocessed_dir, fname)
                    img_bgr_preproc = self._tensor_to_bgr_image(face_tensor)
                    self._save_bgr_image(save_path, img_bgr_preproc)
                except Exception as e:
                    print(f"[!] Failed to save preprocessed image for frame {frame_data['frame_number']}: {e}")

            inference_start = time.time()

            frame_result = {
                'timestamp': frame_data['time_str'],
                'frame_number': frame_data['frame_number']
            }

            for model_name, model in self.models.items():
                preds = self.inference(model, data)
                cls_out = preds["cls"].squeeze().cpu().numpy()
                prob = preds["prob"].squeeze().cpu().numpy()

                pred_label = "FAKE" if prob >= 0.5 else "REAL"
                confidence = prob if prob >= 0.5 else (1 - prob)

                # Apply confidence threshold for single model mode
                if is_single_model:
                    final_pred, final_conf, was_converted = self._apply_confidence_threshold(
                        prob, pred_label, confidence, is_single_model=True
                    )
                    
                    frame_result[model_name] = {
                        'cls': cls_out,
                        'prob': float(prob),
                        'prediction': final_pred,
                        'confidence': float(final_conf),
                        'original_prediction': pred_label,
                        'original_confidence': float(confidence),
                        'was_converted': was_converted
                    }
                    
                    if was_converted:
                        converted_count += 1
                else:
                    frame_result[model_name] = {
                        'cls': cls_out,
                        'prob': float(prob),
                        'prediction': pred_label,
                        'confidence': float(confidence)
                    }

            inference_time = time.time() - inference_start
            total_inference_time += inference_time

            if len(self.models) > 1:
                model_results = {k: v for k, v in frame_result.items() if k not in ['timestamp', 'frame_number']}
                ensemble_result = self._calculate_ensemble_verdict(model_results)
                frame_result['ENSEMBLE'] = ensemble_result

                if ensemble_result.get('suspicious', False):
                    suspicious_count += 1
                else:
                    if ensemble_result['prediction'] == 'FAKE':
                        fake_count += 1
                    else:
                        real_count += 1
            else:
                # Single model mode - count based on final prediction
                model_name = list(self.models.keys())[0]
                if frame_result[model_name]['prediction'] == 'FAKE':
                    fake_count += 1
                else:
                    real_count += 1

            frame_total_time = time.time() - frame_start_time
            frame_times.append(frame_total_time)

            frame_result['timing'] = {
                'face_detection': face_detection_time,
                'preprocessing': preprocess_time,
                'inference': inference_time,
                'total': frame_total_time
            }

            frame_results.append(frame_result)

            if idx == 1:
                # Check if single model mode
                model_name = list(self.models.keys())[0]
                
                if is_single_model:
                    # Single model header
                    print(f"\n{'Frame':<15} {model_name:<30} {'Status':<25} {'Time (s)':<12}")
                    print(f"{'-'*82}")
                else:
                    # Ensemble header
                    print(f"\n{'Frame':<15} {'FaceForensics':<18} {'SDv14':<18} {'Chameleon':<18} {'ENSEMBLE':<20} {'Time (s)':<12}")
                    print(f"{'-'*101}")

            def fmt_pred(model_name):
                if model_name in frame_result:
                    pred = frame_result[model_name]['prediction']
                    conf = frame_result[model_name]['confidence']
                    is_suspicious = frame_result[model_name].get('suspicious', False)

                    if is_suspicious:
                        emoji = "🟡"
                        letter = "S"
                    else:
                        emoji = "🔴" if pred == "FAKE" else "🟢"
                        letter = pred[0]

                    return f"{emoji}{letter} {conf:.0%}"
                return "N/A"

            frame_label = f"{idx}/{len(frames_data)} @ {frame_data['time_str']}"
            time_disp = f"{frame_total_time:.3f}s"
            
            if is_single_model:
                # Single model display with conversion status
                model_name = list(self.models.keys())[0]
                model_disp = fmt_pred(model_name)
                
                # Show conversion status
                if frame_result[model_name].get('was_converted', False):
                    orig_pred = frame_result[model_name]['original_prediction']
                    orig_conf = frame_result[model_name]['original_confidence']
                    status = f"🔄 Converted: {orig_pred} {orig_conf:.0%}→REAL"
                else:
                    status = ""
                
                print(f"{frame_label:<15} {model_disp:<30} {status:<25} {time_disp:<12}")
            else:
                # Ensemble display
                ff_disp = fmt_pred('FaceForensics')
                sd_disp = fmt_pred('SDv14')
                ch_disp = fmt_pred('Chameleon')
                ens_disp = fmt_pred('ENSEMBLE')
                print(f"{frame_label:<15} {ff_disp:<18} {sd_disp:<18} {ch_disp:<18} {ens_disp:<20} {time_disp:<12}")

        num_analyzed = len(frame_results)
        avg_frame_time = np.mean(frame_times) if frame_times else 0
        avg_face_detection = total_face_detection_time / num_analyzed if num_analyzed > 0 else 0
        avg_preprocessing = total_preprocessing_time / num_analyzed if num_analyzed > 0 else 0
        avg_inference = total_inference_time / num_analyzed if num_analyzed > 0 else 0

        if frame_results:
            total_analyzed = len(frame_results)

            # Calculate video verdict based on majority voting
            if is_single_model:
                # Single model mode: use majority voting with average confidence
                if fake_count > real_count:
                    video_verdict = 'FAKE'
                    # Calculate average confidence among FAKE frames
                    model_name = list(self.models.keys())[0]
                    fake_confidences = [f[model_name]['confidence'] for f in frame_results 
                                       if f[model_name]['prediction'] == 'FAKE']
                    video_confidence = np.mean(fake_confidences) if fake_confidences else 0.0
                else:
                    video_verdict = 'REAL'
                    # Calculate average confidence among REAL frames
                    model_name = list(self.models.keys())[0]
                    real_confidences = [f[model_name]['confidence'] for f in frame_results 
                                       if f[model_name]['prediction'] == 'REAL']
                    video_confidence = np.mean(real_confidences) if real_confidences else 0.0
                
                fake_percentage = (fake_count / total_analyzed) * 100 if total_analyzed > 0 else 0
                
                return {
                    'video_verdict': video_verdict,
                    'video_confidence': video_confidence,
                    'total_frames_analyzed': total_analyzed,
                    'fake_frames': fake_count,
                    'real_frames': real_count,
                    'converted_frames': converted_count,
                    'fake_percentage': fake_percentage,
                    'frame_results': frame_results,
                    'timing_stats': {
                        'avg_frame_time': avg_frame_time,
                        'avg_face_detection': avg_face_detection,
                        'avg_preprocessing': avg_preprocessing,
                        'avg_inference': avg_inference,
                        'total_processing_time': sum(frame_times),
                        'min_frame_time': min(frame_times) if frame_times else 0,
                        'max_frame_time': max(frame_times) if frame_times else 0
                    }
                }
            else:
                # Ensemble mode: existing logic
                fake_confidences = []
                real_confidences = []
                suspicious_confidences = []

                for frame in frame_results:
                    if 'ENSEMBLE' in frame:
                        ens = frame['ENSEMBLE']
                        is_suspicious = ens.get('suspicious', False)

                        if is_suspicious:
                            suspicious_confidences.append(ens['confidence'])
                        elif ens['prediction'] == 'FAKE':
                            fake_confidences.append(ens['confidence'])
                        else:
                            real_confidences.append(ens['confidence'])

                if suspicious_count > fake_count and suspicious_count > real_count:
                    video_verdict = 'SUSPICIOUS'
                    video_confidence = np.mean(suspicious_confidences) if suspicious_confidences else 0.0
                elif fake_count > real_count:
                    video_verdict = 'FAKE'
                    video_confidence = np.mean(fake_confidences) if fake_confidences else 0.0
                else:
                    video_verdict = 'REAL'
                    video_confidence = np.mean(real_confidences) if real_confidences else 0.0

                fake_percentage = (fake_count / total_analyzed) * 100 if total_analyzed > 0 else 0

                return {
                    'video_verdict': video_verdict,
                    'video_confidence': video_confidence,
                    'total_frames_analyzed': total_analyzed,
                    'fake_frames': fake_count,
                    'real_frames': real_count,
                    'suspicious_frames': suspicious_count,
                    'fake_percentage': fake_percentage,
                    'frame_results': frame_results,
                    'timing_stats': {
                        'avg_frame_time': avg_frame_time,
                        'avg_face_detection': avg_face_detection,
                        'avg_preprocessing': avg_preprocessing,
                        'avg_inference': avg_inference,
                        'total_processing_time': sum(frame_times),
                        'min_frame_time': min(frame_times) if frame_times else 0,
                        'max_frame_time': max(frame_times) if frame_times else 0
                    }
                }
        else:
            return {'error': 'No frames could be analyzed (no faces detected)'}

    def process_folder(self, folder_path: str) -> Dict:
        """Process all images and videos in a folder"""
        folder_path = Path(folder_path)
        
        if not folder_path.exists():
            return {'error': f'Folder not found: {folder_path}'}
        
        if not folder_path.is_dir():
            return {'error': f'Path is not a directory: {folder_path}'}
        
        # Find all supported files
        image_files = []
        video_files = []
        
        for ext in self.IMAGE_EXTENSIONS:
            image_files.extend(folder_path.glob(f'*{ext}'))
            image_files.extend(folder_path.glob(f'*{ext.upper()}'))
        
        for ext in self.VIDEO_EXTENSIONS:
            video_files.extend(folder_path.glob(f'*{ext}'))
            video_files.extend(folder_path.glob(f'*{ext.upper()}'))
        
        # Remove duplicates and sort
        image_files = sorted(list(set(image_files)))
        video_files = sorted(list(set(video_files)))
        
        total_files = len(image_files) + len(video_files)
        
        if total_files == 0:
            return {'error': f'No supported files found in folder: {folder_path}'}
        
        print(f"\n📁 Processing folder: {folder_path}")
        print(f"   Found {len(image_files)} images and {len(video_files)} videos")
        print(f"   Total files to process: {total_files}\n")
        
        results = {
            'folder_path': str(folder_path),
            'total_files': total_files,
            'image_results': [],
            'video_results': [],
            'summary': {
                'images_processed': 0,
                'images_failed': 0,
                'videos_processed': 0,
                'videos_failed': 0,
                'fake_count': 0,
                'real_count': 0,
                'suspicious_count': 0,
                'total_processing_time': 0
            }
        }
        
        start_time = time.time()
        
        # Process images
        if image_files:
            print(f"{'='*80}")
            print(f"🖼️  PROCESSING IMAGES ({len(image_files)} files)")
            print(f"{'='*80}\n")
            
            for idx, img_path in enumerate(image_files, 1):
                print(f"[{idx}/{len(image_files)}] Processing: {img_path.name}")
                
                try:
                    img_result = self.process_image(str(img_path))
                    
                    if 'error' not in img_result:
                        results['summary']['images_processed'] += 1
                        
                        # Get ensemble verdict (or single model verdict)
                        if 'ENSEMBLE' in img_result:
                            verdict = img_result['ENSEMBLE']['prediction']
                            is_suspicious = img_result['ENSEMBLE'].get('suspicious', False)
                            conf = img_result['ENSEMBLE']['confidence']
                        else:
                            # Single model mode
                            model_name = list(self.models.keys())[0]
                            verdict = img_result[model_name]['prediction']
                            is_suspicious = False
                            conf = img_result[model_name]['confidence']
                            was_converted = img_result[model_name].get('was_converted', False)
                            
                            if was_converted:
                                orig_pred = img_result[model_name]['original_prediction']
                                orig_conf = img_result[model_name]['original_confidence']
                                print(f"   🔄 Converted: {orig_pred} ({orig_conf:.0%}) → REAL (threshold)")
                        
                        if is_suspicious:
                            results['summary']['suspicious_count'] += 1
                            emoji = "🟡"
                        elif verdict == 'FAKE':
                            results['summary']['fake_count'] += 1
                            emoji = "🔴"
                        else:
                            results['summary']['real_count'] += 1
                            emoji = "🟢"
                        
                        print(f"   Result: {emoji} {verdict} (Confidence: {conf:.2%})\n")
                        
                        results['image_results'].append({
                            'file': img_path.name,
                            'path': str(img_path),
                            'result': img_result
                        })
                    else:
                        results['summary']['images_failed'] += 1
                        print(f"   ❌ Failed: {img_result['error']}\n")
                        results['image_results'].append({
                            'file': img_path.name,
                            'path': str(img_path),
                            'error': img_result['error']
                        })
                
                except Exception as e:
                    results['summary']['images_failed'] += 1
                    print(f"   ❌ Exception: {str(e)}\n")
                    results['image_results'].append({
                        'file': img_path.name,
                        'path': str(img_path),
                        'error': str(e)
                    })
        
        # Process videos
        if video_files:
            print(f"\n{'='*80}")
            print(f"🎬 PROCESSING VIDEOS ({len(video_files)} files)")
            print(f"{'='*80}\n")
            
            for idx, vid_path in enumerate(video_files, 1):
                print(f"[{idx}/{len(video_files)}] Processing: {vid_path.name}")
                
                try:
                    vid_result = self.process_video(str(vid_path), fps=1)
                    
                    if 'error' not in vid_result:
                        results['summary']['videos_processed'] += 1
                        
                        verdict = vid_result['video_verdict']
                        conf = vid_result['video_confidence']
                        
                        if verdict == 'SUSPICIOUS':
                            results['summary']['suspicious_count'] += 1
                            emoji = "🟡"
                        elif verdict == 'FAKE':
                            results['summary']['fake_count'] += 1
                            emoji = "🔴"
                        else:
                            results['summary']['real_count'] += 1
                            emoji = "🟢"
                        
                        print(f"\n   Video Verdict: {emoji} {verdict} (Confidence: {conf:.2%})")
                        print(f"   Frames Analyzed: {vid_result['total_frames_analyzed']}")
                        
                        # Show converted frames if in single model mode
                        if 'converted_frames' in vid_result:
                            print(f"   FAKE: {vid_result['fake_frames']} | REAL: {vid_result['real_frames']} | CONVERTED: {vid_result['converted_frames']}")
                        else:
                            print(f"   FAKE: {vid_result['fake_frames']} | REAL: {vid_result['real_frames']} | SUSPICIOUS: {vid_result.get('suspicious_frames', 0)}")
                        print()
                        
                        results['video_results'].append({
                            'file': vid_path.name,
                            'path': str(vid_path),
                            'result': vid_result
                        })
                    else:
                        results['summary']['videos_failed'] += 1
                        print(f"   ❌ Failed: {vid_result['error']}\n")
                        results['video_results'].append({
                            'file': vid_path.name,
                            'path': str(vid_path),
                            'error': vid_result['error']
                        })
                
                except Exception as e:
                    results['summary']['videos_failed'] += 1
                    print(f"   ❌ Exception: {str(e)}\n")
                    results['video_results'].append({
                        'file': vid_path.name,
                        'path': str(vid_path),
                        'error': str(e)
                    })
        
        results['summary']['total_processing_time'] = time.time() - start_time
        
        return results

    def print_results(self, img_path: str, results: Dict):
        """Pretty print results"""
        print("\n" + "=" * 80)
        print(f"Image: {Path(img_path).name}")
        print("=" * 80)

        if 'error' in results:
            print(f"❌ Error: {results['error']}")
            return

        # Check if single model mode (no ENSEMBLE key means single model)
        is_single_model = 'ENSEMBLE' not in results

        for model_name, result in results.items():
            if model_name == 'ENSEMBLE':
                print(f"\n{'-' * 80}")

                is_suspicious = result.get('suspicious', False)
                if is_suspicious:
                    verdict_emoji = "🟡"
                else:
                    verdict_emoji = "🔴" if result['prediction'] == "FAKE" else "🟢"

                print(f"[{model_name} VERDICT] {verdict_emoji}")
                print(f"  Final Prediction: {result['prediction']} (Confidence: {result['confidence']:.2%})")

                if is_suspicious:
                    print(f"  ⚠️  WARNING: {result.get('warning', 'SUSPICIOUS - Low confidence')}")

                print(f"  Fake Probability: {result['prob']:.4f}")
                print(f"  Logic: {result.get('rule', 'N/A')}")
                print(f"  Details: {result.get('details', 'N/A')}")
                print(f"{'-' * 80}")
            else:
                pred_emoji = "🔴" if result['prediction'] == "FAKE" else "🟢"
                
                # If single model mode, make output more prominent
                if is_single_model:
                    print(f"\n{'-' * 80}")
                    print(f"[{model_name} MODEL] {pred_emoji}")
                    print(f"  Final Prediction: {result['prediction']} (Confidence: {result['confidence']:.2%})")
                    print(f"  Fake Probability: {result['prob']:.4f}")
                    
                    # Show conversion info if applicable
                    if result.get('was_converted', False):
                        print(f"  🔄 Conversion Applied:")
                        print(f"     Original: {result['original_prediction']} ({result['original_confidence']:.2%})")
                        print(f"     Reason: FAKE confidence < {self.FAKE_CONFIDENCE_THRESHOLD*100:.0f}% threshold")
                        print(f"     Result: Converted to REAL")
                    
                    print(f"{'-' * 80}")
                else:
                    print(f"\n[{model_name}] {pred_emoji}")
                    print(f"  Pred Label: {result['cls']} (0=Real, 1=Fake)")
                    print(f"  Fake Prob: {result['prob']:.4f}")
                    print(f"  Prediction: {result['prediction']} (Confidence: {result['confidence']:.2%})")

    def print_video_results(self, video_path: str, results: Dict):
        """Pretty print video analysis results with timing information"""
        print("\n" + "=" * 80)
        print(f"📹 Video: {Path(video_path).name}")
        print("=" * 80)

        if 'error' in results:
            print(f"❌ Error: {results['error']}")
            return

        video_verdict = results['video_verdict']
        video_conf = results.get('video_confidence', 0.0)
        total_analyzed = results['total_frames_analyzed']

        if video_verdict == 'SUSPICIOUS':
            verdict_emoji = "🟡"
        elif video_verdict == 'FAKE':
            verdict_emoji = "🔴"
        else:
            verdict_emoji = "🟢"

        print(f"\n{verdict_emoji} OVERALL VIDEO VERDICT: {video_verdict}")
        print(f"   Video Confidence: {video_conf:.2%}")
        print(f"   (Based on majority voting: average confidence from winning class)")
        print(f"\n📊 Analysis Summary:")
        print(f"   Total Frames Analyzed: {total_analyzed}")
        print(f"   FAKE Frames: {results['fake_frames']} ({results['fake_frames'] / total_analyzed * 100:.1f}%)")
        print(f"   REAL Frames: {results['real_frames']} ({results['real_frames'] / total_analyzed * 100:.1f}%)")
        
        # Show converted frames if in single model mode
        if 'converted_frames' in results:
            print(f"   🔄 Converted Frames (FAKE→REAL): {results['converted_frames']}")
        
        # Only show suspicious frames if they exist (ensemble mode)
        if 'suspicious_frames' in results and results['suspicious_frames'] > 0:
            print(f"   SUSPICIOUS Frames: {results['suspicious_frames']} ({results['suspicious_frames'] / total_analyzed * 100:.1f}%)")

        if 'timing_stats' in results:
            timing = results['timing_stats']
            print(f"\n⏱️  Performance Statistics:")
            print(f"   Total Processing Time: {timing['total_processing_time']:.2f}s")
            print(f"   Average Time per Frame: {timing['avg_frame_time']:.3f}s")
            print(f"   Throughput: {total_analyzed / timing['total_processing_time']:.2f} frames/sec")

    def print_folder_summary(self, results: Dict):
        """Print comprehensive folder processing summary"""
        print("\n" + "=" * 80)
        print("📊 FOLDER PROCESSING SUMMARY")
        print("=" * 80)
        
        summary = results['summary']
        
        print(f"\n📁 Folder: {results['folder_path']}")
        print(f"\n📈 Processing Statistics:")
        print(f"   Total Files: {results['total_files']}")
        print(f"   Images Processed: {summary['images_processed']}")
        print(f"   Images Failed: {summary['images_failed']}")
        print(f"   Videos Processed: {summary['videos_processed']}")
        print(f"   Videos Failed: {summary['videos_failed']}")
        print(f"   Total Processing Time: {summary['total_processing_time']:.2f}s")
        
        total_processed = summary['images_processed'] + summary['videos_processed']
        
        if total_processed > 0:
            print(f"\n🎯 Detection Results:")
            print(f"   🔴 FAKE: {summary['fake_count']} ({summary['fake_count']/total_processed*100:.1f}%)")
            print(f"   🟢 REAL: {summary['real_count']} ({summary['real_count']/total_processed*100:.1f}%)")
            print(f"   🟡 SUSPICIOUS: {summary['suspicious_count']} ({summary['suspicious_count']/total_processed*100:.1f}%)")
            
            print(f"\n📋 Detailed Results:")
            
            if results['image_results']:
                print(f"\n   Images:")
                for img_res in results['image_results']:
                    if 'error' not in img_res:
                        # Check if ensemble or single model
                        if 'ENSEMBLE' in img_res['result']:
                            ens = img_res['result'].get('ENSEMBLE', {})
                            verdict = ens.get('prediction', 'N/A')
                            conf = ens.get('confidence', 0)
                            is_suspicious = ens.get('suspicious', False)
                        else:
                            # Single model mode
                            model_name = list(self.models.keys())[0]
                            model_result = img_res['result'].get(model_name, {})
                            verdict = model_result.get('prediction', 'N/A')
                            conf = model_result.get('confidence', 0)
                            is_suspicious = False
                        
                        if is_suspicious:
                            emoji = "🟡"
                        elif verdict == 'FAKE':
                            emoji = "🔴"
                        else:
                            emoji = "🟢"
                        
                        print(f"      {emoji} {img_res['file']:<40} {verdict} ({conf:.2%})")
                    else:
                        print(f"      ❌ {img_res['file']:<40} Error: {img_res['error']}")
            
            if results['video_results']:
                print(f"\n   Videos:")
                for vid_res in results['video_results']:
                    if 'error' not in vid_res:
                        verdict = vid_res['result']['video_verdict']
                        conf = vid_res['result']['video_confidence']
                        frames = vid_res['result']['total_frames_analyzed']
                        
                        if verdict == 'SUSPICIOUS':
                            emoji = "🟡"
                        elif verdict == 'FAKE':
                            emoji = "🔴"
                        else:
                            emoji = "🟢"
                        
                        print(f"      {emoji} {vid_res['file']:<40} {verdict} ({conf:.2%}) [{frames} frames]")
                    else:
                        print(f"      ❌ {vid_res['file']:<40} Error: {vid_res['error']}")
        
        print("\n" + "=" * 80)

    def run_interactive(self):
        """Run in interactive mode - process images, videos, or folders"""
        print("\n📌 Interactive Mode - Enter file or folder paths to process")
        print("   Supported: Images (.jpg, .png, etc.) | Videos (.mp4, .avi, etc.) | Folders")
        print("   Type 'quit' or 'exit' to stop the server\n")

        processed_count = 0

        while True:
            try:
                file_path = input("\n🖼️/📹/📁 Enter path (or 'quit'): ").strip()

                if file_path.lower() in ['quit', 'exit', 'q']:
                    print(f"\n✅ Processed {processed_count} items. Shutting down server...")
                    break

                if not file_path:
                    continue

                file_path = file_path.strip('"').strip("'")
                path = Path(file_path)

                if not path.exists():
                    print(f"❌ Path not found: {file_path}")
                    continue

                # Check if it's a directory
                if path.is_dir():
                    print(f"\n📁 Detected folder. Processing all files inside...")
                    results = self.process_folder(file_path)
                    
                    if 'error' not in results:
                        self.print_folder_summary(results)
                        processed_count += 1
                    else:
                        print(f"❌ Error: {results['error']}")
                    
                    continue

                # It's a file
                file_ext = path.suffix.lower()

                if file_ext in self.VIDEO_EXTENSIONS:
                    print(f"\n🎬 Detected video file. Processing at 1 FPS...")
                    results = self.process_video(file_path, fps=1)
                    self.print_video_results(file_path, results)
                    processed_count += 1

                elif file_ext in self.IMAGE_EXTENSIONS:
                    results = self.process_image(file_path)
                    self.print_results(file_path, results)
                    processed_count += 1

                else:
                    print(f"❌ Unsupported file format: {file_ext}")
                    print(f"   Supported: Images {self.IMAGE_EXTENSIONS} | Videos {self.VIDEO_EXTENSIONS}")

            except KeyboardInterrupt:
                print(f"\n\n✅ Processed {processed_count} items. Shutting down server...")
                break
            except Exception as e:
                print(f"❌ Error processing: {e}")
                import traceback
                traceback.print_exc()


def parse_args():
    p = argparse.ArgumentParser(description="Persistent Deepfake Detection Server with Folder Support")
    p.add_argument("--detector_config", default='training/config/detector/effort.yaml',
                   help="YAML config file path")
    p.add_argument("--weights", required=False,
                   help="Single model weights (use with single model mode)")
    p.add_argument("--ensemble", action='store_true',
                   help="Run ensemble inference with all three models")
    p.add_argument("--weights_dir", default='./training/weights',
                   help="Directory containing model weights for ensemble")
    p.add_argument("--landmark_model", default=None,
                   help="dlib landmarks .dat file (optional for face alignment)")
    p.add_argument("--save_frames_dir", default=None,
                   help="Directory to save extracted/aligned face images (optional)")
    p.add_argument("--save_preprocessed_dir", default=None,
                   help="Directory to save preprocessed model inputs (optional)")
    return p.parse_args()


def main():
    args = parse_args()

    if not args.ensemble and not args.weights:
        print("❌ Error: Either --ensemble or --weights must be specified")
        return

    try:
        server = DeepfakeDetectionServer(
            detector_config=args.detector_config,
            ensemble=args.ensemble,
            weights_dir=args.weights_dir,
            single_weights=args.weights,
            use_landmarks=(args.landmark_model is not None),
            landmark_model=args.landmark_model,
            save_frames_dir=args.save_frames_dir,
            save_preprocessed_dir=args.save_preprocessed_dir
        )

        server.run_interactive()

    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()