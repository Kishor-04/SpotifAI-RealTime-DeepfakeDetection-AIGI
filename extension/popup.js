// popup.js - Enhanced popup controller

let isDetecting = false;
let currentTab = null;

// Elements
const openYoutubeBtn = document.getElementById('open-youtube');
const linkAccountBtn = document.getElementById('link-account');
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
  
  // Load saved token if exists
  chrome.storage.local.get(['extension_token', 'extension_user'], (result) => {
    if (result.extension_token && result.extension_user) {
      // Update button to show linked state
      linkAccountBtn.innerHTML = '<span class="btn-icon">✓</span><span>Account Linked</span>';
      linkAccountBtn.classList.remove('btn-secondary');
      linkAccountBtn.classList.add('btn-success');
    }
  });
}

// Open YouTube
openYoutubeBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://www.youtube.com' });
  window.close();
});

// Open Settings Page in new tab
linkAccountBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  window.close();
});

// Listen for storage changes to update UI when token is saved in settings
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && (changes.extension_token || changes.extension_user)) {
    const hasToken = changes.extension_token && changes.extension_token.newValue;
    const hasUser = changes.extension_user && changes.extension_user.newValue;
    
    if (hasToken && hasUser) {
      linkAccountBtn.innerHTML = '<span class="btn-icon">✓</span><span>Account Linked</span>';
      linkAccountBtn.classList.remove('btn-secondary');
      linkAccountBtn.classList.add('btn-success');
    } else {
      linkAccountBtn.innerHTML = '<span class="btn-icon">🔗</span><span>Link Account</span>';
      linkAccountBtn.classList.remove('btn-success');
      linkAccountBtn.classList.add('btn-secondary');
    }
  }
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