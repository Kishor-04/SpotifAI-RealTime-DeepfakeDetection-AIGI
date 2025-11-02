// popup.js - Enhanced popup controller

let isDetecting = false;
let currentTab = null;

// Elements
const openYoutubeBtn = document.getElementById('open-youtube');
const openSettingsBtn = document.getElementById('open-settings');
const serverStatus = document.getElementById('server-status');
const connectionStatus = document.getElementById('connection-status');

// Initialize popup
async function init() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];
  
  const isYouTube = currentTab?.url?.includes('youtube.com/watch');
  
  if (!isYouTube) {
    connectionStatus.textContent = 'Open YouTube Video';
    serverStatus.className = 'status-indicator disconnected';
  } else {
    // Try to get state from content script
    chrome.tabs.sendMessage(currentTab.id, { type: 'GET_STATE' }, (response) => {
      if (chrome.runtime.lastError) {
        connectionStatus.textContent = 'Not Connected';
        serverStatus.className = 'status-indicator disconnected';
        return;
      }
      if (response && response.capturing) {
        connectionStatus.textContent = 'Connected';
        serverStatus.className = 'status-indicator connected';
      } else {
        connectionStatus.textContent = 'Ready';
        serverStatus.className = 'status-indicator';
      }
    });
  }
}

// Open YouTube
openYoutubeBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://www.youtube.com' });
  window.close();
});

// Open Settings (placeholder for future feature)
openSettingsBtn.addEventListener('click', () => {
  // For now, just show an alert - can be expanded later
  alert('Settings feature coming soon!\n\nCurrent Configuration:\n Frame Rate: 1 FPS\n Verdict Window: 10 seconds\n Models: 3 Ensemble\n Face Alignment: 68-point landmarks');
});

// Listen for updates from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_POPUP') {
    if (message.connected) {
      serverStatus.className = 'status-indicator connected';
      connectionStatus.textContent = 'Connected';
    } else {
      serverStatus.className = 'status-indicator disconnected';
      connectionStatus.textContent = 'Not Connected';
    }
  }
});

// Initialize on popup open
init();