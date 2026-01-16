import { AuthState, ServerConfig, ClipPayload, CaptureResult } from '../types';

// DOM Elements
const loginSection = document.getElementById('login-section')!;
const clipSection = document.getElementById('clip-section')!;
const serverUrlInput = document.getElementById('server-url') as HTMLInputElement;
const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement;
const clipTitleInput = document.getElementById('clip-title') as HTMLInputElement;
const clipTagsInput = document.getElementById('clip-tags') as HTMLInputElement;
const clipNotesInput = document.getElementById('clip-notes') as HTMLTextAreaElement;
const clipBtn = document.getElementById('clip-btn') as HTMLButtonElement;
const messageDiv = document.getElementById('message')!;

// State
let authState: AuthState | null = null;
let config: ServerConfig | null = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  // Get current state from background
  const state = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
  authState = state.authState;
  config = state.serverConfig;

  // Restore server URL
  if (authState?.serverUrl) {
    serverUrlInput.value = authState.serverUrl;
  }

  // Update UI based on auth state
  updateUI();

  // Pre-fill title from current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.title) {
    clipTitleInput.value = tab.title;
  }
});

// Update UI based on authentication state
function updateUI() {
  if (authState?.accessToken) {
    loginSection.classList.add('hidden');
    clipSection.classList.remove('hidden');
  } else {
    loginSection.classList.remove('hidden');
    clipSection.classList.add('hidden');
  }
  hideMessage();
}

// Connect button handler
connectBtn.addEventListener('click', async () => {
  const serverUrl = serverUrlInput.value.trim();
  if (!serverUrl) {
    showMessage('Please enter a server URL', 'error');
    return;
  }

  setLoading(connectBtn, true);

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'LOGIN',
      payload: { serverUrl }
    });

    if (response.error) {
      showMessage(response.error, 'error');
    } else if (response.loginUrl) {
      // Open login URL in new tab
      chrome.tabs.create({ url: response.loginUrl });
      showMessage('Please complete login in the opened tab', 'info');
    }
  } catch (err) {
    showMessage(`Connection failed: ${err}`, 'error');
  } finally {
    setLoading(connectBtn, false);
  }
});

// Logout button handler
logoutBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'LOGOUT' });
  authState = { accessToken: null, refreshToken: null, expiresAt: null, serverUrl: authState?.serverUrl || '' };
  config = null;
  updateUI();
  showMessage('Logged out', 'info');
});

// Clip button handler
clipBtn.addEventListener('click', async () => {
  setLoading(clipBtn, true);

  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showMessage('No active tab found', 'error');
      return;
    }

    // Get config for image limits
    const captureConfig = {
      maxDimensionPx: config?.images.maxDimensionPx || 2048,
      maxSizeBytes: config?.images.maxSizeBytes || 5242880
    };

    // Capture page content
    showMessage('Capturing page...', 'info');
    const captureResult = await chrome.tabs.sendMessage(tab.id, {
      type: 'CAPTURE_PAGE',
      payload: captureConfig
    }) as CaptureResult;

    if (!captureResult) {
      showMessage('Failed to capture page content', 'error');
      return;
    }

    // Build clip payload
    const clipPayload: ClipPayload = {
      title: clipTitleInput.value || captureResult.title,
      url: captureResult.url,
      markdown: captureResult.markdown,
      tags: clipTagsInput.value.split(',').map(t => t.trim()).filter(t => t),
      notes: clipNotesInput.value,
      images: captureResult.images
    };

    // Submit to server
    showMessage('Saving clip...', 'info');
    const response = await chrome.runtime.sendMessage({
      type: 'SUBMIT_CLIP',
      payload: clipPayload
    });

    if (response.success) {
      showMessage(`Clipped! Saved to: ${response.path}`, 'success');
      // Clear form
      clipTagsInput.value = '';
      clipNotesInput.value = '';
    } else {
      showMessage(response.error || 'Failed to save clip', 'error');
    }
  } catch (err) {
    showMessage(`Clip failed: ${err}`, 'error');
  } finally {
    setLoading(clipBtn, false);
  }
});

// Show message
function showMessage(text: string, type: 'success' | 'error' | 'info') {
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.classList.remove('hidden');
}

// Hide message
function hideMessage() {
  messageDiv.classList.add('hidden');
}

// Set loading state
function setLoading(button: HTMLButtonElement, loading: boolean) {
  button.disabled = loading;
  if (loading) {
    button.classList.add('loading');
  } else {
    button.classList.remove('loading');
  }
}

// Listen for auth state changes (from callback page)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.authState) {
    authState = changes.authState.newValue as AuthState | null;
    updateUI();
    if (authState?.accessToken) {
      showMessage('Connected successfully!', 'success');
    }
  }
  if (changes.serverConfig) {
    config = changes.serverConfig.newValue as ServerConfig | null;
  }
});
