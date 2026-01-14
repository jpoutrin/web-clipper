# TS-0001: Web Clipper Phase 1 Implementation

## Metadata

| Field | Value |
|-------|-------|
| Tech Spec ID | TS-0001 |
| Title | Web Clipper Phase 1 Implementation |
| Status | DRAFT |
| Author | [Your Name] |
| Created | 2026-01-14 |
| Last Updated | 2026-01-14 |
| Related RFC | RFC-0001 |
| Phase | 1 - Core Implementation |
| Tasks | [phase1-tasks.md](../../tasks/phase1-tasks.md) |

## Scope

This technical specification covers the Phase 1 implementation of the Web Clipper system:

| Component | Included | Notes |
|-----------|----------|-------|
| Chrome Extension | Yes | Basic capture, auth, upload |
| Go Backend (Buffalo) | Yes | Keycloak OAuth only |
| File Storage | Yes | Directory structure, Markdown with frontmatter |
| Image Processing | Yes | Client-side resize, server validation |
| Offline Queue | No | Phase 2 |
| Duplicate Detection | No | Phase 2 |
| Google Workspace OAuth | No | Phase 2 |

---

## 1. Chrome Extension

### 1.1 Project Setup

```bash
# Initialize extension project
mkdir -p extension && cd extension
npm init -y

# TypeScript and build tools
npm install -D typescript webpack webpack-cli ts-loader copy-webpack-plugin
npm install -D @types/chrome

# Content extraction libraries
npm install turndown @mozilla/readability
npm install -D @types/turndown
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### 1.2 Manifest (V3)

**manifest.json**:
```json
{
  "manifest_version": 3,
  "name": "Web Clipper",
  "version": "1.0.0",
  "description": "Clip web pages to Markdown with images",
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### 1.3 Type Definitions

**src/types/index.ts**:
```typescript
// Server configuration (from GET /api/v1/config)
export interface ServerConfig {
  clipDirectory: string;
  defaultFormat: string;
  images: ImageConfig;
}

export interface ImageConfig {
  maxSizeBytes: number;
  maxDimensionPx: number;
  maxTotalBytes: number;
  convertToWebp: boolean;
}

// Clip payload (POST /api/v1/clips)
export interface ClipPayload {
  title: string;
  url: string;
  markdown: string;
  tags: string[];
  notes: string;
  images: ImagePayload[];
}

export interface ImagePayload {
  filename: string;
  data: string; // base64
  originalUrl: string;
}

// Clip response
export interface ClipResponse {
  success: boolean;
  path?: string;
  error?: string;
}

// Auth state
export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  serverUrl: string;
}

// Extension state
export interface ExtensionState {
  auth: AuthState;
  config: ServerConfig | null;
  lastClip: ClipResponse | null;
}
```

### 1.4 Background Service Worker

**src/background.ts**:
```typescript
import { AuthState, ServerConfig, ClipPayload, ClipResponse } from './types';

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
  if (stored.authState) authState = stored.authState;
  if (stored.serverConfig) serverConfig = stored.serverConfig;
});

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // Async response
});

async function handleMessage(message: any): Promise<any> {
  switch (message.type) {
    case 'GET_AUTH_STATE':
      return { authState, serverConfig };

    case 'SET_SERVER_URL':
      authState.serverUrl = message.serverUrl;
      await chrome.storage.local.set({ authState });
      return { success: true };

    case 'LOGIN':
      return initiateLogin();

    case 'LOGOUT':
      return logout();

    case 'FETCH_CONFIG':
      return fetchServerConfig();

    case 'SUBMIT_CLIP':
      return submitClip(message.payload);

    default:
      return { error: 'Unknown message type' };
  }
}

async function initiateLogin(): Promise<{ loginUrl: string }> {
  // Open login in new tab, server will redirect back with token
  const loginUrl = `${authState.serverUrl}/auth/login?redirect=${chrome.runtime.getURL('callback.html')}`;
  return { loginUrl };
}

async function logout(): Promise<{ success: boolean }> {
  authState.accessToken = null;
  authState.refreshToken = null;
  authState.expiresAt = null;
  await chrome.storage.local.set({ authState });
  return { success: true };
}

async function fetchServerConfig(): Promise<ServerConfig | { error: string }> {
  if (!authState.accessToken) {
    return { error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${authState.serverUrl}/api/v1/config`, {
      headers: {
        'Authorization': `Bearer ${authState.accessToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { error: 'Token expired' };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    serverConfig = await response.json();
    await chrome.storage.local.set({ serverConfig });
    return serverConfig!;
  } catch (err) {
    return { error: `Failed to fetch config: ${err}` };
  }
}

async function submitClip(payload: ClipPayload): Promise<ClipResponse> {
  if (!authState.accessToken) {
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

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP ${response.status}`
      };
    }

    return result;
  } catch (err) {
    return { success: false, error: `Network error: ${err}` };
  }
}

