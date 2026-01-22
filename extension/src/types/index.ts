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

// Clip summary for list views (lightweight version without full content)
export interface ClipSummary {
  id: string;
  title: string;
  url: string;
  mode: ClipMode;
  tags: string[] | null;
  notes?: string;
  created_at: string; // ISO 8601 timestamp
}

// API response for list endpoint
export interface ListClipsResponse {
  clips: ClipSummary[];
  page: number; // Current page (1-indexed)
  per_page: number; // Items per page
  total: number; // Total clips count
  total_pages: number; // Total pages
}

// Filter parameters for list request
export interface ClipFilters {
  page?: number; // Page number (default: 1)
  per_page?: number; // Items per page (default: 20, max: 100)
  mode?: ClipMode; // Filter by mode
  tag?: string; // Filter by tag (substring match)
}

// Message types for communication between components
export type MessageType =
  | 'PING'
  | 'GET_STATE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'FETCH_CONFIG'
  | 'CAPTURE_PAGE'
  | 'CAPTURE_BOOKMARK'
  | 'CAPTURE_SCREENSHOT'
  | 'CAPTURE_SELECTION'
  | 'CAPTURE_FULLPAGE'
  | 'CAPTURE_EMBED'
  | 'START_SELECTION_MODE'
  | 'CANCEL_SELECTION_MODE'
  | 'SELECTION_COMPLETE'
  | 'SELECTION_CANCELLED'
  | 'FETCH_IMAGE'
  | 'SUBMIT_CLIP'
  | 'LIST_CLIPS'
  | 'DELETE_CLIP'
  | 'SCHEDULE_DELETE'
  | 'CANCEL_DELETE'
  | 'EXECUTE_DELETE_NOW'
  | 'GET_PENDING_DELETES'
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

/**
 * Payload for CAPTURE_EMBED message.
 */
export interface CaptureEmbedPayload {
  /** Bounding rectangle of the embed element */
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  /** Device pixel ratio for high-DPI displays */
  devicePixelRatio: number;
}

/**
 * Response from CAPTURE_EMBED message.
 */
export interface CaptureEmbedResponse {
  /** Whether the capture succeeded */
  success: boolean;

  /** Base64-encoded cropped image data (if success) */
  data?: string;

  /** Error message (if failed) */
  error?: string;
}
