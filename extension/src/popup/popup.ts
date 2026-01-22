import { AuthState, ServerConfig, ClipPayload, CaptureResult, ClipMode } from '../types';
import { ClipsView } from './clips-view';

// DOM Elements
const loginSection = document.getElementById('login-section')!;
const clipSection = document.getElementById('clip-section')!;
const clipsSection = document.getElementById('clips-section')!;
const serverUrlInput = document.getElementById('server-url') as HTMLInputElement;
const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
const devLoginBtn = document.getElementById('dev-login-btn') as HTMLButtonElement;
const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement;
const clipTitleInput = document.getElementById('clip-title') as HTMLInputElement;
const clipTagsInput = document.getElementById('clip-tags') as HTMLInputElement;
const clipNotesInput = document.getElementById('clip-notes') as HTMLTextAreaElement;
const clipBtn = document.getElementById('clip-btn') as HTMLButtonElement;
const messageDiv = document.getElementById('message')!;
const modeBtns = document.querySelectorAll('.mode-item') as NodeListOf<HTMLButtonElement>;

// State
let authState: AuthState | null = null;
let config: ServerConfig | null = null;
let currentMode: ClipMode = 'article';
let clipsView: ClipsView | null = null;

// Mode button text mapping
const modeButtonText: Record<ClipMode, string> = {
  article: 'Clip Article',
  bookmark: 'Save Bookmark',
  screenshot: 'Capture Screenshot',
  selection: 'Select Element',
  fullpage: 'Capture Full Page',
};

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await refreshState();

  // Pre-fill title from current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.title) {
    clipTitleInput.value = tab.title;
  }

  // Setup mode selector
  setupModeSelector();

  // Setup navigation
  setupNavigation();

  // Handle initial route
  handleRoute();

  // Make undoClipDelete globally accessible for UndoToast callbacks
  (window as any).undoClipDelete = undoClipDelete;

  // Execute pending deletes when drawer closes (not on navigation)
  window.addEventListener('pagehide', executePendingDeletesOnClose);
  window.addEventListener('beforeunload', executePendingDeletesOnClose);
});

// Setup mode selector event handlers
function setupModeSelector() {
  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      // Update active state
      modeBtns.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
        b.setAttribute('tabindex', '-1');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      btn.setAttribute('tabindex', '0');

      // Update current mode
      currentMode = btn.getAttribute('data-mode') as ClipMode;

      // Update clip button text
      clipBtn.textContent = modeButtonText[currentMode];
    });

    // Keyboard navigation
    btn.addEventListener('keydown', (e) => {
      const btnsArray = Array.from(modeBtns);
      const currentIndex = btnsArray.indexOf(btn);
      let nextIndex = currentIndex;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          nextIndex = currentIndex > 0 ? currentIndex - 1 : btnsArray.length - 1;
          break;
        case 'ArrowDown':
          e.preventDefault();
          nextIndex = currentIndex < btnsArray.length - 1 ? currentIndex + 1 : 0;
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          e.preventDefault();
          nextIndex = parseInt(e.key) - 1;
          break;
        default:
          return;
      }

      if (nextIndex !== currentIndex && btnsArray[nextIndex]) {
        btnsArray[nextIndex].click();
        btnsArray[nextIndex].focus();
      }
    });
  });
}

// Refresh state from background
async function refreshState() {
  const state = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
  authState = state.authState;
  config = state.serverConfig;

  // Restore server URL
  if (authState?.serverUrl) {
    serverUrlInput.value = authState.serverUrl;
  }

  // Update UI based on auth state
  updateUI();

  // Show appropriate message
  if (authState?.accessToken) {
    hideMessage();
  }
}

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

// Normalize server URL (remove trailing slashes, validate format)
function normalizeServerUrl(url: string): string {
  let normalized = url.trim();

  // Remove trailing slashes
  while (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  // Validate URL format
  if (normalized && !normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    showMessage('Server URL must start with http:// or https://', 'error');
    return '';
  }

  return normalized;
}

// Connect button handler (OAuth flow)
connectBtn.addEventListener('click', async () => {
  const serverUrl = normalizeServerUrl(serverUrlInput.value);
  if (!serverUrl) {
    showMessage('Please enter a server URL', 'error');
    return;
  }

  setLoading(connectBtn, true);
  showMessage('Opening login window...', 'info');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'LOGIN',
      payload: { serverUrl },
    });

    if (response.error) {
      showMessage(response.error, 'error');
    } else if (response.success) {
      // Update local state
      const state = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      authState = state.authState;
      config = state.serverConfig;
      updateUI();
      showMessage('Connected successfully!', 'success');
    }
  } catch (err) {
    showMessage(`Connection failed: ${err}`, 'error');
  } finally {
    setLoading(connectBtn, false);
  }
});