// Handle OAuth callback
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === 'OAUTH_CALLBACK') {
    authState.accessToken = message.accessToken;
    authState.refreshToken = message.refreshToken;
    authState.expiresAt = message.expiresAt;
    chrome.storage.local.set({ authState });
    sendResponse({ success: true });
  }
});
```

### 1.5 Content Script (Page Capture)

**src/content.ts**:
```typescript
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';

interface CaptureResult {
  title: string;
  url: string;
  markdown: string;
  images: Array<{
    filename: string;
    data: string;
    originalUrl: string;
  }>;
}

// Listen for capture requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CAPTURE_PAGE') {
    capturePage(message.config).then(sendResponse);
    return true;
  }
});

async function capturePage(config: { maxDimensionPx: number; maxSizeBytes: number }): Promise<CaptureResult> {
  // Clone document for Readability (it modifies the DOM)
  const documentClone = document.cloneNode(true) as Document;

  // Extract main content
  const reader = new Readability(documentClone);
  const article = reader.parse();

  if (!article) {
    throw new Error('Could not extract article content');
  }

  // Convert to Markdown
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-'
  });

  // Custom rule for images - replace with local paths
  const imageMap = new Map<string, string>();
  let imageIndex = 0;

  turndown.addRule('images', {
    filter: 'img',
    replacement: (content, node) => {
      const img = node as HTMLImageElement;
      const src = img.src;
      const alt = img.alt || '';

      if (src && src.startsWith('http')) {
        const ext = getImageExtension(src);
        const filename = `image-${++imageIndex}${ext}`;
        imageMap.set(src, filename);
        return `![${alt}](media/${filename})`;
      }
      return '';
    }
  });

  const markdown = turndown.turndown(article.content);

  // Extract and process images
  const images = await extractImages(imageMap, config);

  return {
    title: article.title,
    url: window.location.href,
    markdown,
    images
  };
}

function getImageExtension(url: string): string {
  const match = url.match(/\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i);
  return match ? `.${match[1].toLowerCase()}` : '.png';
}

async function extractImages(
  imageMap: Map<string, string>,
  config: { maxDimensionPx: number; maxSizeBytes: number }
): Promise<Array<{ filename: string; data: string; originalUrl: string }>> {
  const results = [];

  for (const [url, filename] of imageMap) {
    try {
      const imageData = await fetchAndResizeImage(url, config);
      if (imageData) {
        results.push({
          filename,
          data: imageData,
          originalUrl: url
        });
      }
    } catch (err) {
      console.warn(`Failed to fetch image: ${url}`, err);
    }
  }

  return results;
}

async function fetchAndResizeImage(
  url: string,
  config: { maxDimensionPx: number; maxSizeBytes: number }
): Promise<string | null> {
  // Fetch image
  const response = await fetch(url);
  const blob = await response.blob();

  // Create image element
  const img = await createImageBitmap(blob);

  // Calculate resize dimensions
  let width = img.width;
  let height = img.height;
  const maxDim = config.maxDimensionPx;

  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height / width) * maxDim);
      width = maxDim;
    } else {
      width = Math.round((width / height) * maxDim);
      height = maxDim;
    }
  }

  // Draw to canvas
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);

  // Convert to blob with quality adjustment
  let quality = 0.9;
  let resultBlob = await canvas.convertToBlob({ type: 'image/png' });

  // Reduce quality if too large
  while (resultBlob.size > config.maxSizeBytes && quality > 0.1) {
    quality -= 0.1;
    resultBlob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality
    });
  }

  if (resultBlob.size > config.maxSizeBytes) {
    console.warn(`Image still too large after compression: ${url}`);
    return null;
  }

  // Convert to base64
  const reader = new FileReader();
  return new Promise((resolve) => {
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(resultBlob);
  });
}
```

### 1.6 Popup UI

**src/popup/popup.html**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      width: 320px;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
    }
    .header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
    }
    .header h1 {
      margin: 0;
      font-size: 18px;
      flex: 1;
    }
    .status {
      font-size: 12px;
      color: #666;
    }
    .status.connected { color: #22c55e; }
    .status.disconnected { color: #ef4444; }

    .form-group {
      margin-bottom: 12px;
    }
    label {
      display: block;
      margin-bottom: 4px;
      font-weight: 500;
    }
    input, textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
    }
    textarea {
      resize: vertical;
      min-height: 60px;
    }

    .btn {
      width: 100%;
      padding: 10px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }
    .btn-primary {
      background: #3b82f6;
      color: white;
    }
    .btn-primary:hover {
      background: #2563eb;
    }
    .btn-primary:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .settings {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }
    .settings input {
      margin-bottom: 8px;
    }

    .message {
      margin-top: 12px;
      padding: 8px;
      border-radius: 4px;
      font-size: 13px;
    }
    .message.success {
      background: #dcfce7;
      color: #166534;
    }
    .message.error {
      background: #fee2e2;
      color: #991b1b;
    }

    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Web Clipper</h1>
    <span id="status" class="status disconnected">Not connected</span>
  </div>

  <!-- Login Section -->
  <div id="login-section">
    <div class="form-group">
      <label for="server-url">Server URL</label>
      <input type="url" id="server-url" placeholder="https://clipper.example.com">
    </div>
    <button id="login-btn" class="btn btn-primary">Connect & Login</button>
  </div>

  <!-- Clip Section -->
  <div id="clip-section" class="hidden">
    <div class="form-group">
      <label for="title">Title</label>
      <input type="text" id="title" readonly>
    </div>
    <div class="form-group">
      <label for="tags">Tags (comma-separated)</label>
      <input type="text" id="tags" placeholder="tech, tutorial, reference">
    </div>
    <div class="form-group">
      <label for="notes">Notes</label>
      <textarea id="notes" placeholder="Optional notes about this clip..."></textarea>
    </div>
    <button id="clip-btn" class="btn btn-primary">Clip This Page</button>
    <button id="logout-btn" class="btn" style="margin-top: 8px;">Logout</button>
  </div>

  <div id="message" class="message hidden"></div>

  <script src="popup.js"></script>
</body>
</html>
```

