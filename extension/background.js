// background.js - Service worker for SpotifAI extension
// Handles communication between popup and content script

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "TOGGLE_DETECTION") {
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        // Execute toggle function in content script
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            if (window.toggleCapture) {
              window.toggleCapture();
            } else {
              console.warn("[DF EXT] Extension not fully loaded yet. Please wait a moment and try again.");
              alert("Extension is still loading. Please wait a moment and try again.");
            }
          },
        }).catch(err => {
          console.error("[DF EXT] Failed to execute script:", err);
        });
      }
    });
  }
});

// Log extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[DF EXT] 🎉 SpotifAI installed successfully!');
    console.log('[DF EXT] 📋 Next steps:');
    console.log('[DF EXT]   1. Start the detection server: python -m native_host.server --ensemble');
    console.log('[DF EXT]   2. Open a YouTube video');
    console.log('[DF EXT]   3. Click the floating badge to start detection');
  } else if (details.reason === 'update') {
    console.log('[DF EXT] ✅ Extension updated to version', chrome.runtime.getManifest().version);
  }
});

console.log('[DF EXT] 🔧 Background service worker ready');