// Dev Login button handler (direct token, no OAuth)
devLoginBtn.addEventListener('click', async () => {
  const serverUrl = normalizeServerUrl(serverUrlInput.value);
  if (!serverUrl) {
    showMessage('Please enter a server URL', 'error');
    return;
  }

  setLoading(devLoginBtn, true);

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'DEV_LOGIN',
      payload: { serverUrl },
    });

    if (response.error) {
      showMessage(response.error, 'error');
    } else if (response.success) {
      // Update local state
      const state = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      authState = state.authState;
      config = state.serverConfig;
      updateUI();
      showMessage('Dev login successful!', 'success');
    }
  } catch (err) {
    showMessage(`Dev login failed: ${err}`, 'error');
  } finally {
    setLoading(devLoginBtn, false);
  }
});

// Logout button handler
logoutBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'LOGOUT' });
  authState = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    serverUrl: authState?.serverUrl || '',
  };
  config = null;
  updateUI();
  showMessage('Logged out', 'info');
});

/**
 * Ensure content script is loaded and ready.
 * If not, attempt to inject it programmatically.
 * Returns null on success, or an error message on failure.
 */
async function ensureContentScript(tabId: number): Promise<string | null> {
  try {
    // Try to ping the content script
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    return null; // Success - content script is ready
  } catch (err) {
    // Content script not loaded - try to inject it
    console.log('Content script not responding, attempting injection...');

    try {
      // Inject the content script programmatically
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js'],
      });

      // Wait a bit for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify it's now working
      await chrome.tabs.sendMessage(tabId, { type: 'PING' });
      return null; // Success
    } catch (injectErr) {
      // Injection failed - likely a protected page
      console.error('Failed to inject content script:', injectErr);
      return 'Please reload this page to enable clipping. (Content script could not be loaded)';
    }
  }
}

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

    // Ensure content script is ready for modes that need it
    if (currentMode !== 'screenshot') {
      const error = await ensureContentScript(tab.id);
      if (error) {
        showMessage(error, 'error');
        return;
      }
    }

    // Get config for image limits
    const captureConfig = {
      maxDimensionPx: config?.images.maxDimensionPx || 2048,
      maxSizeBytes: config?.images.maxSizeBytes || 5242880,
    };

    let captureResult: CaptureResult;

    switch (currentMode) {
      case 'bookmark':
        showMessage('Capturing bookmark...', 'info');
        captureResult = await chrome.tabs.sendMessage(tab.id, {
          type: 'CAPTURE_BOOKMARK',
          payload: { config: captureConfig },
        });
        break;

      case 'screenshot':
        showMessage('Capturing screenshot...', 'info');
        captureResult = await chrome.runtime.sendMessage({
          type: 'CAPTURE_SCREENSHOT',
        });
        if ('error' in captureResult) {
          showMessage(captureResult.error as string, 'error');
          return;
        }
        break;

      case 'selection':
        showMessage('Click an element on the page to select it', 'info');
        // Start selection mode and close popup
        await chrome.tabs.sendMessage(tab.id, {
          type: 'START_SELECTION_MODE',
          payload: { config: captureConfig },
        });
        // Close popup - selection will be handled by content script
        window.close();
        return;

      case 'fullpage':
        showMessage('Capturing full page (this may take a moment)...', 'info');
        captureResult = await chrome.tabs.sendMessage(tab.id, {
          type: 'CAPTURE_FULLPAGE',
          payload: { config: captureConfig },
        });
        break;

      default:
        // Article mode
        showMessage('Capturing article...', 'info');
        captureResult = await chrome.tabs.sendMessage(tab.id, {
          type: 'CAPTURE_PAGE',
          payload: captureConfig,
        });
    }

    if (!captureResult) {
      showMessage('Failed to capture page content', 'error');
      return;
    }

    if ('error' in captureResult) {
      showMessage(captureResult.error as string, 'error');
      return;
    }

    // Build clip payload
    const clipPayload: ClipPayload = {
      title: clipTitleInput.value || captureResult.title,
      url: captureResult.url,
      markdown: captureResult.markdown || '',
      html: captureResult.html,
      tags: clipTagsInput.value
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t),
      notes: clipNotesInput.value,
      images: captureResult.images || [],
      mode: currentMode,
    };

    // Add screenshot as image if present
    if (captureResult.screenshot) {
      clipPayload.images.push({
        filename: captureResult.screenshot.filename,
        data: captureResult.screenshot.data,
        originalUrl: '',
      });

      // Generate markdown for screenshot mode
      if (currentMode === 'screenshot') {
        clipPayload.markdown = `# ${captureResult.title}\n\n![Screenshot](media/${captureResult.screenshot.filename})\n\n*Screenshot captured from ${new URL(captureResult.url).hostname} (${captureResult.screenshot.width}x${captureResult.screenshot.height})*\n`;
      }
    }

    // Submit to server
    showMessage('Saving clip...', 'info');
    const response = await chrome.runtime.sendMessage({
      type: 'SUBMIT_CLIP',
      payload: clipPayload,
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

// Auto-dismiss timeout for messages
let messageTimeout: ReturnType<typeof setTimeout> | null = null;

// Show message
function showMessage(text: string, type: 'success' | 'error' | 'info') {
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.classList.remove('hidden');

  // Clear existing timeout
  if (messageTimeout) {
    clearTimeout(messageTimeout);
  }

  // Auto-dismiss after 4 seconds
  messageTimeout = setTimeout(() => {
    hideMessage();
    messageTimeout = null;
  }, 4000);
}

// Hide message
function hideMessage() {
  messageDiv.classList.add('hidden');
  if (messageTimeout) {
    clearTimeout(messageTimeout);
    messageTimeout = null;
  }
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

// Navigation and routing

/**
 * Setup navigation event listeners
 */
function setupNavigation() {
  // View clips button
  const viewClipsBtn = document.getElementById('view-clips-btn');
  if (viewClipsBtn) {
    viewClipsBtn.addEventListener('click', () => {
      window.location.hash = '#clips';
    });
  }

  // Back button
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.hash = '';
    });
  }

  // Listen for hash changes
  window.addEventListener('hashchange', handleRoute);
}

