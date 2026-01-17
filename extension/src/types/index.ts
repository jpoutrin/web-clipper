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

// Clip modes
export type ClipMode = 'article' | 'bookmark' | 'screenshot' | 'selection' | 'fullpage';

// Clip payload (POST /api/v1/clips)
export interface ClipPayload {
  title: string;
  url: string;
  markdown: string;
  html?: string; // For fullpage mode
  tags: string[];
  notes: string;
  images: ImagePayload[];
  mode?: ClipMode;
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

// Message types for communication between components
export type MessageType =
  | 'GET_STATE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'FETCH_CONFIG'
  | 'CAPTURE_PAGE'
  | 'CAPTURE_BOOKMARK'
  | 'CAPTURE_SCREENSHOT'
  | 'CAPTURE_SELECTION'
  | 'CAPTURE_FULLPAGE'
  | 'START_SELECTION_MODE'
  | 'CANCEL_SELECTION_MODE'
  | 'SELECTION_COMPLETE'
  | 'SELECTION_CANCELLED'
  | 'FETCH_IMAGE'
  | 'SUBMIT_CLIP'
  | 'AUTH_CALLBACK'
  | 'DEV_LOGIN';

export interface Message {
  type: MessageType;
  payload?: unknown;
}

// Screenshot result
export interface ScreenshotResult {
  title: string;
  url: string;
  image: {
    filename: string;
    data: string; // base64
    width: number;
    height: number;
    format: 'png' | 'jpeg';
  };
}

// Selection result
export interface SelectionResult {
  title: string;
  url: string;
  markdown: string;
  html: string;
  images: ImagePayload[];
  selector: string;
}

// Full page result
export interface FullPageResult {
  title: string;
  url: string;
  html: string;
  images: ImagePayload[];
}

// Bookmark result
export interface BookmarkResult {
  title: string;
  url: string;
  excerpt: string;
  favicon?: string;
}

// Unified capture result from content script
export interface CaptureResult {
  mode: ClipMode;
  title: string;
  url: string;
  markdown?: string;
  html?: string;
  images: ImagePayload[];
  screenshot?: {
    filename: string;
    data: string;
    width: number;
    height: number;
  };
  excerpt?: string;
  favicon?: string;
  selector?: string;
}

// Capture configuration
export interface CaptureConfig {
  maxDimensionPx: number;
  maxSizeBytes: number;
}