**src/popup/popup.ts**:
```typescript
import { AuthState, ServerConfig, ClipPayload, ClipResponse } from '../types';

// DOM elements
const statusEl = document.getElementById('status')!;
const loginSection = document.getElementById('login-section')!;
const clipSection = document.getElementById('clip-section')!;
const serverUrlInput = document.getElementById('server-url') as HTMLInputElement;
const loginBtn = document.getElementById('login-btn')!;
const titleInput = document.getElementById('title') as HTMLInputElement;
const tagsInput = document.getElementById('tags') as HTMLInputElement;
const notesInput = document.getElementById('notes') as HTMLTextAreaElement;
const clipBtn = document.getElementById('clip-btn')!;
const logoutBtn = document.getElementById('logout-btn')!;
const messageEl = document.getElementById('message')!;

let config: ServerConfig | null = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const state = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' });

  if (state.authState?.accessToken) {
    config = state.serverConfig;
    showClipSection();
    await loadPageTitle();
  } else {
    showLoginSection();
    if (state.authState?.serverUrl) {
      serverUrlInput.value = state.authState.serverUrl;
    }
  }
});

// Event handlers
loginBtn.addEventListener('click', async () => {
  const serverUrl = serverUrlInput.value.trim();
  if (!serverUrl) {
    showMessage('Please enter server URL', 'error');
    return;
  }

  await chrome.runtime.sendMessage({ type: 'SET_SERVER_URL', serverUrl });
  const { loginUrl } = await chrome.runtime.sendMessage({ type: 'LOGIN' });

  // Open login in new tab
  chrome.tabs.create({ url: loginUrl });
});

logoutBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'LOGOUT' });
  showLoginSection();
});

clipBtn.addEventListener('click', async () => {
  clipBtn.setAttribute('disabled', 'true');
  clipBtn.textContent = 'Clipping...';

  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id) {
      throw new Error('No active tab');
    }

    // Capture page content
    const captureConfig = {
      maxDimensionPx: config?.images.maxDimensionPx || 2048,
      maxSizeBytes: config?.images.maxSizeBytes || 5242880
    };

    const captured = await chrome.tabs.sendMessage(tab.id, {
      type: 'CAPTURE_PAGE',
      config: captureConfig
    });

    // Build payload
    const payload: ClipPayload = {
      title: captured.title,
      url: captured.url,
      markdown: captured.markdown,
      tags: tagsInput.value.split(',').map(t => t.trim()).filter(Boolean),
      notes: notesInput.value.trim(),
      images: captured.images
    };

    // Submit to server
    const result: ClipResponse = await chrome.runtime.sendMessage({
      type: 'SUBMIT_CLIP',
      payload
    });

    if (result.success) {
      showMessage(`Clipped to: ${result.path}`, 'success');
      tagsInput.value = '';
      notesInput.value = '';
    } else {
      showMessage(result.error || 'Failed to clip', 'error');
    }
  } catch (err) {
    showMessage(`Error: ${err}`, 'error');
  } finally {
    clipBtn.removeAttribute('disabled');
    clipBtn.textContent = 'Clip This Page';
  }
});

// Helper functions
function showLoginSection() {
  loginSection.classList.remove('hidden');
  clipSection.classList.add('hidden');
  statusEl.textContent = 'Not connected';
  statusEl.className = 'status disconnected';
}

function showClipSection() {
  loginSection.classList.add('hidden');
  clipSection.classList.remove('hidden');
  statusEl.textContent = 'Connected';
  statusEl.className = 'status connected';
}

async function loadPageTitle() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  titleInput.value = tab.title || 'Untitled';
}

function showMessage(text: string, type: 'success' | 'error') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.classList.remove('hidden');

  setTimeout(() => {
    messageEl.classList.add('hidden');
  }, 5000);
}
```

---

## 2. Go Backend (Buffalo)

### 2.1 Project Setup

