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

// Message types for communication between components
export type MessageType =
  | 'GET_STATE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'FETCH_CONFIG'
  | 'CAPTURE_PAGE'
  | 'SUBMIT_CLIP'
  | 'AUTH_CALLBACK';

export interface Message {
  type: MessageType;
  payload?: unknown;
}

// Capture result from content script
export interface CaptureResult {
  title: string;
  url: string;
  markdown: string;
  images: ImagePayload[];
}
