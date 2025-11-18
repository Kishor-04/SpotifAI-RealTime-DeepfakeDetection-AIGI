// content_script.js - Frontend Display for Backend Voting Logic
// Backend handles all voting AND confidence boost mechanism:
//   1. REAL predictions: +15% confidence boost (capped at 100%)
//   2. FAKE predictions < 70% confidence: Converted to REAL with +15% boost (capped at 100%)
//   3. FAKE predictions ≥ 70% confidence: No changes
// Frontend displays the boosted confidence values and uses AVERAGE confidence for video verdicts

// --- CONFIGURATION ---
const SERVER_URL = 'ws://127.0.0.1:8765';
const BACKEND_API_URL = 'http://localhost:5000/api';
const SAMPLE_FPS = 1;            
const CAPTURE_WIDTH = 360;       // Reduced from 640 for faster transmission
const CAPTURE_QUALITY = 0.65;    // Reduced from 0.75 for faster transmission
const AGG_WINDOW_SEC = 10;       
const VERDICT_DISPLAY_TIME = 5000;
const SYNC_INTERVAL_MS = 30000;  // Sync every 30 seconds
// Note: Backend applies 70% FAKE threshold and +15% confidence boost
// Frontend only marks as SUSPICIOUS if confidence < 50% (very low)

// --- STATE ---
let ws = null;
let capturing = false;
let captureInterval = null;
let syncInterval = null;
let videoEl = null;
let overlayCanvas = null;
let overlayCtx = null;
let slidingResults = [];
let lastVerdictTime = 0;
let frameCounter = 0;
let sessionStartTime = null;
let lastProcessedSecond = -1;
let pendingSyncData = [];  // Buffer for syncing to backend

// Statistics
let stats = {
  totalFrames: 0,
  fakeFrames: 0,
  realFrames: 0,
  suspiciousFrames: 0,
  noFaceFrames: 0
};

// --- SYNC TO BACKEND ---
async function syncToBackend() {
  try {
    // Get extension token from storage
    const result = await chrome.storage.local.get(['extension_token', 'extension_user']);
    
    if (!result.extension_token) {
      console.log('[DF EXT] 🔐 No extension token found - skipping sync. Link your account in extension settings.');
      return;
    }
    
    if (pendingSyncData.length === 0) {
      console.log('[DF EXT] 📤 No new data to sync');
      return;
    }
    
    // Get video info
    const videoUrl = window.location.href;
    const videoId = new URLSearchParams(location.search).get('v') || 'unknown';
    const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent?.trim() || 
                      document.querySelector('h1.title')?.textContent?.trim() ||
                      document.title || 
                      'Unknown Video';
    
    // Prepare sync payload - ensure correct format
    const syncPayload = {
      extension_token: result.extension_token,
      video_url: videoUrl,
      video_title: videoTitle,
      frames: pendingSyncData.map(frame => ({
        frame_number: frame.frameNumber || 0,
        timestamp: frame.timestamp || 0,
        prediction: frame.prediction || 'UNKNOWN',
        confidence: frame.confidence || 0,
        bbox: frame.bbox || null  // Send as array or null
      })),
      session_stats: {
        total_frames: stats.totalFrames,
        fake_frames: stats.fakeFrames,
        real_frames: stats.realFrames,
        suspicious_frames: stats.suspiciousFrames,
        no_face_frames: stats.noFaceFrames
      }
    };
    
    console.log(`[DF EXT] 📤 Syncing ${pendingSyncData.length} frames to backend...`);
    console.log(`[DF EXT] 🎬 Video: ${videoTitle}`);
    console.log(`[DF EXT] 📊 Stats: ${stats.totalFrames} total, ${stats.fakeFrames} fake, ${stats.realFrames} real`);
    
    const response = await fetch(`${BACKEND_API_URL}/extension/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(syncPayload)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[DF EXT] ✅ Sync successful: ${data.message}`);
      console.log(`[DF EXT] 📊 Session ID: ${data.session_id}, Frames synced: ${data.frames_synced}`);
      
      // Clear synced data
      pendingSyncData = [];
    } else {
      const errorData = await response.json();
      console.error('[DF EXT] ❌ Sync failed:', errorData.error || 'Unknown error');
      console.error('[DF EXT] 📋 Response status:', response.status);
      
      // If token is invalid, clear it
      if (response.status === 401 || response.status === 403) {
        console.warn('[DF EXT] 🔐 Invalid token - clearing from storage');
        await chrome.storage.local.remove(['extension_token', 'extension_user']);
      }
    }
  } catch (error) {
    console.error('[DF EXT] ❌ Sync error:', error);
    console.error('[DF EXT] 📋 Error details:', error.message);
  }
}