```bash
# Install Buffalo CLI
# macOS (recommended)
brew install gobuffalo/tap/buffalo

# Or from source with SQLite support
go install -tags sqlite github.com/gobuffalo/cli/cmd/buffalo@latest

# Create new Buffalo project (API only, no frontend assets)
buffalo new server --api --db-type sqlite3

cd server

# Create and migrate database
buffalo pop create -a
buffalo pop migrate

# Add dependencies
go get github.com/markbates/goth
go get github.com/markbates/goth/providers/openidConnect
go get github.com/golang-jwt/jwt/v5
go get gopkg.in/yaml.v3
```

**Buffalo CLI Flags**:
- `--api`: No frontend assets, webpack, or templates (API-only mode)
- `--db-type sqlite3`: Use SQLite for simpler single-user deployments

### 2.2 Configuration

**config/clipper.yaml**:
```yaml
server:
  port: 8080
  host: "0.0.0.0"

oauth:
  provider: "keycloak"
  client_id: "${OAUTH_CLIENT_ID}"
  client_secret: "${OAUTH_CLIENT_SECRET}"
  redirect_url: "http://localhost:8080/auth/callback"
  keycloak:
    realm: "web-clipper"
    base_url: "https://auth.example.com"

storage:
  base_path: "${CLIP_DIRECTORY:-./clips}"
  create_missing: true

images:
  max_size_bytes: 5242880
  max_dimension_px: 2048
  max_total_bytes: 26214400
  preserve_original: false

jwt:
  secret: "${JWT_SECRET}"
  expiry_hours: 24
```

**internal/config/config.go**:
```go
package config

import (
	"os"
	"strconv"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server  ServerConfig  `yaml:"server"`
	OAuth   OAuthConfig   `yaml:"oauth"`
	Storage StorageConfig `yaml:"storage"`
	Images  ImagesConfig  `yaml:"images"`
	JWT     JWTConfig     `yaml:"jwt"`
}

type ServerConfig struct {
	Port string `yaml:"port"`
	Host string `yaml:"host"`
}

type OAuthConfig struct {
	Provider     string         `yaml:"provider"`
	ClientID     string         `yaml:"client_id"`
	ClientSecret string         `yaml:"client_secret"`
	RedirectURL  string         `yaml:"redirect_url"`
	Keycloak     KeycloakConfig `yaml:"keycloak"`
}

type KeycloakConfig struct {
	Realm   string `yaml:"realm"`
	BaseURL string `yaml:"base_url"`
}

type StorageConfig struct {
	BasePath      string `yaml:"base_path"`
	CreateMissing bool   `yaml:"create_missing"`
}

type ImagesConfig struct {
	MaxSizeBytes     int64 `yaml:"max_size_bytes"`
	MaxDimensionPx   int   `yaml:"max_dimension_px"`
	MaxTotalBytes    int64 `yaml:"max_total_bytes"`
	PreserveOriginal bool  `yaml:"preserve_original"`
}

type JWTConfig struct {
	Secret      string `yaml:"secret"`
	ExpiryHours int    `yaml:"expiry_hours"`
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	// Expand environment variables
	expanded := os.ExpandEnv(string(data))

	var cfg Config
	if err := yaml.Unmarshal([]byte(expanded), &cfg); err != nil {
		return nil, err
	}

	// Apply defaults
	if cfg.Images.MaxSizeBytes == 0 {
		cfg.Images.MaxSizeBytes = 5 * 1024 * 1024 // 5MB
	}
	if cfg.Images.MaxDimensionPx == 0 {
		cfg.Images.MaxDimensionPx = 2048
	}
	if cfg.Images.MaxTotalBytes == 0 {
		cfg.Images.MaxTotalBytes = 25 * 1024 * 1024 // 25MB
	}
	if cfg.JWT.ExpiryHours == 0 {
		cfg.JWT.ExpiryHours = 24
	}

	return &cfg, nil
}
```

### 2.3 Models

**models/user.go**:
```go
package models

import (
	"time"

	"github.com/gobuffalo/pop/v6"
	"github.com/gobuffalo/validate/v3"
	"github.com/gofrs/uuid"
)

type User struct {
	ID           uuid.UUID `json:"id" db:"id"`
	Email        string    `json:"email" db:"email"`
	Name         string    `json:"name" db:"name"`
	OAuthID      string    `json:"-" db:"oauth_id"`
	ClipDirectory string   `json:"clip_directory" db:"clip_directory"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

func (u *User) Validate(tx *pop.Connection) (*validate.Errors, error) {
	return validate.NewErrors(), nil
}

// FindOrCreateByOAuthID finds existing user or creates new one
func FindOrCreateByOAuthID(tx *pop.Connection, oauthID, email, name string) (*User, error) {
	user := &User{}
	err := tx.Where("oauth_id = ?", oauthID).First(user)

	if err != nil {
		// Create new user
		user = &User{
			ID:      uuid.Must(uuid.NewV4()),
			Email:   email,
			Name:    name,
			OAuthID: oauthID,
		}
		if err := tx.Create(user); err != nil {
			return nil, err
		}
	}

	return user, nil
}
```

**Generate migration**:
```bash
buffalo pop generate fizz create_users
```

**migrations/YYYYMMDDHHMMSS_create_users.up.fizz**:
```fizz
create_table("users") {
  t.Column("id", "uuid", {primary: true})
  t.Column("email", "string", {})
  t.Column("name", "string", {})
  t.Column("oauth_id", "string", {})
  t.Column("clip_directory", "string", {null: true})
  t.Timestamps()
}

