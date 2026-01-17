import {
  AuthState,
  ServerConfig,
  ClipPayload,
  ClipResponse,
  Message,
  CaptureResult,
  ScreenshotResult,
} from './types';
import { compressScreenshot } from './capture/screenshot';

// State management
let authState: AuthState = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  serverUrl: '',
};

let serverConfig: ServerConfig | null = null;

// Pending selection state (for when popup closes during selection)
let pendingSelection: {
  tabId: number;
  config: { maxDimensionPx: number; maxSizeBytes: number };
} | null = null;

// Capture lock to prevent concurrent captures
let captureInProgress = false;

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(['authState', 'serverConfig']);
  if (stored.authState) authState = stored.authState as AuthState;
  if (stored.serverConfig) serverConfig = stored.serverConfig as ServerConfig;
});

// Restore state on startup
chrome.runtime.onStartup.addListener(async () => {
  const stored = await chrome.storage.local.get(['authState', 'serverConfig']);
  if (stored.authState) authState = stored.authState as AuthState;
  if (stored.serverConfig) serverConfig = stored.serverConfig as ServerConfig;
});

// Message handling
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Async response
});

async function handleMessage(
  message: Message,
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  switch (message.type) {
    case 'GET_STATE':
      return { authState, serverConfig };

    case 'LOGIN':
      return initiateLogin(message.payload as { serverUrl: string });

    case 'LOGOUT':
      return logout();

    case 'FETCH_CONFIG':
      return fetchServerConfig();

    case 'SUBMIT_CLIP':
      return submitClip(message.payload as ClipPayload);

    case 'AUTH_CALLBACK':
      return handleAuthCallback(
        message.payload as {
          accessToken: string;
          refreshToken: string;
          expiresAt: number;
        }
      );

    case 'DEV_LOGIN':
      return devLogin(message.payload as { serverUrl: string });

    case 'CAPTURE_SCREENSHOT':
      return withCaptureLock(() => captureScreenshot());

    case 'FETCH_IMAGE':
      return fetchImage((message.payload as { url: string }).url);

    case 'SELECTION_COMPLETE':
      return handleSelectionComplete(message.payload as CaptureResult);

    case 'SELECTION_CANCELLED':
      pendingSelection = null;
      return { cancelled: true };

    default:
      return { error: 'Unknown message type' };
  }
}

/**
 * Wrapper to prevent concurrent captures
 */
async function withCaptureLock<T>(operation: () => Promise<T>): Promise<T | { error: string }> {
  if (captureInProgress) {
    return { error: 'Capture already in progress' };
  }

  captureInProgress = true;
  try {
    return await operation();
  } finally {
    captureInProgress = false;
  }
}

/**
 * Capture screenshot of visible viewport
 */
async function captureScreenshot(): Promise<CaptureResult | { error: string }> {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id || !tab.windowId) {
      return { error: 'No active tab' };
    }

    // Capture visible area
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
      quality: 100,
    });

    // Extract base64 data
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');

    // Get dimensions and compress
    const config = {
      maxSizeBytes: serverConfig?.images.maxSizeBytes || 5242880,
      maxDimensionPx: serverConfig?.images.maxDimensionPx || 2048,
    };

    const compressed = await compressScreenshot(base64, config);

    const filename = `screenshot-${Date.now()}.${compressed.format}`;

    return {
      mode: 'screenshot',
      title: tab.title || 'Screenshot',
      url: tab.url || '',
      images: [],
      screenshot: {
        filename,
        data: compressed.data,
        width: compressed.width,
        height: compressed.height,
      },
    };
  } catch (err) {
    console.error('Screenshot capture failed:', err);
    return { error: `Screenshot capture failed: ${err}` };
  }
}

/**
 * Fetch image via background script (to bypass CORS)
 */
async function fetchImage(url: string): Promise<{ data: string; contentType: string } | { error: string }> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { error: `HTTP ${response.status}` };
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    return {
      data: base64,
      contentType: blob.type,
    };
  } catch (err) {
    return { error: `Failed to fetch image: ${err}` };
  }
}