function startSyncInterval() {
  if (syncInterval) return;
  
  // Sync immediately
  syncToBackend();
  
  // Then sync every 30 seconds
  syncInterval = setInterval(() => {
    if (capturing && pendingSyncData.length > 0) {
      syncToBackend();
    }
  }, SYNC_INTERVAL_MS);
  
  console.log('[DF EXT] 🔄 Auto-sync started (every 30s)');
}

function stopSyncInterval() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  
  // Final sync before stopping
  if (pendingSyncData.length > 0) {
    console.log('[DF EXT] 📤 Final sync before stopping...');
    syncToBackend();
  }
}

// --- UI INJECTION ---
function injectUI() {
  if (document.getElementById('df-container')) return;
  
  const container = document.createElement('div');
  container.id = 'df-container';
  container.innerHTML = `
    <style>
      #df-overlay {
        position: fixed;
        right: 20px;
        bottom: 80px;
        z-index: 999999;
        font-family: 'Segoe UI', Arial, sans-serif;
      }
      
      #df-toggle {
        display: flex;
        align-items: center;
        gap: 10px;
        background: rgba(0, 0, 0, 0.85);
        color: #fff;
        padding: 10px 16px;
        border-radius: 25px;
        cursor: grab;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 2px solid rgba(255,255,255,0.1);
        user-select: none;
      }
      
      #df-toggle:active {
        cursor: grabbing;
      }
      
      #df-toggle:hover {
        background: rgba(0, 0, 0, 0.95);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0,0,0,0.4);
      }
      
      #df-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: gray;
        box-shadow: 0 0 8px currentColor;
        transition: all 0.3s ease;
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      
      #df-status {
        font-size: 14px;
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      }
      
      #df-stats {
        font-size: 11px;
        color: rgba(255,255,255,0.7);
        margin-top: 2px;
      }
      
      /* Verdict Popup */
      #df-verdict-popup {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-20px);
        background: rgba(0, 0, 0, 0.95);
        color: white;
        padding: 20px 30px;
        border-radius: 15px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        z-index: 1000000;
        opacity: 0;
        transition: all 0.4s ease;
        pointer-events: none;
        border: 2px solid rgba(255,255,255,0.2);
        min-width: 450px;
      }
      
      #df-verdict-popup.show {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      
      #df-verdict-title {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      #df-verdict-details {
        font-size: 14px;
        color: rgba(255,255,255,0.8);
        line-height: 1.6;
      }
      
      #df-verdict-breakdown {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid rgba(255,255,255,0.2);
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        font-size: 12px;
      }
      
      .df-verdict-stat {
        text-align: center;
        padding: 8px;
        background: rgba(255,255,255,0.1);
        border-radius: 8px;
      }
      
      .df-verdict-stat-value {
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 4px;
      }
      
      .df-verdict-stat-label {
        font-size: 10px;
        color: rgba(255,255,255,0.6);
        text-transform: uppercase;
      }
      
      #df-voting-info {
        margin-top: 12px;
        padding: 10px;
        background: rgba(255,255,255,0.05);
        border-radius: 8px;
        font-size: 11px;
        color: rgba(255,255,255,0.7);
        line-height: 1.4;
      }
      
      /* Loading indicator */
      #df-loading {
        display: none;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 20px 30px;
        border-radius: 10px;
        z-index: 1000001;
        font-size: 16px;
      }
      
      .df-spinner {
        border: 3px solid rgba(255,255,255,0.3);
        border-top: 3px solid white;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        animation: spin 1s linear infinite;
        margin: 0 auto 10px;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
    
    <div id="df-overlay">
      <div id="df-toggle" title="Click to start/stop deepfake detection">
        <div id="df-dot"></div>
        <div>
          <div id="df-status">Detector: OFF</div>
          <div id="df-stats"></div>
        </div>
      </div>
    </div>
    
    <div id="df-verdict-popup">
      <div id="df-verdict-title"></div>
      <div id="df-verdict-details"></div>
      <div id="df-verdict-breakdown"></div>
      <div id="df-voting-info"></div>
    </div>
    
    <div id="df-loading">
      <div class="df-spinner"></div>
      <div>Connecting to detection server...</div>
    </div>
  `;
  
  document.body.appendChild(container);
  
  const toggleBtn = document.getElementById('df-toggle');
  const overlayDiv = document.getElementById('df-overlay');
  
  // Add click event
  toggleBtn.addEventListener('click', toggleCapture);
  
  // Make draggable
  makeDraggable(overlayDiv, toggleBtn);
}