add_index("users", "oauth_id", {unique: true})
add_index("users", "email", {})
```

**Run migration**:
```bash
buffalo pop migrate
```

### 2.4 Actions (Handlers)

**actions/app.go**:
```go
package actions

import (
	"clipper/internal/config"
	"clipper/models"

	"github.com/gobuffalo/buffalo"
	"github.com/gobuffalo/envy"
	"github.com/gobuffalo/pop/v6"
	"github.com/markbates/goth"
	"github.com/markbates/goth/providers/openidConnect"
)

var (
	app *buffalo.App
	cfg *config.Config
)

func App() *buffalo.App {
	if app == nil {
		// Load configuration
		var err error
		cfg, err = config.Load("config/clipper.yaml")
		if err != nil {
			panic(err)
		}

		// Setup OAuth provider
		setupOAuth()

		app = buffalo.New(buffalo.Options{
			Env:         envy.Get("GO_ENV", "development"),
			SessionName: "_clipper_session",
		})

		// CORS middleware
		app.Use(corsMiddleware)

		// Routes
		app.GET("/health", healthCheck)

		// Auth routes
		auth := app.Group("/auth")
		auth.GET("/login", authLogin)
		auth.GET("/callback", authCallback)
		auth.POST("/refresh", authRefresh)
		auth.POST("/logout", authLogout)

		// API routes (protected)
		api := app.Group("/api/v1")
		api.Use(authMiddleware)
		api.GET("/config", getConfig)
		api.POST("/clips", createClip)
	}

	return app
}

func setupOAuth() {
	if cfg.OAuth.Provider == "keycloak" {
		discoveryURL := cfg.OAuth.Keycloak.BaseURL +
			"/realms/" + cfg.OAuth.Keycloak.Realm +
			"/.well-known/openid-configuration"

		provider, err := openidConnect.New(
			cfg.OAuth.ClientID,
			cfg.OAuth.ClientSecret,
			cfg.OAuth.RedirectURL,
			discoveryURL,
			"openid", "email", "profile",
		)
		if err != nil {
			panic(err)
		}
		provider.SetName("keycloak")
		goth.UseProviders(provider)
	}
}

func corsMiddleware(next buffalo.Handler) buffalo.Handler {
	return func(c buffalo.Context) error {
		c.Response().Header().Set("Access-Control-Allow-Origin", "*")
		c.Response().Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Response().Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")

		if c.Request().Method == "OPTIONS" {
			return c.Render(200, nil)
		}
		return next(c)
	}
}

func healthCheck(c buffalo.Context) error {
	return c.Render(200, r.JSON(map[string]string{"status": "ok"}))
}
```

**actions/auth.go**:
```go
package actions

import (
	"clipper/models"
	"time"

	"github.com/gobuffalo/buffalo"
	"github.com/gobuffalo/pop/v6"
	"github.com/golang-jwt/jwt/v5"
	"github.com/markbates/goth/gothic"
)

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresAt    int64  `json:"expires_at"`
}

func authLogin(c buffalo.Context) error {
	gothic.BeginAuthHandler(c.Response(), c.Request())
	return nil
}

func authCallback(c buffalo.Context) error {
	gothUser, err := gothic.CompleteUserAuth(c.Response(), c.Request())
	if err != nil {
		return c.Error(401, err)
	}

	// Find or create user
	tx := c.Value("tx").(*pop.Connection)
	user, err := models.FindOrCreateByOAuthID(tx, gothUser.UserID, gothUser.Email, gothUser.Name)
	if err != nil {
		return c.Error(500, err)
	}

	// Generate JWT
	tokens, err := generateTokens(user)
	if err != nil {
		return c.Error(500, err)
	}

	// Redirect to extension callback with tokens
	redirectURL := c.Param("redirect")
	if redirectURL != "" {
		return c.Redirect(302, redirectURL+
			"?access_token="+tokens.AccessToken+
			"&refresh_token="+tokens.RefreshToken+
			"&expires_at="+string(tokens.ExpiresAt))
	}

	return c.Render(200, r.JSON(tokens))
}

func authRefresh(c buffalo.Context) error {
	// Extract refresh token from request
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.Bind(&req); err != nil {
		return c.Error(400, err)
	}

	// Validate refresh token
	token, err := jwt.Parse(req.RefreshToken, func(token *jwt.Token) (interface{}, error) {
		return []byte(cfg.JWT.Secret), nil
	})
	if err != nil || !token.Valid {
		return c.Error(401, err)
	}

	claims := token.Claims.(jwt.MapClaims)
	userID := claims["sub"].(string)

	// Find user
	tx := c.Value("tx").(*pop.Connection)
	user := &models.User{}
	if err := tx.Find(user, userID); err != nil {
		return c.Error(401, err)
	}

	// Generate new tokens
	tokens, err := generateTokens(user)
	if err != nil {
		return c.Error(500, err)
	}

	return c.Render(200, r.JSON(tokens))
}

