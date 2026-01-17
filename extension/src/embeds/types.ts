/**
 * Embedded Content Capture Types
 * TS-0004: Type definitions for embed detection, capture, and integration
 */

/**
 * Configuration for an embed content provider.
 * Each provider defines how to detect and prepare a specific type of embed.
 */
export interface EmbedProvider {
  /** Unique identifier (e.g., 'datawrapper', 'flourish') */
  id: string;

  /** Human-readable name for display */
  name: string;

  /** CSS selectors to match embed containers */
  selectors: string[];

  /** URL patterns to match iframe src attributes */
  iframePatterns?: RegExp[];

  /** Whether the embed needs to be scrolled into view before capture */
  requiresScroll?: boolean;

  /** CSS selector to wait for within the embed before capturing */
  waitForSelector?: string;

  /** Maximum time to wait for embed to load (ms) */
  waitTimeout?: number;

  /** Higher priority providers are checked first (default: 0) */
  priority: number;

  /** Optional function to extract metadata from the embed */
  extractMetadata?: (element: HTMLElement) => EmbedMetadata;
}

/**
 * Metadata extracted from an embed element.
 */
export interface EmbedMetadata {
  /** Title or caption for the embed */
  title?: string;

  /** Source URL for attribution */
  sourceUrl?: string;

  /** Provider name for attribution */
  sourceName?: string;

  /** Alt text for accessibility */
  altText?: string;
}

/**
 * A detected embed instance ready for capture.
 */
export interface DetectedEmbed {
  /** The provider that matched this embed */
  provider: EmbedProvider;

  /** The DOM element containing the embed */
  element: HTMLElement;

  /** Bounding rectangle relative to viewport */
  bounds: DOMRect;

  /** Extracted metadata */
  metadata: EmbedMetadata;

  /** Unique index for filename generation */
  index: number;
}

/**
 * Result of capturing an embed.
 */
export interface CapturedEmbed {
  /** Filename for the captured image */
  filename: string;

  /** Base64-encoded image data */
  data: string;

  /** Provider ID that captured this embed */
  providerId: string;

  /** Metadata for markdown generation */
  metadata: EmbedMetadata;

  /** Original element bounds (for reference) */
  bounds: { x: number; y: number; width: number; height: number };
}

/**
 * Configuration limits for embed capture.
 */
export interface EmbedCaptureConfig {
  /** Maximum number of embeds to capture per page */
  maxEmbeds: number;

  /** Maximum time to spend on a single embed (ms) */
  maxTimePerEmbed: number;

  /** Maximum total time for all embed captures (ms) */
  maxTotalTime: number;

  /** Minimum embed dimensions to consider (px) */
  minWidth: number;
  minHeight: number;
}

/**
 * Default configuration for embed capture.
 */
export const DEFAULT_EMBED_CONFIG: EmbedCaptureConfig = {
  maxEmbeds: 10,
  maxTimePerEmbed: 5000,
  maxTotalTime: 30000,
  minWidth: 100,
  minHeight: 50,
};

/**
 * Progress tracking for embed capture.
 */
export interface EmbedCaptureProgress {
  phase: 'detecting' | 'capturing' | 'integrating';
  total: number;
  captured: number;
  failed: number;
  current?: {
    index: number;
    provider: string;
    status: 'preparing' | 'capturing' | 'processing';
  };
  elapsed: number;
  cancellable: boolean;
}

/**
 * Result of the embed capture process.
 */
export interface EmbedCaptureResult {
  captured: CapturedEmbed[];
  failed: FailedEmbed[];
  duration: number;
  cancelled: boolean;
}

/**
 * Information about a failed embed capture.
 */
export interface FailedEmbed {
  embed: DetectedEmbed;
  error: string;
  errorType: 'timeout' | 'permission' | 'network' | 'unknown';
  retryable: boolean;
}