// --- DRAGGABLE FUNCTIONALITY ---
function makeDraggable(overlayElement, handleElement) {
  let isDragging = false;
  let hasMoved = false;
  let startX, startY, initialX, initialY;
  
  handleElement.addEventListener('mousedown', (e) => {
    isDragging = true;
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = overlayElement.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    
    e.stopPropagation();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    // Mark as moved if dragged more than 5px
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      hasMoved = true;
      handleElement.style.cursor = 'grabbing';
    }
    
    if (hasMoved) {
      let newX = initialX + deltaX;
      let newY = initialY + deltaY;
      
      // Keep within screen bounds
      const rect = overlayElement.getBoundingClientRect();
      newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
      newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));
      
      overlayElement.style.left = `${newX}px`;
      overlayElement.style.top = `${newY}px`;
      overlayElement.style.right = 'auto';
      overlayElement.style.bottom = 'auto';
    }
  });
  
  document.addEventListener('mouseup', (e) => {
    if (isDragging) {
      isDragging = false;
      handleElement.style.cursor = 'grab';
      
      // If it was moved, prevent the click event
      if (hasMoved) {
        e.stopPropagation();
        e.preventDefault();
      }
    }
  });
}

// --- VIDEO ELEMENT ---
function findVideoElement() {
  const vids = Array.from(document.querySelectorAll('video'));
  for (const v of vids) {
    if ((v.offsetParent !== null || v.width > 0) && v.readyState > 1) return v;
  }
  return vids[0] || null;
}

// --- BADGE UPDATE ---
function updateBadge(state, confidence = 0, extraInfo = '') {
  const dot = document.getElementById('df-dot');
  const status = document.getElementById('df-status');
  const statsEl = document.getElementById('df-stats');
  
  if (!dot || !status) return;
  
  switch (state) {
    case 'OFF':
      dot.style.background = '#666';
      dot.style.color = '#666';
      status.textContent = 'Detector: OFF';
      statsEl.textContent = '';
      break;
    case 'CONNECTING':
      dot.style.background = '#ff9800';
      dot.style.color = '#ff9800';
      status.textContent = 'Connecting...';
      statsEl.textContent = '';
      break;
    case 'REAL':
      dot.style.background = '#1db954';
      dot.style.color = '#1db954';
      status.textContent = `✓ REAL`;
      statsEl.textContent = `${Math.round(confidence*100)}% confidence${extraInfo ? ' • ' + extraInfo : ''}`;
      break;
    case 'FAKE':
      dot.style.background = '#e02121';
      dot.style.color = '#e02121';
      status.textContent = `✗ FAKE`;
      statsEl.textContent = `${Math.round(confidence*100)}% confidence${extraInfo ? ' • ' + extraInfo : ''}`;
      break;
    case 'SUSPICIOUS':
      dot.style.background = '#f5c542';
      dot.style.color = '#f5c542';
      status.textContent = `⚠ SUSPICIOUS`;
      statsEl.textContent = `${Math.round(confidence*100)}% confidence${extraInfo ? ' • ' + extraInfo : ''}`;
      break;
    case 'NO_FACE':
      dot.style.background = '#888888';
      dot.style.color = '#888888';
      status.textContent = `⚠ NO FACE`;
      statsEl.textContent = `No face detected in frame${extraInfo ? ' • ' + extraInfo : ''}`;
      break;
    case 'ANALYZING':
      dot.style.background = '#2196f3';
      dot.style.color = '#2196f3';
      status.textContent = 'Analyzing...';
      statsEl.textContent = `${stats.totalFrames} frames processed`;
      break;
    default:
      dot.style.background = 'gray';
      status.textContent = 'Detector: ON';
      statsEl.textContent = `${stats.totalFrames} frames`;
  }
}