func authLogout(c buffalo.Context) error {
	// Client-side logout - just acknowledge
	return c.Render(200, r.JSON(map[string]bool{"success": true}))
}

func generateTokens(user *models.User) (*TokenResponse, error) {
	expiresAt := time.Now().Add(time.Duration(cfg.JWT.ExpiryHours) * time.Hour)

	// Access token
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   user.ID.String(),
		"email": user.Email,
		"exp":   expiresAt.Unix(),
		"type":  "access",
	})
	accessTokenStr, err := accessToken.SignedString([]byte(cfg.JWT.Secret))
	if err != nil {
		return nil, err
	}

	// Refresh token (longer expiry)
	refreshExpiry := time.Now().Add(7 * 24 * time.Hour)
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  user.ID.String(),
		"exp":  refreshExpiry.Unix(),
		"type": "refresh",
	})
	refreshTokenStr, err := refreshToken.SignedString([]byte(cfg.JWT.Secret))
	if err != nil {
		return nil, err
	}

	return &TokenResponse{
		AccessToken:  accessTokenStr,
		RefreshToken: refreshTokenStr,
		ExpiresAt:    expiresAt.Unix(),
	}, nil
}

func authMiddleware(next buffalo.Handler) buffalo.Handler {
	return func(c buffalo.Context) error {
		authHeader := c.Request().Header.Get("Authorization")
		if authHeader == "" || len(authHeader) < 7 {
			return c.Error(401, nil)
		}

		tokenStr := authHeader[7:] // Remove "Bearer "
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			return []byte(cfg.JWT.Secret), nil
		})
		if err != nil || !token.Valid {
			return c.Error(401, err)
		}

		claims := token.Claims.(jwt.MapClaims)
		c.Set("user_id", claims["sub"])
		c.Set("user_email", claims["email"])

		return next(c)
	}
}
```

**actions/clips.go**:
```go
package actions

import (
	"clipper/models"
	"clipper/services"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/gobuffalo/buffalo"
	"github.com/gobuffalo/pop/v6"
)

type ClipRequest struct {
	Title    string        `json:"title"`
	URL      string        `json:"url"`
	Markdown string        `json:"markdown"`
	Tags     []string      `json:"tags"`
	Notes    string        `json:"notes"`
	Images   []ImageUpload `json:"images"`
}

type ImageUpload struct {
	Filename    string `json:"filename"`
	Data        string `json:"data"` // base64
	OriginalURL string `json:"originalUrl"`
}

type ClipResponse struct {
	Success bool   `json:"success"`
	Path    string `json:"path,omitempty"`
	Error   string `json:"error,omitempty"`
}

func createClip(c buffalo.Context) error {
	var req ClipRequest
	if err := c.Bind(&req); err != nil {
		return c.Render(400, r.JSON(ClipResponse{
			Success: false,
			Error:   "Invalid request body",
		}))
	}

	// Validate image sizes
	var totalSize int64
	for _, img := range req.Images {
		data, err := base64.StdEncoding.DecodeString(img.Data)
		if err != nil {
			return c.Render(400, r.JSON(ClipResponse{
				Success: false,
				Error:   "Invalid image data",
			}))
		}
		size := int64(len(data))
		if size > cfg.Images.MaxSizeBytes {
			return c.Render(413, r.JSON(ClipResponse{
				Success: false,
				Error:   fmt.Sprintf("Image %s exceeds max size", img.Filename),
			}))
		}
		totalSize += size
	}
	if totalSize > cfg.Images.MaxTotalBytes {
		return c.Render(413, r.JSON(ClipResponse{
			Success: false,
			Error:   "Total image size exceeds limit",
		}))
	}

	// Get user
	userID := c.Value("user_id").(string)
	tx := c.Value("tx").(*pop.Connection)
	user := &models.User{}
	if err := tx.Find(user, userID); err != nil {
		return c.Render(401, r.JSON(ClipResponse{
			Success: false,
			Error:   "User not found",
		}))
	}

	// Determine clip directory
	clipDir := user.ClipDirectory
	if clipDir == "" {
		clipDir = cfg.Storage.BasePath
	}

	// Create folder structure
	timestamp := time.Now().Format("20060102_150405")
	siteSlug := slugify(extractDomain(req.URL))
	folderName := fmt.Sprintf("%s_%s", timestamp, siteSlug)
	folderPath := filepath.Join(clipDir, "web-clips", folderName)

	if err := os.MkdirAll(folderPath, 0755); err != nil {
		return c.Render(500, r.JSON(ClipResponse{
			Success: false,
			Error:   "Failed to create clip directory",
		}))
	}

	// Save images
	if len(req.Images) > 0 {
		mediaDir := filepath.Join(folderPath, "media")
		if err := os.MkdirAll(mediaDir, 0755); err != nil {
			return c.Render(500, r.JSON(ClipResponse{
				Success: false,
				Error:   "Failed to create media directory",
			}))
		}

		for _, img := range req.Images {
			data, _ := base64.StdEncoding.DecodeString(img.Data)
			imgPath := filepath.Join(mediaDir, sanitizeFilename(img.Filename))
			if err := os.WriteFile(imgPath, data, 0644); err != nil {
				return c.Render(500, r.JSON(ClipResponse{
					Success: false,
					Error:   fmt.Sprintf("Failed to save image: %s", img.Filename),
				}))
			}
		}
	}

	// Generate Markdown with frontmatter
	frontmatter := generateFrontmatter(req)
	content := frontmatter + "\n" + req.Markdown

	// Save Markdown file
	pageSlug := slugify(req.Title)
	if pageSlug == "" {
		pageSlug = "page"
	}
	mdPath := filepath.Join(folderPath, pageSlug+".md")
	if err := os.WriteFile(mdPath, []byte(content), 0644); err != nil {
		return c.Render(500, r.JSON(ClipResponse{
			Success: false,
			Error:   "Failed to save markdown file",
		}))
	}

	// Return relative path
	relPath := filepath.Join("web-clips", folderName, pageSlug+".md")
	return c.Render(200, r.JSON(ClipResponse{
		Success: true,
		Path:    relPath,
	}))
}

