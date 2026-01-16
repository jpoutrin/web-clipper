// OAuth callback handler
// This page receives tokens from the server and passes them to the background script

const loadingDiv = document.getElementById('loading')!;
const successDiv = document.getElementById('success')!;
const errorDiv = document.getElementById('error')!;
const errorMessage = document.getElementById('error-message')!;

async function handleCallback() {
  try {
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresAt = params.get('expires_at');

    if (!accessToken || !refreshToken || !expiresAt) {
      throw new Error('Missing authentication tokens');
    }

    // Send tokens to background script
    const response = await chrome.runtime.sendMessage({
      type: 'AUTH_CALLBACK',
      payload: {
        accessToken,
        refreshToken,
        expiresAt: parseInt(expiresAt, 10)
      }
    });

    if (response.success) {
      showSuccess();
      // Auto-close after 2 seconds
      setTimeout(() => {
        window.close();
      }, 2000);
    } else {
      throw new Error('Failed to save authentication');
    }
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Unknown error');
  }
}

function showSuccess() {
  loadingDiv.style.display = 'none';
  successDiv.style.display = 'block';
}

function showError(message: string) {
  loadingDiv.style.display = 'none';
  errorDiv.style.display = 'block';
  errorMessage.textContent = message;
}

// Run on page load
handleCallback();