// --- VERDICT POPUP ---
function showVerdictPopup(prediction, confidence, windowStats, votingInfo) {
  const popup = document.getElementById('df-verdict-popup');
  const title = document.getElementById('df-verdict-title');
  const details = document.getElementById('df-verdict-details');
  const breakdown = document.getElementById('df-verdict-breakdown');
  const votingInfoEl = document.getElementById('df-voting-info');
  
  if (!popup) return;
  
  // Set title with emoji
  let emoji = '⚪';
  let color = '#666';
  if (prediction === 'FAKE') {
    emoji = '🔴';
    color = '#e02121';
  } else if (prediction === 'REAL') {
    emoji = '🟢';
    color = '#1db954';
  } else if (prediction === 'SUSPICIOUS') {
    emoji = '🟡';
    color = '#f5c542';
  }
  
  popup.style.borderColor = color;
  title.innerHTML = `${emoji} <span style="color: ${color}">${prediction}</span>`;
  
  // Set details
  const totalAnalyzed = windowStats.fake + windowStats.real + windowStats.suspicious;
  details.innerHTML = `
    <strong>Confidence:</strong> ${Math.round(confidence * 100)}%<br>
    <strong>Analysis Window:</strong> Last ${AGG_WINDOW_SEC} seconds (${totalAnalyzed} frames)
  `;
  
  // Set breakdown
  breakdown.innerHTML = `
    <div class="df-verdict-stat">
      <div class="df-verdict-stat-value" style="color: #1db954">${windowStats.real}</div>
      <div class="df-verdict-stat-label">Real Frames</div>
    </div>
    <div class="df-verdict-stat">
      <div class="df-verdict-stat-value" style="color: #e02121">${windowStats.fake}</div>
      <div class="df-verdict-stat-label">Fake Frames</div>
    </div>
    <div class="df-verdict-stat">
      <div class="df-verdict-stat-value" style="color: #f5c542">${windowStats.suspicious}</div>
      <div class="df-verdict-stat-label">Suspicious</div>
    </div>
    ${windowStats.noFace > 0 ? `
    <div class="df-verdict-stat">
      <div class="df-verdict-stat-value" style="color: #888888">${windowStats.noFace}</div>
      <div class="df-verdict-stat-label">No Face</div>
    </div>
    ` : ''}
  `;
  
  // Set voting info
  if (votingInfo) {
    votingInfoEl.innerHTML = `<strong>🗳️ Backend Voting:</strong> ${votingInfo}`;
    votingInfoEl.style.display = 'block';
  } else {
    votingInfoEl.style.display = 'none';
  }
  
  // Show popup
  popup.classList.add('show');
  
  // Hide after delay
  setTimeout(() => {
    popup.classList.remove('show');
  }, VERDICT_DISPLAY_TIME);
}

// --- WEBSOCKET ---
function connectWS() {
  if (ws && ws.readyState === WebSocket.OPEN) return ws;
  
  updateBadge('CONNECTING');
  document.getElementById('df-loading').style.display = 'block';
  
  ws = new WebSocket(SERVER_URL);
  
  ws.onopen = () => {
    console.log('[DF EXT] ✅ Connected to backend server');
    document.getElementById('df-loading').style.display = 'none';
    updateBadge('ANALYZING');
    sessionStartTime = Date.now();
  };
  
  ws.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data);
      
      if (data.type === 'result') {
        processResult(data);
      } else if (data.type === 'error') {
        console.warn('[DF EXT] Server error:', data.error);
        if (data.error.includes('No face detected')) {
          stats.noFaceFrames++;
          console.log('[DF EXT] ⚠️ No face detected in frame');
        }
      }
    } catch (e) {
      console.error('[DF EXT] Failed to parse message:', e);
    }
  };
  
  ws.onclose = () => {
    console.log('[DF EXT] ❌ Connection closed');
    updateBadge('OFF');
    clearOverlay();
    document.getElementById('df-loading').style.display = 'none';
  };
  
  ws.onerror = (e) => {
    console.error('[DF EXT] WebSocket error:', e);
    document.getElementById('df-loading').style.display = 'none';
    alert('Failed to connect to detection server. Please ensure server is running on localhost:8765');
  };
  
  return ws;
}