func generateFrontmatter(req ClipRequest) string {
	var sb strings.Builder
	sb.WriteString("---\n")
	sb.WriteString(fmt.Sprintf("title: %q\n", req.Title))
	sb.WriteString(fmt.Sprintf("url: %s\n", req.URL))
	sb.WriteString(fmt.Sprintf("clipped_at: %s\n", time.Now().Format(time.RFC3339)))
	sb.WriteString(fmt.Sprintf("source: %s\n", extractDomain(req.URL)))

	// Tags
	if len(req.Tags) > 0 {
		sb.WriteString("tags:\n")
		for _, tag := range req.Tags {
			sb.WriteString(fmt.Sprintf("  - %s\n", tag))
		}
	} else {
		sb.WriteString("tags: []\n")
	}

	// Notes
	if req.Notes != "" {
		sb.WriteString(fmt.Sprintf("notes: %q\n", req.Notes))
	} else {
		sb.WriteString("notes: \"\"\n")
	}

	sb.WriteString("---\n")
	return sb.String()
}

func extractDomain(url string) string {
	re := regexp.MustCompile(`https?://([^/]+)`)
	match := re.FindStringSubmatch(url)
	if len(match) > 1 {
		return match[1]
	}
	return "unknown"
}

func slugify(s string) string {
	// Convert to lowercase
	s = strings.ToLower(s)
	// Replace non-alphanumeric with dashes
	re := regexp.MustCompile(`[^a-z0-9]+`)
	s = re.ReplaceAllString(s, "-")
	// Remove leading/trailing dashes
	s = strings.Trim(s, "-")
	// Limit length
	if len(s) > 50 {
		s = s[:50]
	}
	return s
}

func sanitizeFilename(name string) string {
	// Remove path traversal attempts
	name = filepath.Base(name)
	// Replace unsafe characters
	re := regexp.MustCompile(`[^a-zA-Z0-9._-]`)
	return re.ReplaceAllString(name, "_")
}
```

**actions/config.go**:
```go
package actions

import (
	"clipper/models"

	"github.com/gobuffalo/buffalo"
	"github.com/gobuffalo/pop/v6"
)

type ConfigResponse struct {
	ClipDirectory string       `json:"clipDirectory"`
	DefaultFormat string       `json:"defaultFormat"`
	Images        ImagesConfig `json:"images"`
}

type ImagesConfig struct {
	MaxSizeBytes   int64 `json:"maxSizeBytes"`
	MaxDimensionPx int   `json:"maxDimensionPx"`
	MaxTotalBytes  int64 `json:"maxTotalBytes"`
	ConvertToWebp  bool  `json:"convertToWebp"`
}

func getConfig(c buffalo.Context) error {
	userID := c.Value("user_id").(string)
	tx := c.Value("tx").(*pop.Connection)

	user := &models.User{}
	if err := tx.Find(user, userID); err != nil {
		return c.Error(401, err)
	}

	clipDir := user.ClipDirectory
	if clipDir == "" {
		clipDir = cfg.Storage.BasePath
	}

	return c.Render(200, r.JSON(ConfigResponse{
		ClipDirectory: clipDir,
		DefaultFormat: "markdown",
		Images: ImagesConfig{
			MaxSizeBytes:   cfg.Images.MaxSizeBytes,
			MaxDimensionPx: cfg.Images.MaxDimensionPx,
			MaxTotalBytes:  cfg.Images.MaxTotalBytes,
			ConvertToWebp:  false, // Phase 2
		},
	}))
}
```

---

## 3. Testing Strategy

### 3.1 Extension Tests

```bash
# Setup test framework
npm install -D jest @types/jest ts-jest
```

**jest.config.js**:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

**tests/capture.test.ts**:
```typescript
import { capturePage } from '../src/lib/capture';