/**
 * Handle selection complete from content script
 * Submits the clip automatically since popup is closed
 */
async function handleSelectionComplete(result: CaptureResult): Promise<{ success: boolean; path?: string } | { error: string }> {
  pendingSelection = null;

  // Build clip payload from capture result
  const clipPayload: ClipPayload = {
    title: result.title,
    url: result.url,
    markdown: result.markdown || '',
    tags: [],
    notes: '',
    images: result.images || [],
    mode: 'selection',
  };

  // Submit the clip
  const response = await submitClip(clipPayload);

  // Show notification with result
  if (response.success) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Web Clipper',
      message: `Selection clipped! Saved to: ${response.path}`,
    });
    return { success: true, path: response.path };
  } else {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Web Clipper - Error',
      message: response.error || 'Failed to save clip',
    });
    return { error: response.error || 'Failed to save clip' };
  }
}

// Dev mode login - directly fetch token without OAuth
async function devLogin(payload: { serverUrl: string }): Promise<{ success: boolean } | { error: string }> {
  try {
    authState.serverUrl = payload.serverUrl;

    const response = await fetch(`${payload.serverUrl}/auth/dev-token`);

    if (!response.ok) {
      if (response.status === 403) {
        return { error: 'Dev mode not enabled on server' };
      }
      return { error: `Failed to get dev token: ${response.status}` };
    }

    const tokens = await response.json();
    authState.accessToken = tokens.access_token;
    authState.refreshToken = tokens.refresh_token;
    authState.expiresAt = tokens.expires_at;

    await chrome.storage.local.set({ authState });

    // Fetch server config after successful auth
    await fetchServerConfig();

    return { success: true };
  } catch (err) {
    return { error: `Dev login failed: ${err}` };
  }
}

// Initiate OAuth login via popup window
async function initiateLogin(payload: { serverUrl: string }): Promise<{ success: boolean } | { error: string }> {
  try {
    authState.serverUrl = payload.serverUrl;
    await chrome.storage.local.set({ authState });

    // Build login URL with redirect flag (server will show success page)
    const loginUrl = `${payload.serverUrl}/auth/login?redirect=extension`;

    // Open popup window for OAuth
    const popup = await chrome.windows.create({
      url: loginUrl,
      type: 'popup',
      width: 500,
      height: 600,
    });

    const popupId = popup?.id;
    if (!popupId) {
      return { error: 'Failed to open login window' };
    }

    // Monitor the popup for auth completion
    return new Promise((resolve) => {
      let popupTabId: number | undefined;

      const checkInterval = setInterval(async () => {
        try {
          // Check if popup still exists
          const windows = await chrome.windows.getAll({ populate: true });
          const popupWindow = windows.find((w) => w.id === popupId);

          if (!popupWindow) {
            clearInterval(checkInterval);
            // Check if we got authenticated while popup was open
            if (authState.accessToken) {
              resolve({ success: true });
            } else {
              resolve({ error: 'Login cancelled' });
            }
            return;
          }

          // Get the tab ID from the popup window
          if (popupWindow.tabs && popupWindow.tabs[0]?.id) {
            popupTabId = popupWindow.tabs[0].id;
          }

          // Try to read tokens from the popup page
          if (popupTabId) {
            try {
              // First check the URL to see if we're on the success page
              const tab = await chrome.tabs.get(popupTabId);
              const tabUrl = tab.url || '';

              console.log('Web Clipper: Checking popup URL:', tabUrl);
              console.log('Web Clipper: Server URL:', authState.serverUrl);

              // Only try to read tokens if we're back on our server (not Google's OAuth page)
              // Normalize URLs for comparison
              const normalizedTabUrl = tabUrl.replace(/\/$/, '');
              const normalizedServerUrl = authState.serverUrl.replace(/\/$/, '');

              if (normalizedTabUrl.startsWith(normalizedServerUrl)) {
                console.log('Web Clipper: On server page, attempting to read tokens...');

                const results = await chrome.scripting.executeScript({
                  target: { tabId: popupTabId },
                  world: 'MAIN', // Access page's JavaScript context, not isolated world
                  func: () => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const auth = (window as any).webClipperAuth;
                    console.log('Web Clipper (injected): Found auth object:', auth);
                    return auth;
                  },
                });

                console.log('Web Clipper: Script execution results:', results);

                if (results[0]?.result) {
                  const tokens = results[0].result;
                  console.log('Web Clipper: Got tokens:', {
                    hasAccessToken: !!tokens.accessToken,
                    hasRefreshToken: !!tokens.refreshToken,
                    expiresAt: tokens.expiresAt,
                  });

                  clearInterval(checkInterval);

                  // Save tokens
                  authState.accessToken = tokens.accessToken;
                  authState.refreshToken = tokens.refreshToken;
                  authState.expiresAt = tokens.expiresAt;
                  await chrome.storage.local.set({ authState });

                  console.log('Web Clipper: Auth tokens saved to storage');

                  // Fetch server config
                  await fetchServerConfig();

                  // Close popup
                  chrome.windows.remove(popupId);

                  resolve({ success: true });
                } else {
                  console.log('Web Clipper: No tokens found in page yet');
                }
              }
            } catch (e) {
              // Script execution failed (different origin, page not ready, etc.)
              // This is expected during OAuth redirect, continue polling
              console.log('Web Clipper: Script execution error (may be normal during OAuth):', e);
            }
          }
        } catch {
          // Window check failed, popup was closed
          clearInterval(checkInterval);
          resolve({ error: 'Login window closed' });
        }
      }, 500);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve({ error: 'Login timeout' });
      }, 5 * 60 * 1000);
    });
  } catch (err) {
    return { error: `Failed to initiate login: ${err}` };
  }
}