// --- PROCESS RESULT (Display backend results) ---
function processResult(data) {
  // Backend already applied confidence boost (+15% for REAL, +15% for converted FAKE→REAL)
  // Backend threshold: FAKE < 70% → converts to REAL with confidence boost
  // All confidence calculations are done on backend
  
  let prediction = data.prediction || 'SUSPICIOUS';
  let confidence = data.confidence ?? 0.5;
  const votingInfo = data.voting_info || data.votingInfo || '';
  
  // Handle NO_FACE detection
  if (prediction === 'NO_FACE') {
    console.log(`[DF EXT] ⚠️ No face detected in frame`);
    
    const result = {
      id: data.id,
      ts: data.ts ?? Math.floor((videoEl && videoEl.currentTime) || 0),
      prediction: 'NO_FACE',
      confidence: 0.0,
      votingInfo: votingInfo || '⚠️ No face detected',
      bbox: null,
      models: {}
    };
    
    // Update statistics
    stats.totalFrames++;
    stats.noFaceFrames++;
    
    // Add to sliding window
    slidingResults.push(result);
    while (slidingResults.length > 120) slidingResults.shift();
    
    // Add NO_FACE frame to pending sync data
    pendingSyncData.push({
      frameNumber: stats.totalFrames,
      timestamp: result.ts,
      prediction: 'NO_FACE',
      confidence: 0.0,
      bbox: null
    });
    
    // Clear overlay (no face box to draw)
    clearOverlay();
    
    // Update UI to show "No Face" status
    updateOverlayUI(result);
    
    return;
  }
  
  // Frontend only marks as SUSPICIOUS if confidence is very low (< 50%)
  // Note: Backend already boosted REAL predictions by +25%, so most should be > 50%
  if (confidence < 0.50 && (prediction === 'FAKE' || prediction === 'REAL')) {
    console.log(`[DF EXT] ⚠️ Very low confidence detected: ${prediction} (${Math.round(confidence*100)}%) → SUSPICIOUS`);
    prediction = 'SUSPICIOUS';
  }
  
  const result = {
    id: data.id,
    ts: data.ts ?? Math.floor((videoEl && videoEl.currentTime) || 0),
    prediction: prediction,
    confidence: confidence,
    votingInfo: votingInfo,
    bbox: data.bbox ?? null,
    models: data.models || {}
  };
  
  console.log(`[DF EXT] 📊 Frame ${stats.totalFrames + 1}: ${result.prediction} (${Math.round(result.confidence*100)}%)${result.votingInfo ? ' | ' + result.votingInfo : ''}`);
  console.log(`[DF EXT] 📦 BBox data:`, result.bbox);
  
  // Update statistics
  stats.totalFrames++;
  if (result.prediction === 'FAKE') stats.fakeFrames++;
  else if (result.prediction === 'REAL') stats.realFrames++;
  else if (result.prediction === 'SUSPICIOUS') stats.suspiciousFrames++;
  
  // Add to sliding window
  slidingResults.push(result);
  while (slidingResults.length > 120) slidingResults.shift();
  
  // Add to pending sync data
  pendingSyncData.push({
    frameNumber: stats.totalFrames,
    timestamp: result.ts,
    prediction: result.prediction,
    confidence: result.confidence,
    bbox: result.bbox
  });
  
  // Draw face box with prediction
  if (result.bbox && videoEl) {
    console.log(`[DF EXT] 🎨 Drawing bbox:`, result.bbox);
    createOverlayCanvas(videoEl);
    drawFaceBox(result.bbox, result.prediction, result.confidence);
  } else {
    console.log(`[DF EXT] ⚠️ No bbox to draw - bbox:`, result.bbox, 'videoEl:', !!videoEl);
    clearOverlay();
  }
  
  // Check if 10 seconds have passed for video verdict
  const currentVideoTime = Math.floor(videoEl?.currentTime || 0);
  const timeSinceLastVerdict = currentVideoTime - lastVerdictTime;
  
  if (timeSinceLastVerdict >= AGG_WINDOW_SEC) {
    aggregateAndShowVerdict();
    lastVerdictTime = currentVideoTime;
  } else {
    // Update badge with latest frame result
    const shortInfo = votingInfo.split(' - ')[0]; // First part of voting info
    updateBadge(result.prediction, result.confidence, shortInfo);
  }
}

