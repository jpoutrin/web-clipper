import {
  AuthState,
  ServerConfig,
  ClipPayload,
  ClipResponse,
  Message,
  CaptureResult,
  ScreenshotResult,
  CaptureEmbedPayload,
  CaptureEmbedResponse,
  ListClipsResponse,
  ClipFilters,
  ClipSummary,
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

// Pending delete interface
interface PendingDelete {
  clipId: string;
  clip: ClipSummary;
  index: number;
  timer: ReturnType<typeof setTimeout>;
  initiatedAt: number;
}

// Pending deletes state (for undo functionality)
const pendingDeletes = new Map<string, PendingDelete>();

// Capture lock to prevent concurrent captures
let captureInProgress = false;

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(['authState', 'serverConfig']);
  if (stored.authState) authState = stored.authState as AuthState;
  if (stored.serverConfig) serverConfig = stored.serverConfig as ServerConfig;

  // Enable side panel to open when action icon is clicked
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Restore state on startup
chrome.runtime.onStartup.addListener(async () => {
  const stored = await chrome.storage.local.get(['authState', 'serverConfig']);
  if (stored.authState) authState = stored.authState as AuthState;
  if (stored.serverConfig) serverConfig = stored.serverConfig as ServerConfig;

  // Enable side panel to open when action icon is clicked
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
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
      // Always load from storage to ensure we have the latest state
      // (service worker may have restarted and lost in-memory state)
      const stored = await chrome.storage.local.get(['authState', 'serverConfig']);
      if (stored.authState) authState = stored.authState as AuthState;
      if (stored.serverConfig) serverConfig = stored.serverConfig as ServerConfig;
      return { authState, serverConfig };

    case 'LOGIN':
      return initiateLogin(message.payload as { serverUrl: string });

    case 'LOGOUT':
      return logout();

    case 'FETCH_CONFIG':
      return fetchServerConfig();

    case 'SUBMIT_CLIP':
      return submitClip(message.payload as ClipPayload);

    case 'LIST_CLIPS':
      return listClips(message.payload as ClipFilters | undefined);

    case 'DELETE_CLIP':
      return deleteClip((message.payload as { id: string }).id);

    case 'SCHEDULE_DELETE':
      return scheduleDelete(message.payload as { clipId: string; clip: ClipSummary; index: number; delayMs: number });

    case 'CANCEL_DELETE':
      return cancelDelete((message.payload as { clipId: string }).clipId);

    case 'EXECUTE_DELETE_NOW':
      return executeDeleteNow((message.payload as { clipId: string }).clipId);

    case 'GET_PENDING_DELETES':
      return {
        success: true,
        clipIds: Array.from(pendingDeletes.keys()),
      };

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

    case 'CAPTURE_EMBED':
      return handleCaptureEmbed(message.payload as CaptureEmbedPayload);

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

// List clips from server
async function listClips(filters?: ClipFilters): Promise<ListClipsResponse | { error: string }> {
  if (!authState.accessToken || !authState.serverUrl) {
    return { error: 'Not authenticated' } as { error: string };
  }

  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.per_page) params.append('per_page', filters.per_page.toString());
    if (filters?.mode) params.append('mode', filters.mode);
    if (filters?.tag) params.append('tag', filters.tag);

    const url = `${authState.serverUrl}/api/v1/clips${params.toString() ? `?${params}` : ''}`;
    console.log('Fetching clips from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authState.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (!refreshed) {
          return { error: 'Authentication expired' };
        }
        return listClips(filters);
      }

      // Try to get error message from response
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.error || `Server error: ${response.status}` };
      }

      return { error: `Server error: ${response.status} ${response.statusText}` };
    }

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', text.substring(0, 200));
      return { error: `Server returned non-JSON response. Check server logs.` };
    }

    return await response.json();
  } catch (err) {
    console.error('Failed to fetch clips:', err);
    return { error: `Failed to fetch clips: ${err instanceof Error ? err.message : String(err)}` };
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

// Delete clip from server
async function deleteClip(id: string): Promise<{ success: boolean; error?: string }> {
  if (!authState.accessToken || !authState.serverUrl) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${authState.serverUrl}/api/v1/clips/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authState.accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (!refreshed) {
          return { success: false, error: 'Authentication expired' };
        }
        return deleteClip(id);
      }
      if (response.status === 404) {
        return { success: false, error: 'Clip not found' };
      }
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Server error: ${response.status}`,
      };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: `Failed to delete clip: ${err}` };
  }
}

/**
 * Schedule a clip deletion after a delay
 */
async function scheduleDelete(payload: {
  clipId: string;
  clip: ClipSummary;
  index: number;
  delayMs: number;
}): Promise<{ success: boolean }> {
  const { clipId, clip, index, delayMs } = payload;

  // Cancel existing timer if any
  const existing = pendingDeletes.get(clipId);
  if (existing) {
    clearTimeout(existing.timer);
  }

  // Schedule new delete
  const timer = setTimeout(async () => {
    await deleteClip(clipId);
    pendingDeletes.delete(clipId);
  }, delayMs);

  pendingDeletes.set(clipId, {
    clipId,
    clip,
    index,
    timer,
    initiatedAt: Date.now(),
  });

  return { success: true };
}

/**
 * Cancel a scheduled delete and return clip data for restoration
 */
function cancelDelete(clipId: string): {
  success: boolean;
  clip?: ClipSummary;
  index?: number;
} {
  const pending = pendingDeletes.get(clipId);
  if (pending) {
    clearTimeout(pending.timer);
    pendingDeletes.delete(clipId);
    return {
      success: true,
      clip: pending.clip,
      index: pending.index,
    };
  }
  return { success: false };
}

/**
 * Execute delete immediately (skip remaining delay)
 */
async function executeDeleteNow(clipId: string): Promise<{ success: boolean; error?: string }> {
  const pending = pendingDeletes.get(clipId);
  if (pending) {
    clearTimeout(pending.timer);
    pendingDeletes.delete(clipId);
  }

  // Execute delete
  return await deleteClip(clipId);
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

/**
 * Handle CAPTURE_EMBED message.
 * Captures the visible tab and crops to the specified bounds.
 */
async function handleCaptureEmbed(
  payload: CaptureEmbedPayload
): Promise<CaptureEmbedResponse> {
  try {
    const { bounds, devicePixelRatio } = payload;

    // Get current window for capture
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id || !tab.windowId) {
      return { success: false, error: 'No active tab' };
    }

    // Capture the visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
      quality: 100,
    });

    // Crop the image to the embed bounds
    const croppedData = await cropImage(dataUrl, bounds, devicePixelRatio);

    return {
      success: true,
      data: croppedData,
    };
  } catch (err) {
    console.error('CAPTURE_EMBED error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Capture failed',
    };
  }
}

/**
 * Crop an image to the specified bounds using OffscreenCanvas.
 *
 * @param dataUrl - The full screenshot as a data URL
 * @param bounds - The crop region in CSS pixels
 * @param devicePixelRatio - The device pixel ratio for scaling
 * @returns Base64-encoded cropped image data
 */
async function cropImage(
  dataUrl: string,
  bounds: { x: number; y: number; width: number; height: number },
  devicePixelRatio: number
): Promise<string> {
  // Load the image
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  // Scale bounds by device pixel ratio
  const scaledBounds = {
    x: Math.round(bounds.x * devicePixelRatio),
    y: Math.round(bounds.y * devicePixelRatio),
    width: Math.round(bounds.width * devicePixelRatio),
    height: Math.round(bounds.height * devicePixelRatio),
  };

  // Clamp bounds to image dimensions
  const clampedBounds = {
    x: Math.max(0, Math.min(scaledBounds.x, bitmap.width - 1)),
    y: Math.max(0, Math.min(scaledBounds.y, bitmap.height - 1)),
    width: Math.min(scaledBounds.width, bitmap.width - scaledBounds.x),
    height: Math.min(scaledBounds.height, bitmap.height - scaledBounds.y),
  };

  // Ensure we have valid dimensions
  if (clampedBounds.width <= 0 || clampedBounds.height <= 0) {
    throw new Error('Invalid crop bounds');
  }

  // Create canvas for cropped image
  const canvas = new OffscreenCanvas(clampedBounds.width, clampedBounds.height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw the cropped region
  ctx.drawImage(
    bitmap,
    clampedBounds.x,
    clampedBounds.y,
    clampedBounds.width,
    clampedBounds.height,
    0,
    0,
    clampedBounds.width,
    clampedBounds.height
  );

  // Convert to blob
  const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });

  // Convert to base64
  const arrayBuffer = await croppedBlob.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  return base64;
}