// Handle OAuth callback
async function handleAuthCallback(payload: {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}): Promise<{ success: boolean }> {
  authState.accessToken = payload.accessToken;
  authState.refreshToken = payload.refreshToken;
  authState.expiresAt = payload.expiresAt;

  await chrome.storage.local.set({ authState });

  // Fetch server config after successful auth
  await fetchServerConfig();

  return { success: true };
}

// Logout
async function logout(): Promise<{ success: boolean }> {
  authState = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    serverUrl: authState.serverUrl, // Keep server URL
  };
  serverConfig = null;

  await chrome.storage.local.set({ authState, serverConfig: null });

  return { success: true };
}

// Fetch server configuration
async function fetchServerConfig(): Promise<ServerConfig | { error: string }> {
  if (!authState.accessToken || !authState.serverUrl) {
    return { error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${authState.serverUrl}/api/v1/config`, {
      headers: {
        Authorization: `Bearer ${authState.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh token
        const refreshed = await refreshToken();
        if (!refreshed) {
          return { error: 'Authentication expired' };
        }
        return fetchServerConfig();
      }
      return { error: `Failed to fetch config: ${response.status}` };
    }

    serverConfig = await response.json();
    await chrome.storage.local.set({ serverConfig });
    return serverConfig!;
  } catch (err) {
    return { error: `Failed to fetch config: ${err}` };
  }
}

// Submit clip to server
async function submitClip(payload: ClipPayload): Promise<ClipResponse> {
  if (!authState.accessToken || !authState.serverUrl) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${authState.serverUrl}/api/v1/clips`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authState.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (!refreshed) {
          return { success: false, error: 'Authentication expired' };
        }
        return submitClip(payload);
      }
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Server error: ${response.status}`,
      };
    }

    return await response.json();
  } catch (err) {
    return { success: false, error: `Failed to submit clip: ${err}` };
  }
}

// Refresh access token
async function refreshToken(): Promise<boolean> {
  if (!authState.refreshToken || !authState.serverUrl) {
    return false;
  }

  try {
    const response = await fetch(`${authState.serverUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: authState.refreshToken }),
    });

    if (!response.ok) {
      // Refresh failed, clear auth
      await logout();
      return false;
    }

    const tokens = await response.json();
    authState.accessToken = tokens.access_token;
    authState.refreshToken = tokens.refresh_token;
    authState.expiresAt = tokens.expires_at;

    await chrome.storage.local.set({ authState });
    return true;
  } catch {
    return false;
  }
}