// --- AGGREGATION & VERDICT (Frontend summary) ---
function aggregateAndShowVerdict() {
  if (!videoEl || slidingResults.length === 0) return;
  
  const nowSec = Math.floor(videoEl.currentTime || 0);
  const windowStart = nowSec - AGG_WINDOW_SEC;
  const framesWindow = slidingResults.filter(r => r.ts >= windowStart && r.ts <= nowSec);
  
  if (framesWindow.length === 0) {
    updateBadge('ANALYZING');
    return;
  }
  
  // Count predictions in window
  let fake = [], real = [], susp = [], noFace = [];
  for (const f of framesWindow) {
    if (f.prediction === 'FAKE') fake.push(f);
    else if (f.prediction === 'REAL') real.push(f);
    else if (f.prediction === 'NO_FACE') noFace.push(f);
    else susp.push(f);
  }
  
  // Video-level verdict: highest count wins, use AVERAGE confidence
  let finalPred = 'SUSPICIOUS';
  let finalConf = 0;
  let votingInfo = '';
  
  if (susp.length > fake.length && susp.length > real.length) {
    finalPred = 'SUSPICIOUS';
    finalConf = susp.length > 0 ? susp.reduce((s,x)=>s+x.confidence,0)/susp.length : 0;
    votingInfo = `Most frames suspicious (${susp.length}/${framesWindow.length})`;
  } else if (fake.length > real.length) {
    finalPred = 'FAKE';
    finalConf = fake.length > 0 ? fake.reduce((s,x)=>s+x.confidence,0)/fake.length : 0;
    votingInfo = `Majority fake frames (${fake.length}/${framesWindow.length}) - Avg confidence`;
  } else if (real.length > fake.length) {
    finalPred = 'REAL';
    finalConf = real.length > 0 ? real.reduce((s,x)=>s+x.confidence,0)/real.length : 0;
    votingInfo = `Majority real frames (${real.length}/${framesWindow.length}) - Avg confidence`;
  } else {
    // Tie - use average confidence
    const avgFake = fake.length ? fake.reduce((s,x)=>s+x.confidence,0)/fake.length : 0;
    const avgReal = real.length ? real.reduce((s,x)=>s+x.confidence,0)/real.length : 0;
    if (avgFake > avgReal) {
      finalPred = 'FAKE';
      finalConf = avgFake;
      votingInfo = `Tie broken by avg confidence (FAKE: ${Math.round(avgFake*100)}% vs REAL: ${Math.round(avgReal*100)}%)`;
    } else {
      finalPred = 'REAL';
      finalConf = avgReal;
      votingInfo = `Tie broken by avg confidence (REAL: ${Math.round(avgReal*100)}% vs FAKE: ${Math.round(avgFake*100)}%)`;
    }
  }
  
  // Update badge
  updateBadge(finalPred, finalConf);
  
  // Show verdict popup
  showVerdictPopup(finalPred, finalConf, {
    fake: fake.length,
    real: real.length,
    suspicious: susp.length,
    noFace: noFace.length
  }, votingInfo);
  
  console.log(`[DF EXT] 🎯 10-Second Video Verdict: ${finalPred} (${Math.round(finalConf*100)}%) | ${votingInfo}`);
}

// --- CAPTURE & SEND ---
function captureAndSend() {
  if (!videoEl || videoEl.readyState < 2 || videoEl.paused) return;
  
  const currentSecond = Math.floor(videoEl.currentTime);
  
  // Only capture one frame per second
  if (currentSecond === lastProcessedSecond) return;
  lastProcessedSecond = currentSecond;
  
  try {
    const w = CAPTURE_WIDTH;
    const h = Math.round(videoEl.videoHeight * (w / videoEl.videoWidth));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoEl, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', CAPTURE_QUALITY);
    
    frameCounter++;
    const message = {
      type: 'frame',
      id: `frame_${frameCounter}_${Date.now()}`,
      videoId: new URLSearchParams(location.search).get('v') || 'unknown',
      ts: currentSecond,
      frameB64: dataUrl,
      source: 'extension'  // Mark as extension source
    };
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      console.log(`[DF EXT] 📤 Sent frame #${frameCounter} @ ${currentSecond}s`);
    }
  } catch (err) {
    console.error('[DF EXT] Capture error:', err);
  }
}