/**
 * Handle route based on hash
 */
function handleRoute() {
  const hash = window.location.hash;

  if (hash === '#clips') {
    showClipsView();
  } else {
    showMainView();
  }
}

/**
 * Show clips list view
 */
function showClipsView() {
  // Hide main clip form
  clipSection.classList.add('hidden');

  // Show clips view
  clipsSection.classList.remove('hidden');

  // Initialize ClipsView if not already created
  if (!clipsView) {
    clipsView = new ClipsView('clips-container');
    clipsView.init();
  }
}

/**
 * Show main clip creation view
 */
function showMainView() {
  // Show main clip form
  clipSection.classList.remove('hidden');

  // Hide clips view
  clipsSection.classList.add('hidden');

  // Destroy ClipsView to free memory
  if (clipsView) {
    clipsView.destroy();
    clipsView = null;
  }
}

/**
 * Undo clip deletion (global function, works even if ClipsView destroyed)
 */
async function undoClipDelete(clipId: string): Promise<void> {
  // Cancel background delete and get clip data
  const response = await chrome.runtime.sendMessage({
    type: 'CANCEL_DELETE',
    payload: { clipId },
  });

  if (!response.success || !response.clip) {
    console.warn('Could not undo delete - clip data not found');
    return;
  }

  // Navigate to clips view if not already there
  if (window.location.hash !== '#clips') {
    window.location.hash = '#clips';
    // Wait for view to render
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Restore clip to ClipsView
  if (clipsView) {
    clipsView.restoreClip(response.clip, response.index);
  }
}

/**
 * Execute pending deletes when popup closes (drawer closes, not navigation)
 */
async function executePendingDeletesOnClose() {
  // Get all pending delete IDs from background
  const response = await chrome.runtime.sendMessage({
    type: 'GET_PENDING_DELETES',
  });

  if (response.success && response.clipIds) {
    // Execute all pending deletes immediately
    for (const clipId of response.clipIds) {
      await chrome.runtime.sendMessage({
        type: 'EXECUTE_DELETE_NOW',
        payload: { clipId },
      });
    }
  }
}
