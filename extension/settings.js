// settings.js - Settings page controller

const API_BASE_URL = 'http://localhost:5000/api';

// Elements
const tokenInput = document.getElementById('token-input');
const pasteBtn = document.getElementById('paste-btn');
const linkBtn = document.getElementById('link-btn');
const unlinkBtn = document.getElementById('unlink-btn');
const backBtn = document.getElementById('back-btn');
const linkStatus = document.getElementById('link-status');
const userEmail = document.getElementById('user-email');
const userInfoRow = document.getElementById('user-info-row');
const accountStatusCard = document.getElementById('account-status-card');
const toast = document.getElementById('toast');

// Storage keys
const STORAGE_KEY_TOKEN = 'extension_token';
const STORAGE_KEY_USER = 'extension_user';

// Initialize
async function init() {
  await loadSavedToken();
  attachEventListeners();
}

// Load saved token from chrome storage
async function loadSavedToken() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY_TOKEN, STORAGE_KEY_USER]);
    
    if (result[STORAGE_KEY_TOKEN]) {
      tokenInput.value = result[STORAGE_KEY_TOKEN];
      
      // Verify token is still valid
      const isValid = await verifyToken(result[STORAGE_KEY_TOKEN]);
      
      if (isValid && result[STORAGE_KEY_USER]) {
        updateUILinked(result[STORAGE_KEY_USER]);
      } else {
        // Token invalid, clear storage
        await clearStorage();
        updateUIUnlinked();
      }
    } else {
      updateUIUnlinked();
    }
  } catch (error) {
    console.error('Error loading token:', error);
    updateUIUnlinked();
  }
}

// Verify token with backend
async function verifyToken(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/extension/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ extension_token: token }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.user_id !== undefined;
    }
    
    return false;
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
}

// Link account
async function linkAccount() {
  const token = tokenInput.value.trim();
  
  if (!token) {
    showToast('Please enter a token', 'error');
    return;
  }
  
  // Disable button during request
  linkBtn.disabled = true;
  linkBtn.innerHTML = '<span class="btn-icon">⏳</span><span>Linking...</span>';
  
  try {
    // Verify token with backend
    const response = await fetch(`${API_BASE_URL}/extension/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ extension_token: token }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Invalid token or server error');
    }
    
    const data = await response.json();
    
    if (data.user_id && (data.email || data.username)) {
      // Save token and user info to storage
      const userData = {
        user_id: data.user_id,
        email: data.email,
        username: data.username
      };
      
      await chrome.storage.local.set({
        [STORAGE_KEY_TOKEN]: token,
        [STORAGE_KEY_USER]: userData,
      });
      
      updateUILinked(userData);
      showToast('Account linked successfully! ✓', 'success');
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (error) {
    console.error('Link error:', error);
    showToast('Failed to link account. Please check your token.', 'error');
    linkBtn.disabled = false;
    linkBtn.innerHTML = '<span class="btn-icon">🔗</span><span>Link Account</span>';
  }
}

// Unlink account
async function unlinkAccount() {
  if (!confirm('Are you sure you want to unlink your account? Detection history will no longer sync.')) {
    return;
  }
  
  unlinkBtn.disabled = true;
  unlinkBtn.innerHTML = '<span class="btn-icon">⏳</span><span>Unlinking...</span>';
  
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY_TOKEN]);
    const token = result[STORAGE_KEY_TOKEN];
    
    if (token) {
      // Notify backend
      try {
        await fetch(`${API_BASE_URL}/extension/unlink`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ extension_token: token }),
        });
      } catch (error) {
        console.error('Error notifying backend:', error);
        // Continue anyway - unlink locally
      }
    }
    
    // Clear local storage
    await clearStorage();
    tokenInput.value = '';
    updateUIUnlinked();
    showToast('Account unlinked successfully', 'success');
  } catch (error) {
    console.error('Unlink error:', error);
    showToast('Failed to unlink account', 'error');
    unlinkBtn.disabled = false;
    unlinkBtn.innerHTML = '<span class="btn-icon">🔓</span><span>Unlink Account</span>';
  }
}

// Clear storage
async function clearStorage() {
  await chrome.storage.local.remove([STORAGE_KEY_TOKEN, STORAGE_KEY_USER]);
}

// Update UI for linked state
function updateUILinked(user) {
  linkStatus.textContent = '✓ Linked';
  linkStatus.style.color = 'white';
  userEmail.textContent = user.email || user.username || 'Unknown';
  userInfoRow.style.display = 'flex';
  
  linkBtn.style.display = 'none';
  unlinkBtn.style.display = 'flex';
  
  tokenInput.disabled = true;
  pasteBtn.disabled = true;
  
  accountStatusCard.style.background = 'rgb(39, 39, 42)';
}

// Update UI for unlinked state
function updateUIUnlinked() {
  linkStatus.textContent = 'Not Linked';
  linkStatus.style.color = 'white';
  userInfoRow.style.display = 'none';
  
  linkBtn.style.display = 'flex';
  linkBtn.disabled = false;
  linkBtn.innerHTML = '<span class="btn-icon">🔗</span><span>Link Account</span>';
  
  unlinkBtn.style.display = 'none';
  unlinkBtn.disabled = false;
  unlinkBtn.innerHTML = '<span class="btn-icon">🔓</span><span>Unlink Account</span>';
  
  tokenInput.disabled = false;
  pasteBtn.disabled = false;
  
  accountStatusCard.style.background = 'rgb(24, 24, 27)';
}

// Paste from clipboard
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    tokenInput.value = text.trim();
    showToast('Token pasted from clipboard', 'success');
  } catch (error) {
    console.error('Paste error:', error);
    showToast('Failed to paste. Please paste manually.', 'error');
  }
}

// Show toast notification
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Attach event listeners
function attachEventListeners() {
  linkBtn.addEventListener('click', linkAccount);
  unlinkBtn.addEventListener('click', unlinkAccount);
  pasteBtn.addEventListener('click', pasteFromClipboard);
  backBtn.addEventListener('click', () => window.close());
  
  // Enter key to link
  tokenInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !linkBtn.disabled) {
      linkAccount();
    }
  });
}

// Initialize on load
init();