// --- OVERLAY CANVAS ---
function createOverlayCanvas(video) {
  if (overlayCanvas && overlayCanvas.parentElement) return;
  
  overlayCanvas = document.createElement('canvas');
  overlayCanvas.id = 'df-overlay-canvas';
  overlayCanvas.style.position = 'absolute';
  overlayCanvas.style.pointerEvents = 'none';
  overlayCanvas.style.zIndex = '999998';
  overlayCanvas.style.willChange = 'transform';
  overlayCanvas.style.transform = 'translateZ(0)';
  document.body.appendChild(overlayCanvas);
  overlayCtx = overlayCanvas.getContext('2d', { alpha: true, desynchronized: true });
  
  function resize() {
    const rect = video.getBoundingClientRect();
    overlayCanvas.width = Math.floor(rect.width);
    overlayCanvas.height = Math.floor(rect.height);
    overlayCanvas.style.left = `${rect.left + window.scrollX}px`;
    overlayCanvas.style.top = `${rect.top + window.scrollY}px`;
    overlayCanvas.style.width = `${rect.width}px`;
    overlayCanvas.style.height = `${rect.height}px`;
  }
  
  resize();
  
  // Use requestAnimationFrame for smoother updates
  let rafId = null;
  function scheduleResize() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      resize();
      rafId = null;
    });
  }
  
  // Optimize resize handling
  new ResizeObserver(scheduleResize).observe(video);
  window.addEventListener('scroll', scheduleResize, { passive: true, capture: true });
  window.addEventListener('resize', scheduleResize, { passive: true });
}

function drawFaceBox(bboxNorm, prediction, confidence) {
  if (!overlayCtx || !bboxNorm || !videoEl) {
    console.log(`[DF EXT] ❌ Cannot draw bbox - overlayCtx:`, !!overlayCtx, 'bboxNorm:', bboxNorm, 'videoEl:', !!videoEl);
    return;
  }
  
  console.log(`[DF EXT] ✏️ Drawing face box with bbox:`, bboxNorm, 'prediction:', prediction);
  
  // Use requestAnimationFrame for smoother drawing
  requestAnimationFrame(() => {
    const [bx, by, bw, bh] = bboxNorm;
    const cw = overlayCanvas.width, ch = overlayCanvas.height;
    const x = bx * cw, y = by * ch, w = bw * cw, h = bh * ch;
    
    let color = '#666';
    let bgColor = 'rgba(128, 128, 128, 0.3)';
    if (prediction === 'FAKE') {
      color = '#e02121';
      bgColor = 'rgba(224, 33, 33, 0.2)';
    } else if (prediction === 'REAL') {
      color = '#1db954';
      bgColor = 'rgba(29, 185, 84, 0.2)';
    } else if (prediction === 'SUSPICIOUS') {
      color = '#f5c542';
      bgColor = 'rgba(245, 197, 66, 0.2)';
    } else if (prediction === 'NO_FACE') {
      color = '#888888';
      bgColor = 'rgba(136, 136, 136, 0.2)';
    }
    
    overlayCtx.clearRect(0, 0, cw, ch);
    overlayCtx.fillStyle = bgColor;
    overlayCtx.fillRect(x, y, w, h);
    
    overlayCtx.lineWidth = Math.max(3, Math.round(Math.min(cw, ch) * 0.008));
    overlayCtx.strokeStyle = color;
    overlayCtx.shadowColor = color;
    overlayCtx.shadowBlur = 10;
    overlayCtx.beginPath();
    overlayCtx.rect(x, y, w, h);
    overlayCtx.stroke();
    overlayCtx.shadowBlur = 0;
    
    const label = prediction === 'NO_FACE' ? 'NO FACE' : `${prediction} ${Math.round((confidence||0)*100)}%`;
    overlayCtx.font = `bold ${Math.max(14, Math.round(ch * 0.035))}px Arial`;
    const padding = 10;
    const textWidth = overlayCtx.measureText(label).width + padding * 2;
    const textHeight = parseInt(overlayCtx.font, 10) + padding * 2;
    
    overlayCtx.fillStyle = color;
    overlayCtx.fillRect(x, Math.max(0, y - textHeight - 5), textWidth, textHeight);
    
    overlayCtx.fillStyle = 'white';
    overlayCtx.font = `bold ${Math.max(14, Math.round(ch * 0.035))}px Arial`;
    overlayCtx.fillText(label, x + padding, Math.max(textHeight - padding, y - 10));
  });
}