describe('Page Capture', () => {
  test('extracts title from article', async () => {
    document.body.innerHTML = `
      <article>
        <h1>Test Article</h1>
        <p>This is test content.</p>
      </article>
    `;

    const result = await capturePage({ maxDimensionPx: 2048, maxSizeBytes: 5000000 });
    expect(result.title).toBe('Test Article');
  });

  test('converts HTML to Markdown', async () => {
    document.body.innerHTML = `
      <article>
        <h1>Title</h1>
        <p>Paragraph with <strong>bold</strong> text.</p>
      </article>
    `;

    const result = await capturePage({ maxDimensionPx: 2048, maxSizeBytes: 5000000 });
    expect(result.markdown).toContain('# Title');
    expect(result.markdown).toContain('**bold**');
  });
});
```

### 3.2 Backend Tests

**actions/clips_test.go**:
```go
package actions

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
)

func (as *ActionSuite) Test_CreateClip_Success() {
	// Setup auth token
	token := as.createTestToken()

	req := ClipRequest{
		Title:    "Test Article",
		URL:      "https://example.com/test",
		Markdown: "# Test\n\nContent here.",
		Tags:     []string{"test"},
		Notes:    "Test note",
		Images:   []ImageUpload{},
	}
	body, _ := json.Marshal(req)

	res := as.JSON("/api/v1/clips").
		Header("Authorization", "Bearer "+token).
		Post(body)

	require.Equal(as.T(), http.StatusOK, res.Code)

	var resp ClipResponse
	json.Unmarshal(res.Body.Bytes(), &resp)
	require.True(as.T(), resp.Success)
	require.Contains(as.T(), resp.Path, "test-article.md")
}

func (as *ActionSuite) Test_CreateClip_ImageTooLarge() {
	token := as.createTestToken()

	// Create oversized image data (6MB)
	largeData := make([]byte, 6*1024*1024)

	req := ClipRequest{
		Title:    "Test",
		URL:      "https://example.com",
		Markdown: "# Test",
		Images: []ImageUpload{
			{
				Filename: "large.png",
				Data:     base64.StdEncoding.EncodeToString(largeData),
			},
		},
	}
	body, _ := json.Marshal(req)

	res := as.JSON("/api/v1/clips").
		Header("Authorization", "Bearer "+token).
		Post(body)

	require.Equal(as.T(), http.StatusRequestEntityTooLarge, res.Code)
}
```

---

## 4. Deployment

### 4.1 Extension Build

**package.json scripts**:
```json
{
  "scripts": {
    "build": "webpack --mode production",
    "watch": "webpack --mode development --watch",
    "test": "jest",
    "package": "npm run build && cd dist && zip -r ../web-clipper.zip ."
  }
}
```

### 4.2 Backend Deployment

**Dockerfile**:
```dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o clipper ./cmd/clipper

FROM alpine:3.19
RUN apk --no-cache add ca-certificates

WORKDIR /app
COPY --from=builder /app/clipper .
COPY --from=builder /app/config ./config

EXPOSE 8080
CMD ["./clipper"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  clipper:
    build: ./server
    ports:
      - "8080:8080"
    environment:
      - GO_ENV=production
      - OAUTH_CLIENT_ID=${OAUTH_CLIENT_ID}
      - OAUTH_CLIENT_SECRET=${OAUTH_CLIENT_SECRET}
      - JWT_SECRET=${JWT_SECRET}
      - CLIP_DIRECTORY=/clips
    volumes:
      - ./clips:/clips
      - ./config:/app/config
```

---

## 5. Acceptance Criteria

| ID | Criterion | Test |
|----|-----------|------|
| AC1 | User can authenticate via Keycloak | Login flow completes, token stored |
| AC2 | Extension captures page as Markdown | Content extracted, headings preserved |
| AC3 | Images resized client-side | Images under 2048px, under 5MB |
| AC4 | Clips saved with correct structure | `YYYYMMDD_HHMMSS_site/page.md` exists |
| AC5 | YAML frontmatter included | Title, URL, timestamp, tags present |
| AC6 | Media folder contains images | `media/` folder with image files |
| AC7 | Server validates image limits | 413 returned for oversized images |
| AC8 | Config endpoint returns limits | Extension receives image constraints |

---

## 6. Dependencies

### Extension

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ^5.3 | Type safety |
| webpack | ^5.89 | Bundling |
| turndown | ^7.1 | HTML to Markdown |
| @mozilla/readability | ^0.5 | Content extraction |

### Backend

| Package | Version | Purpose |
|---------|---------|---------|
| github.com/gobuffalo/buffalo | v1.1 | Web framework |
| github.com/gobuffalo/pop | v6.1 | Database ORM |
| github.com/markbates/goth | v1.79 | OAuth providers |
| github.com/golang-jwt/jwt | v5.2 | JWT tokens |
