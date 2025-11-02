// debug_response.js - Add this temporarily to content_script.js to debug server responses
// Insert this into the ws.onmessage handler

ws.onmessage = (evt) => {
  try {
    const data = JSON.parse(evt.data);
    
    // === DEBUG OUTPUT ===
    console.log('═══════════════════════════════════════════');
    console.log('🔍 RAW SERVER RESPONSE:');
    console.log(JSON.stringify(data, null, 2));
    console.log('───────────────────────────────────────────');
    
    if (data.models) {
      console.log('📦 MODELS OBJECT:');
      console.log('  Keys:', Object.keys(data.models));
      Object.entries(data.models).forEach(([key, value]) => {
        console.log(`  ${key}:`, value);
      });
    } else {
      console.log('⚠️ NO MODELS OBJECT FOUND');
    }
    
    if (data.prediction) {
      console.log('📊 DIRECT PREDICTION:', data.prediction);
      console.log('📊 DIRECT CONFIDENCE:', data.confidence);
    }
    
    console.log('═══════════════════════════════════════════');
    // === END DEBUG ===
    
    if (data.type === 'result') {
      processResult(data);
    } else if (data.type === 'error') {
      console.warn('[DF EXT] Server error:', data.error);
      if (data.error.includes('No face detected')) {
        stats.noFaceFrames++;
      }
    }
  } catch (e) {
    console.error('[DF EXT] Failed to parse message:', e);
  }
};

// === EXPECTED SERVER FORMATS ===

// Format 1: Ensemble with 3 models (IDEAL)
const format1 = {
  "type": "result",
  "id": "frame_123",
  "ts": 45,
  "bbox": [0.2, 0.3, 0.6, 0.7],
  "models": {
    "efficientnet": {
      "prediction": "FAKE",
      "confidence": 0.85
    },
    "xception": {
      "prediction": "FAKE",
      "confidence": 0.78
    },
    "mesonet": {
      "prediction": "REAL",
      "confidence": 0.92
    }
  }
};

// Format 2: Single aggregated prediction (FALLBACK)
const format2 = {
  "type": "result",
  "id": "frame_123",
  "ts": 45,
  "prediction": "REAL",
  "confidence": 0.85,
  "bbox": [0.2, 0.3, 0.6, 0.7]
};

// Format 3: Ensemble with models array (NEEDS CONVERSION)
const format3 = {
  "type": "result",
  "id": "frame_123",
  "ts": 45,
  "bbox": [0.2, 0.3, 0.6, 0.7],
  "models": [
    { "name": "efficientnet", "prediction": "FAKE", "confidence": 0.85 },
    { "name": "xception", "prediction": "FAKE", "confidence": 0.78 },
    { "name": "mesonet", "prediction": "REAL", "confidence": 0.92 }
  ]
};

console.log('Expected formats:', { format1, format2, format3 });