function updateOverlayUI(result) {
  // Update badge to show NO_FACE status
  updateBadge('NO_FACE', 0, '');
}

function clearOverlay() {
  if (overlayCtx && overlayCanvas) {
    requestAnimationFrame(() => {
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    });
  }
}

// --- START/STOP CAPTURE ---
function startCapture() {
  if (capturing) return;
  
  videoEl = findVideoElement();
  if (!videoEl) {
    alert('❌ No video element found on this page. Please open a YouTube video first.');
    return;
  }
  
  injectUI();
  connectWS();
  
  capturing = true;
  frameCounter = 0;
  lastProcessedSecond = -1;
  stats = { totalFrames: 0, fakeFrames: 0, realFrames: 0, suspiciousFrames: 0, noFaceFrames: 0 };
  slidingResults = [];
  pendingSyncData = [];
  lastVerdictTime = Math.floor(videoEl.currentTime || 0);
  
  updateBadge('ANALYZING');
  
  captureInterval = setInterval(captureAndSend, 100);
  
  // Start auto-sync to backend
  startSyncInterval();
  
  console.log('[DF EXT] 🚀 Detection started - displaying backend ensemble voting results');
  console.log('[DF EXT] 🔄 Auto-sync to backend enabled (every 30s)');
}

function stopCapture() {
  capturing = false;
  
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
  }
  
  // Stop sync and do final sync
  stopSyncInterval();
  
  if (ws) {
    ws.close();
    ws = null;
  }
  
  updateBadge('OFF');
  clearOverlay();
  
  if (stats.totalFrames > 0) {
    console.log('[DF EXT] 📊 Session Statistics:');
    console.log(`  Total Frames: ${stats.totalFrames}`);
    console.log(`  Real: ${stats.realFrames} (${Math.round(stats.realFrames/stats.totalFrames*100)}%)`);
    console.log(`  Fake: ${stats.fakeFrames} (${Math.round(stats.fakeFrames/stats.totalFrames*100)}%)`);
    console.log(`  Suspicious: ${stats.suspiciousFrames} (${Math.round(stats.suspiciousFrames/stats.totalFrames*100)}%)`);
    console.log(`  No Face: ${stats.noFaceFrames}`);
  }
  
  console.log('[DF EXT] ⏹️ Detection stopped');
}

function toggleCapture() {
  injectUI();
  if (!capturing) startCapture();
  else stopCapture();
}

// Expose functions globally for background.js and debugging
window.toggleCapture = toggleCapture;
window.debugExtensionSync = function() {
  console.log('[DF EXT DEBUG] 🔍 Sync Status:');
  console.log('  - Capturing:', capturing);
  console.log('  - Pending frames:', pendingSyncData.length);
  console.log('  - Total frames:', stats.totalFrames);
  console.log('  - Sync interval active:', syncInterval !== null);
  return {
    capturing,
    pendingFrames: pendingSyncData.length,
    totalFrames: stats.totalFrames,
    syncIntervalActive: syncInterval !== null,
    stats: {...stats}
  };
};
window.manualSync = syncToBackend;

// --- INIT ---
setTimeout(injectUI, 1200);

new MutationObserver(() => {
  if (!document.getElementById('df-container')) injectUI();
}).observe(document.body, { childList: true, subtree: true });

if (document.querySelector('video')) {
  document.querySelector('video').addEventListener('ended', () => {
    if (capturing) {
      console.log('[DF EXT] Video ended, stopping detection');
      stopCapture();
    }
  });
}

console.log('[DF EXT] 🎬 SpotifAI Detector loaded - ready to display backend results!');