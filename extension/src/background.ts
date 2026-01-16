import { AuthState, ServerConfig, ClipPayload, ClipResponse, Message } from './types';

// State management
let authState: AuthState = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  serverUrl: ''
};

let serverConfig: ServerConfig | null = null;

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
chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // Async response
});

async function handleMessage(message: Message): Promise<unknown> {
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
      return handleAuthCallback(message.payload as {
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
      });

    case 'DEV_LOGIN':
      return devLogin(message.payload as { serverUrl: string });

    default:
      return { error: 'Unknown message type' };
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

// Initiate OAuth login
async function initiateLogin(payload: { serverUrl: string }): Promise<{ loginUrl: string } | { error: string }> {
  try {
    authState.serverUrl = payload.serverUrl;
    await chrome.storage.local.set({ authState });

    // Build login URL with redirect back to extension
    const callbackUrl = chrome.runtime.getURL('callback.html');
    const loginUrl = `${payload.serverUrl}/auth/login?redirect=${encodeURIComponent(callbackUrl)}`;

    return { loginUrl };
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
    serverUrl: authState.serverUrl // Keep server URL
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
        'Authorization': `Bearer ${authState.accessToken}`,
        'Content-Type': 'application/json'
      }
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
        'Authorization': `Bearer ${authState.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
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
        error: errorData.error || `Server error: ${response.status}`
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
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: authState.refreshToken })
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
