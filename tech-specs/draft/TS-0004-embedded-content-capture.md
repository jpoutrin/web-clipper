# TS-0004: Embedded Content Capture

## Metadata

| Field | Value |
|-------|-------|
| Tech Spec ID | TS-0004 |
| Title | Embedded Content Capture |
| Status | DRAFT |
| Author | |
| Created | 2026-01-17 |
| Last Updated | 2026-01-17 |
| Related RFC | - |
| Phase | 2 - Enhanced Capture |
| Reviews | CTO Architecture, UX Expert, UI Product Expert |
| Depends On | TS-0001, TS-0003 |
| Location | tech-specs/draft/TS-0004-embedded-content-capture.md |

## Executive Summary

This specification defines a screenshot-based capture system for embedded content (charts, graphs, social media posts) that are currently lost during article clipping. The system uses an extensible provider registry pattern to detect, prepare, and capture various embed types, integrating the results seamlessly into the Markdown output.

Embedded content from services like Datawrapper, Flourish, Twitter/X, and YouTube are typically rendered within iframes or custom elements that Readability cannot extract. This feature captures these embeds as images, preserving the visual information that would otherwise be lost.

## Scope

| Component | Included | Notes |
|-----------|----------|-------|
| Provider Registry | Yes | Extensible pattern for embed detection |
| Built-in Providers | Yes | Datawrapper, Flourish, Infogram, Twitter/X, YouTube |
| Embed Detection | Yes | CSS selector and iframe pattern matching |
| Embed Preparation | Yes | Scroll into view, wait for load |
| Screenshot Capture | Yes | Via CAPTURE_EMBED message to background |
| Viewport Cropping | Yes | OffscreenCanvas-based image cropping |
| Markdown Integration | Yes | Turndown rules for embed replacement |
| Generic Iframe Fallback | Yes | Low-priority catch-all provider |
| Custom Provider Registration | No | Phase 3 - user-defined providers |
| Video Frame Extraction | No | Phase 3 - capture video at current frame |

---

## 1. Architecture Overview

### 1.1 System Flow

```
Content Script                    Background Script
     |                                   |
  detectEmbeds()                         |
     |                                   |
  prepareEmbed()  <-> scroll/wait        |
     |                                   |
  request screenshot ----------------> CAPTURE_EMBED handler
     |                                   |
     |                              captureVisibleTab()
     |                                   |
     |                              cropImage()
     |                                   |
     |  <------------------------------ return base64
     |                                   |
  integrate into markdown               |
```

### 1.2 Processing Pipeline

1. **Detection Phase**: Query DOM using provider selectors and iframe patterns
2. **Filtering Phase**: Remove duplicates, skip tiny elements, respect limits
3. **Preparation Phase**: Scroll each embed into view, wait for content to load
4. **Capture Phase**: Screenshot visible tab, crop to embed bounds
5. **Integration Phase**: Replace embed elements with image markdown

---

## 2. Type Definitions

### 2.1 Core Types

**extension/src/embeds/types.ts**:
```typescript
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
```

### 2.2 Message Types

**extension/src/types/index.ts** (additions):
```typescript
// Add to existing MessageType union
export type MessageType =
  | 'GET_STATE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'FETCH_CONFIG'
  | 'CAPTURE_PAGE'
  | 'CAPTURE_SCREENSHOT'
  | 'CAPTURE_EMBED'        // NEW: Capture a single embed element
  | 'SUBMIT_CLIP'
  | 'AUTH_CALLBACK'
  | 'DEV_LOGIN';

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
```

---

## 3. Provider Registry

### 3.1 Registry Implementation

**extension/src/embeds/providers/index.ts**:
```typescript
import { EmbedProvider, EmbedMetadata } from '../types';

/**
 * Registry of embed providers.
 * Providers are sorted by priority (highest first) on registration.
 */
class ProviderRegistry {
  private providers: EmbedProvider[] = [];

  /**
   * Register a new provider.
   * Maintains sorted order by priority (descending).
   */
  register(provider: EmbedProvider): void {
    this.providers.push(provider);
    this.providers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get all registered providers in priority order.
   */
  getAll(): EmbedProvider[] {
    return [...this.providers];
  }

  /**
   * Find a provider by ID.
   */
  getById(id: string): EmbedProvider | undefined {
    return this.providers.find(p => p.id === id);
  }

  /**
   * Get all CSS selectors from all providers.
   */
  getAllSelectors(): string[] {
    return this.providers.flatMap(p => p.selectors);
  }

  /**
   * Get all iframe patterns from all providers.
   */
  getAllIframePatterns(): Array<{ provider: EmbedProvider; pattern: RegExp }> {
    return this.providers
      .filter(p => p.iframePatterns?.length)
      .flatMap(p => p.iframePatterns!.map(pattern => ({ provider: p, pattern })));
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry();

// ============================================
// Built-in Providers
// ============================================

/**
 * Datawrapper - Data visualization platform
 * Used by many news organizations for charts and maps.
 */
export const datawrapperProvider: EmbedProvider = {
  id: 'datawrapper',
  name: 'Datawrapper',
  selectors: [
    '.datawrapper-embed',
    '[data-datawrapper-id]',
    'iframe[src*="datawrapper.dwcdn.net"]',
  ],
  iframePatterns: [
    /datawrapper\.dwcdn\.net/i,
    /datawrapper\.de/i,
  ],
  requiresScroll: true,
  waitForSelector: 'svg, canvas, .dw-chart',
  waitTimeout: 3000,
  priority: 100,
  extractMetadata: (element: HTMLElement): EmbedMetadata => {
    const iframe = element.querySelector('iframe');
    const title = element.getAttribute('data-title') ||
                  iframe?.getAttribute('title') ||
                  'Data Visualization';
    const src = iframe?.getAttribute('src') || '';

    return {
      title,
      sourceUrl: src,
      sourceName: 'Datawrapper',
      altText: `Chart: ${title}`,
    };
  },
};

/**
 * Flourish - Data storytelling platform
 * Popular for animated and interactive visualizations.
 */
export const flourishProvider: EmbedProvider = {
  id: 'flourish',
  name: 'Flourish',
  selectors: [
    '.flourish-embed',
    '[data-src*="flo.uri.sh"]',
    'iframe[src*="flo.uri.sh"]',
  ],
  iframePatterns: [
    /flo\.uri\.sh/i,
    /flourish\.studio/i,
  ],
  requiresScroll: true,
  waitForSelector: 'svg, canvas',
  waitTimeout: 3000,
  priority: 100,
  extractMetadata: (element: HTMLElement): EmbedMetadata => {
    const iframe = element.querySelector('iframe');
    const title = element.getAttribute('data-title') ||
                  iframe?.getAttribute('title') ||
                  'Interactive Visualization';

    return {
      title,
      sourceUrl: iframe?.getAttribute('src') || '',
      sourceName: 'Flourish',
      altText: `Visualization: ${title}`,
    };
  },
};

/**
 * Infogram - Infographic and chart platform
 */
export const infogramProvider: EmbedProvider = {
  id: 'infogram',
  name: 'Infogram',
  selectors: [
    '.infogram-embed',
    '[data-id*="infogram"]',
    'iframe[src*="infogram.com"]',
  ],
  iframePatterns: [
    /infogram\.com/i,
    /e\.infogram\.com/i,
  ],
  requiresScroll: true,
  waitForSelector: 'svg, canvas',
  waitTimeout: 3000,
  priority: 100,
  extractMetadata: (element: HTMLElement): EmbedMetadata => {
    const title = element.getAttribute('data-title') || 'Infographic';

    return {
      title,
      sourceName: 'Infogram',
      altText: `Infographic: ${title}`,
    };
  },
};

/**
 * Twitter/X - Social media embeds
 */
export const twitterProvider: EmbedProvider = {
  id: 'twitter',
  name: 'Twitter/X',
  selectors: [
    '.twitter-tweet',
    '.twitter-timeline',
    'blockquote.twitter-tweet',
    'iframe[src*="platform.twitter.com"]',
    'iframe[src*="platform.x.com"]',
  ],
  iframePatterns: [
    /platform\.twitter\.com/i,
    /platform\.x\.com/i,
  ],
  requiresScroll: true,
  waitForSelector: '.twitter-tweet-rendered, iframe',
  waitTimeout: 4000,
  priority: 90,
  extractMetadata: (element: HTMLElement): EmbedMetadata => {
    // Try to extract tweet text and author
    const blockquote = element.closest('blockquote') || element.querySelector('blockquote');
    const link = blockquote?.querySelector('a[href*="twitter.com"], a[href*="x.com"]');
    const href = link?.getAttribute('href') || '';

    return {
      title: 'Tweet',
      sourceUrl: href,
      sourceName: 'Twitter/X',
      altText: 'Twitter post',
    };
  },
};

/**
 * YouTube - Video thumbnails
 * Captures the video thumbnail rather than a blank player.
 */
export const youtubeProvider: EmbedProvider = {
  id: 'youtube',
  name: 'YouTube',
  selectors: [
    'iframe[src*="youtube.com/embed"]',
    'iframe[src*="youtube-nocookie.com/embed"]',
    '.youtube-player',
    'lite-youtube',
  ],
  iframePatterns: [
    /youtube\.com\/embed/i,
    /youtube-nocookie\.com\/embed/i,
  ],
  requiresScroll: true,
  waitTimeout: 2000,
  priority: 80,
  extractMetadata: (element: HTMLElement): EmbedMetadata => {
    const iframe = element.tagName === 'IFRAME' ? element as HTMLIFrameElement : element.querySelector('iframe');
    const src = iframe?.getAttribute('src') || '';
    const videoIdMatch = src.match(/embed\/([a-zA-Z0-9_-]+)/);
    const videoId = videoIdMatch?.[1] || '';
    const title = iframe?.getAttribute('title') || 'YouTube Video';

    return {
      title,
      sourceUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : src,
      sourceName: 'YouTube',
      altText: `Video: ${title}`,
    };
  },
};

/**
 * Generic iframe fallback - lowest priority catch-all
 * Captures any iframe that wasn't matched by a specific provider.
 */
export const genericIframeProvider: EmbedProvider = {
  id: 'generic-iframe',
  name: 'Embedded Content',
  selectors: [
    'iframe[src]:not([src=""])',
  ],
  requiresScroll: true,
  waitTimeout: 2000,
  priority: 0, // Lowest priority - only matches if nothing else does
  extractMetadata: (element: HTMLElement): EmbedMetadata => {
    const iframe = element as HTMLIFrameElement;
    const src = iframe.getAttribute('src') || '';
    let sourceName = 'Embedded Content';

    try {
      const url = new URL(src, window.location.href);
      sourceName = url.hostname.replace(/^www\./, '');
    } catch {
      // Invalid URL, use default
    }

    return {
      title: iframe.getAttribute('title') || 'Embedded Content',
      sourceUrl: src,
      sourceName,
      altText: `Embedded content from ${sourceName}`,
    };
  },
};

// Register all built-in providers
providerRegistry.register(datawrapperProvider);
providerRegistry.register(flourishProvider);
providerRegistry.register(infogramProvider);
providerRegistry.register(twitterProvider);
providerRegistry.register(youtubeProvider);
providerRegistry.register(genericIframeProvider);
```

---

## 4. Detection and Preparation

### 4.1 Embed Detection

**extension/src/embeds/detector.ts**:
```typescript
import { providerRegistry } from './providers';
import { DetectedEmbed, EmbedCaptureConfig, DEFAULT_EMBED_CONFIG } from './types';

/**
 * Detect all embeds on the page using registered providers.
 *
 * @param config - Capture configuration with limits
 * @returns Array of detected embeds, sorted by document position
 */
export function detectEmbeds(
  config: EmbedCaptureConfig = DEFAULT_EMBED_CONFIG
): DetectedEmbed[] {
  const detected: DetectedEmbed[] = [];
  const processedElements = new Set<HTMLElement>();
  let embedIndex = 0;

  // Get all providers in priority order
  const providers = providerRegistry.getAll();

  for (const provider of providers) {
    // Check if we've hit the limit
    if (detected.length >= config.maxEmbeds) {
      break;
    }

    // Query all selectors for this provider
    for (const selector of provider.selectors) {
      try {
        const elements = document.querySelectorAll<HTMLElement>(selector);

        for (const element of elements) {
          // Skip if already processed by a higher-priority provider
          if (processedElements.has(element)) {
            continue;
          }

          // Skip if already at limit
          if (detected.length >= config.maxEmbeds) {
            break;
          }

          // Check if element is visible and meets size requirements
          const bounds = element.getBoundingClientRect();
          if (!isValidEmbedBounds(bounds, config)) {
            continue;
          }

          // Mark as processed to prevent duplicate captures
          processedElements.add(element);

          // Also mark parent/child elements to avoid nested captures
          markRelatedElements(element, processedElements);

          // Extract metadata using provider's extractor
          const metadata = provider.extractMetadata?.(element) || {
            title: 'Embedded Content',
            sourceName: provider.name,
          };

          detected.push({
            provider,
            element,
            bounds,
            metadata,
            index: ++embedIndex,
          });
        }
      } catch (err) {
        console.warn(`Error querying selector "${selector}":`, err);
      }
    }
  }

  // Also check iframes by src pattern
  const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe[src]');
  const patterns = providerRegistry.getAllIframePatterns();

  for (const iframe of iframes) {
    if (detected.length >= config.maxEmbeds) {
      break;
    }

    if (processedElements.has(iframe)) {
      continue;
    }

    const src = iframe.getAttribute('src') || '';

    for (const { provider, pattern } of patterns) {
      if (pattern.test(src)) {
        const bounds = iframe.getBoundingClientRect();
        if (!isValidEmbedBounds(bounds, config)) {
          continue;
        }

        processedElements.add(iframe);

        const metadata = provider.extractMetadata?.(iframe) || {
          title: 'Embedded Content',
          sourceUrl: src,
          sourceName: provider.name,
        };

        detected.push({
          provider,
          element: iframe,
          bounds,
          metadata,
          index: ++embedIndex,
        });

        break; // Only match first provider
      }
    }
  }

  // Sort by document position (top to bottom, left to right)
  detected.sort((a, b) => {
    if (Math.abs(a.bounds.top - b.bounds.top) < 50) {
      return a.bounds.left - b.bounds.left;
    }
    return a.bounds.top - b.bounds.top;
  });

  return detected;
}

/**
 * Check if bounds meet minimum size requirements.
 */
function isValidEmbedBounds(
  bounds: DOMRect,
  config: EmbedCaptureConfig
): boolean {
  return (
    bounds.width >= config.minWidth &&
    bounds.height >= config.minHeight &&
    bounds.width > 0 &&
    bounds.height > 0
  );
}

/**
 * Mark related elements (parents/children) as processed
 * to avoid capturing nested embeds.
 */
function markRelatedElements(
  element: HTMLElement,
  processedElements: Set<HTMLElement>
): void {
  // Mark all child iframes
  const childIframes = element.querySelectorAll<HTMLElement>('iframe');
  childIframes.forEach(iframe => processedElements.add(iframe));

  // Mark immediate parent if it's a common embed wrapper
  const parent = element.parentElement;
  if (parent && isEmbedWrapper(parent)) {
    processedElements.add(parent);
  }
}

/**
 * Check if an element is a common embed wrapper.
 */
function isEmbedWrapper(element: HTMLElement): boolean {
  const wrapperClasses = [
    'embed-container',
    'embed-wrapper',
    'iframe-wrapper',
    'video-wrapper',
    'responsive-embed',
  ];

  return wrapperClasses.some(cls =>
    element.classList.contains(cls)
  );
}
```

### 4.2 Embed Preparation

**extension/src/embeds/preparer.ts**:
```typescript
import { DetectedEmbed } from './types';

/**
 * Prepare an embed for capture by scrolling it into view
 * and waiting for its content to load.
 *
 * @param embed - The detected embed to prepare
 * @returns Updated bounds after preparation
 */
export async function prepareEmbed(embed: DetectedEmbed): Promise<DOMRect> {
  const { element, provider } = embed;

  // Scroll into view if required
  if (provider.requiresScroll) {
    await scrollIntoView(element);
  }

  // Wait for content to load
  if (provider.waitForSelector) {
    await waitForSelector(element, provider.waitForSelector, provider.waitTimeout || 3000);
  } else if (provider.waitTimeout) {
    // Generic wait for lazy-loaded content
    await wait(Math.min(provider.waitTimeout, 1000));
  }

  // Re-measure bounds after scrolling and loading
  const updatedBounds = element.getBoundingClientRect();

  return updatedBounds;
}

/**
 * Scroll an element into the center of the viewport.
 */
async function scrollIntoView(element: HTMLElement): Promise<void> {
  return new Promise(resolve => {
    element.scrollIntoView({
      behavior: 'instant',
      block: 'center',
      inline: 'center',
    });

    // Wait for scroll to complete
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

/**
 * Wait for a selector to appear within an element.
 */
async function waitForSelector(
  container: HTMLElement,
  selector: string,
  timeout: number
): Promise<boolean> {
  const startTime = Date.now();

  return new Promise(resolve => {
    // Check if already present
    if (container.querySelector(selector)) {
      resolve(true);
      return;
    }

    // For iframes, check inside the frame if same-origin
    if (container.tagName === 'IFRAME') {
      try {
        const iframe = container as HTMLIFrameElement;
        const doc = iframe.contentDocument;
        if (doc && doc.querySelector(selector)) {
          resolve(true);
          return;
        }
      } catch {
        // Cross-origin iframe, can't check inside
      }
    }

    // Poll for the selector
    const interval = setInterval(() => {
      if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        resolve(false);
        return;
      }

      if (container.querySelector(selector)) {
        clearInterval(interval);
        resolve(true);
        return;
      }

      // Check iframe content if accessible
      if (container.tagName === 'IFRAME') {
        try {
          const iframe = container as HTMLIFrameElement;
          const doc = iframe.contentDocument;
          if (doc && doc.querySelector(selector)) {
            clearInterval(interval);
            resolve(true);
            return;
          }
        } catch {
          // Cross-origin, continue polling
        }
      }
    }, 100);
  });
}

/**
 * Simple wait utility.
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## 5. Screenshot Capture

### 5.1 Background Script Handler

**extension/src/background.ts** (additions):
```typescript
import { CaptureEmbedPayload, CaptureEmbedResponse } from './types';

// Add to message handler switch statement
case 'CAPTURE_EMBED':
  return handleCaptureEmbed(message.payload as CaptureEmbedPayload);

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
    new Uint8Array(arrayBuffer).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ''
    )
  );

  return base64;
}
```

### 5.2 Content Script Capturer

**extension/src/embeds/capturer.ts**:
```typescript
import { DetectedEmbed, CapturedEmbed, EmbedCaptureConfig, DEFAULT_EMBED_CONFIG } from './types';
import { CaptureEmbedResponse } from '../types';
import { prepareEmbed } from './preparer';

/**
 * Capture a single embed element.
 *
 * @param embed - The detected embed to capture
 * @returns Captured embed data or null if capture failed
 */
export async function captureEmbed(embed: DetectedEmbed): Promise<CapturedEmbed | null> {
  try {
    // Prepare the embed (scroll, wait for load)
    const bounds = await prepareEmbed(embed);

    // Request screenshot from background script
    const response: CaptureEmbedResponse = await chrome.runtime.sendMessage({
      type: 'CAPTURE_EMBED',
      payload: {
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
        devicePixelRatio: window.devicePixelRatio,
      },
    });

    if (!response.success || !response.data) {
      console.warn(`Embed capture failed: ${response.error}`);
      return null;
    }

    // Generate filename
    const filename = generateEmbedFilename(embed);

    return {
      filename,
      data: response.data,
      providerId: embed.provider.id,
      metadata: embed.metadata,
      bounds: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      },
    };
  } catch (err) {
    console.error(`Error capturing embed:`, err);
    return null;
  }
}

/**
 * Capture all detected embeds with timeout handling.
 *
 * @param embeds - Array of detected embeds
 * @param config - Capture configuration
 * @returns Array of successfully captured embeds
 */
export async function captureAllEmbeds(
  embeds: DetectedEmbed[],
  config: EmbedCaptureConfig = DEFAULT_EMBED_CONFIG
): Promise<CapturedEmbed[]> {
  const captured: CapturedEmbed[] = [];
  const startTime = Date.now();

  for (const embed of embeds) {
    // Check total time limit
    if (Date.now() - startTime > config.maxTotalTime) {
      console.warn('Embed capture timeout - stopping further captures');
      break;
    }

    // Capture with per-embed timeout
    const result = await Promise.race([
      captureEmbed(embed),
      timeout(config.maxTimePerEmbed),
    ]);

    if (result) {
      captured.push(result);
    }
  }

  return captured;
}

/**
 * Generate a filename for a captured embed.
 */
function generateEmbedFilename(embed: DetectedEmbed): string {
  const sanitizedProvider = embed.provider.id.replace(/[^a-z0-9]/gi, '-');
  return `embed${embed.index}_${sanitizedProvider}.png`;
}

/**
 * Timeout promise that resolves to null.
 */
function timeout(ms: number): Promise<null> {
  return new Promise(resolve => setTimeout(() => resolve(null), ms));
}
```

---

## 6. Markdown Integration

### 6.1 Turndown Rules

**extension/src/embeds/integrator.ts**:
```typescript
import TurndownService from 'turndown';
import { CapturedEmbed, DetectedEmbed } from './types';

/**
 * Create Turndown rules to replace embed elements with captured images.
 *
 * @param turndown - The Turndown service instance
 * @param capturedEmbeds - Map of element to captured data
 */
export function addEmbedRules(
  turndown: TurndownService,
  capturedEmbeds: Map<HTMLElement, CapturedEmbed>
): void {
  // Rule for elements with captured screenshots
  turndown.addRule('captured-embeds', {
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return false;
      return capturedEmbeds.has(node) || hasParentInMap(node, capturedEmbeds);
    },
    replacement: (content, node) => {
      const element = node as HTMLElement;
      const captured = capturedEmbeds.get(element) || getParentCapture(element, capturedEmbeds);

      if (!captured) {
        return ''; // Should not happen, but safety check
      }

      return generateEmbedMarkdown(captured);
    },
  });

  // Rule for uncaptured embeds - provide link fallback
  turndown.addRule('uncaptured-embeds', {
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return false;
      return isEmbedElement(node) && !capturedEmbeds.has(node);
    },
    replacement: (content, node) => {
      const element = node as HTMLElement;
      return generateFallbackMarkdown(element);
    },
  });
}

/**
 * Generate Markdown for a captured embed.
 */
function generateEmbedMarkdown(captured: CapturedEmbed): string {
  const { filename, metadata } = captured;
  const alt = metadata.altText || metadata.title || 'Embedded content';
  const title = metadata.title || 'Embedded Content';

  let markdown = `\n![${alt}](media/${filename})\n`;

  // Add source attribution
  if (metadata.sourceUrl && metadata.sourceName) {
    markdown += `\n*Source: [${metadata.sourceName}](${metadata.sourceUrl})*\n`;
  } else if (metadata.sourceName) {
    markdown += `\n*Source: ${metadata.sourceName}*\n`;
  }

  return markdown;
}

/**
 * Generate fallback Markdown for an uncaptured embed.
 */
function generateFallbackMarkdown(element: HTMLElement): string {
  const iframe = element.tagName === 'IFRAME'
    ? element as HTMLIFrameElement
    : element.querySelector('iframe');

  if (iframe) {
    const src = iframe.getAttribute('src') || '';
    const title = iframe.getAttribute('title') || 'Embedded Content';

    if (src) {
      return `\n*[View embedded content: ${title}](${src})*\n`;
    }
  }

  return '\n*[Embedded content could not be captured]*\n';
}

/**
 * Check if an element is an embed element.
 */
function isEmbedElement(element: HTMLElement): boolean {
  const embedTags = ['IFRAME'];
  const embedClasses = [
    'twitter-tweet',
    'flourish-embed',
    'datawrapper-embed',
    'infogram-embed',
  ];

  if (embedTags.includes(element.tagName)) {
    return true;
  }

  return embedClasses.some(cls => element.classList.contains(cls));
}

/**
 * Check if an element has a parent in the captured map.
 */
function hasParentInMap(
  element: HTMLElement,
  capturedEmbeds: Map<HTMLElement, CapturedEmbed>
): boolean {
  let parent = element.parentElement;
  while (parent) {
    if (capturedEmbeds.has(parent)) {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

/**
 * Get the capture data from a parent element.
 */
function getParentCapture(
  element: HTMLElement,
  capturedEmbeds: Map<HTMLElement, CapturedEmbed>
): CapturedEmbed | undefined {
  let parent = element.parentElement;
  while (parent) {
    const capture = capturedEmbeds.get(parent);
    if (capture) {
      return capture;
    }
    parent = parent.parentElement;
  }
  return undefined;
}
```

### 6.2 Content Script Integration

**extension/src/content.ts** (modified capturePage function):
```typescript
import { detectEmbeds } from './embeds/detector';
import { captureAllEmbeds } from './embeds/capturer';
import { addEmbedRules } from './embeds/integrator';
import { CapturedEmbed, DEFAULT_EMBED_CONFIG } from './embeds/types';

async function capturePage(config: { maxDimensionPx: number; maxSizeBytes: number }): Promise<CaptureResult> {
  // 1. Detect embeds BEFORE cloning (need access to original DOM)
  const detectedEmbeds = detectEmbeds(DEFAULT_EMBED_CONFIG);

  // 2. Capture embeds
  const capturedEmbeds = await captureAllEmbeds(detectedEmbeds, DEFAULT_EMBED_CONFIG);

  // Create a map for quick lookup
  const embedMap = new Map<HTMLElement, CapturedEmbed>();
  capturedEmbeds.forEach((captured, index) => {
    const detected = detectedEmbeds[index];
    if (detected) {
      embedMap.set(detected.element, captured);
    }
  });

  // 3. Clone document for Readability
  const documentClone = document.cloneNode(true) as Document;

  // 4. Extract main content
  const reader = new Readability(documentClone);
  const article = reader.parse();

  if (!article) {
    throw new Error('Could not extract article content');
  }

  // 5. Convert to Markdown with embed rules
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  // Add embed replacement rules
  addEmbedRules(turndown, embedMap);

  // Add image rules (existing)
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
    },
  });

  const markdown = turndown.turndown(article.content);

  // 6. Extract regular images
  const regularImages = await extractImages(imageMap, config);

  // 7. Combine regular images and embed images
  const embedImages = capturedEmbeds.map(embed => ({
    filename: embed.filename,
    data: embed.data,
    originalUrl: '',
  }));

  const allImages = [...regularImages, ...embedImages];

  return {
    title: article.title,
    url: window.location.href,
    markdown,
    images: allImages,
  };
}
```

---

## 7. Error Handling and Fallback Cascade

### 7.1 Fallback Strategy

The system implements a three-level fallback cascade:

```
Level 1: Full Capture
    |
    | (success) -> Use captured image
    |
    v (failure)
Level 2: Immediate Capture (no preparation)
    |
    | (success) -> Use captured image
    |
    v (failure)
Level 3: Metadata-Only Fallback
    |
    -> Generate link to original embed
```

### 7.2 Error Isolation

**Guiding Principle**: Embed capture failures should NEVER break article clipping.

**extension/src/embeds/capturer.ts** (error handling additions):
```typescript
/**
 * Capture embed with fallback cascade.
 */
export async function captureEmbedWithFallback(
  embed: DetectedEmbed
): Promise<CapturedEmbed | null> {
  // Level 1: Full capture with preparation
  try {
    const result = await captureEmbed(embed);
    if (result) return result;
  } catch (err) {
    console.warn(`Level 1 capture failed for ${embed.provider.id}:`, err);
  }

  // Level 2: Immediate capture without preparation
  try {
    const bounds = embed.element.getBoundingClientRect();
    const response: CaptureEmbedResponse = await chrome.runtime.sendMessage({
      type: 'CAPTURE_EMBED',
      payload: {
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
        devicePixelRatio: window.devicePixelRatio,
      },
    });

    if (response.success && response.data) {
      return {
        filename: generateEmbedFilename(embed),
        data: response.data,
        providerId: embed.provider.id,
        metadata: embed.metadata,
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
      };
    }
  } catch (err) {
    console.warn(`Level 2 capture failed for ${embed.provider.id}:`, err);
  }

  // Level 3: Return null - integrator will generate fallback markdown
  return null;
}

/**
 * Safe wrapper for embed detection that never throws.
 */
export function safeDetectEmbeds(): DetectedEmbed[] {
  try {
    return detectEmbeds();
  } catch (err) {
    console.error('Embed detection failed:', err);
    return [];
  }
}

/**
 * Safe wrapper for embed capture that never throws.
 */
export async function safeCaptureAllEmbeds(
  embeds: DetectedEmbed[],
  config: EmbedCaptureConfig = DEFAULT_EMBED_CONFIG
): Promise<CapturedEmbed[]> {
  try {
    return await captureAllEmbeds(embeds, config);
  } catch (err) {
    console.error('Embed capture failed:', err);
    return [];
  }
}
```

---

## 8. File Structure

```
extension/src/
|-- embeds/
|   |-- types.ts              # Core interfaces and types
|   |-- providers/
|   |   |-- index.ts          # Provider registry and built-in providers
|   |-- detector.ts           # detectEmbeds() function
|   |-- preparer.ts           # scroll/wait logic
|   |-- capturer.ts           # screenshot coordination
|   |-- integrator.ts         # Turndown rules for markdown
|-- content.ts                # Modified to integrate embed capture
|-- background.ts             # Add CAPTURE_EMBED handler
|-- types/
    |-- index.ts              # Extended message types
```

---

## 9. Implementation Phases

### Phase 1: Types and Provider Registry (Est: 2 hours)

| Task | File | Description |
|------|------|-------------|
| 1.1 | `embeds/types.ts` | Create core interfaces |
| 1.2 | `embeds/providers/index.ts` | Implement registry class |
| 1.3 | `embeds/providers/index.ts` | Add built-in providers |
| 1.4 | `types/index.ts` | Add CAPTURE_EMBED message types |

### Phase 2: Detection and Preparation (Est: 3 hours)

| Task | File | Description |
|------|------|-------------|
| 2.1 | `embeds/detector.ts` | Implement detectEmbeds() |
| 2.2 | `embeds/detector.ts` | Add deduplication logic |
| 2.3 | `embeds/preparer.ts` | Implement scrollIntoView |
| 2.4 | `embeds/preparer.ts` | Implement waitForSelector |

### Phase 3: Screenshot Capture (Est: 3 hours)

| Task | File | Description |
|------|------|-------------|
| 3.1 | `background.ts` | Add CAPTURE_EMBED handler |
| 3.2 | `background.ts` | Implement cropImage with OffscreenCanvas |
| 3.3 | `embeds/capturer.ts` | Implement captureEmbed |
| 3.4 | `embeds/capturer.ts` | Add timeout handling |

### Phase 4: Markdown Integration (Est: 2 hours)

| Task | File | Description |
|------|------|-------------|
| 4.1 | `embeds/integrator.ts` | Create Turndown rules |
| 4.2 | `embeds/integrator.ts` | Add fallback markdown generation |
| 4.3 | `content.ts` | Integrate into capturePage |

### Phase 5: Error Handling and Testing (Est: 2 hours)

| Task | File | Description |
|------|------|-------------|
| 5.1 | `embeds/capturer.ts` | Implement fallback cascade |
| 5.2 | All | Add safe wrappers |
| 5.3 | Tests | Unit tests for providers |
| 5.4 | Manual | Test on real pages with embeds |

---

## 10. Acceptance Criteria

| ID | Criterion | Test |
|----|-----------|------|
| AC1 | Datawrapper charts captured | Clip Le Figaro article with Datawrapper, verify PNG in media folder |
| AC2 | Flourish visualizations captured | Clip page with Flourish embed, verify capture |
| AC3 | Twitter/X posts captured | Clip article with embedded tweet, verify screenshot |
| AC4 | YouTube thumbnails captured | Clip page with YouTube embed, verify image captured |
| AC5 | Multiple providers on same page | Clip page with Twitter + Datawrapper, both captured |
| AC6 | Lazy-loaded embeds handled | Clip immediately after page load, embeds still captured |
| AC7 | Fallback to metadata on failure | Disable network mid-capture, verify link fallback in markdown |
| AC8 | Capture limits respected | Page with 15 embeds only captures first 10 |
| AC9 | Total timeout respected | Many slow embeds complete within 30s |
| AC10 | No impact on article clipping | Embed failure does not prevent markdown generation |

---

## 11. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Cross-origin iframe restrictions | Cannot detect iframe content | High | Use external selector/attribute detection only |
| Lazy-loaded embeds not ready | Capture shows placeholder | Medium | waitForSelector with configurable timeout |
| captureVisibleTab permission denied | All captures fail | Low | Graceful degradation to metadata-only |
| Large embeds exceed viewport | Cropped incorrectly | Medium | Clamp bounds to image dimensions |
| Rate limiting on many embeds | Slow captures | Low | Per-embed and total timeout limits |
| Shadow DOM encapsulation | Selectors don't match | Medium | Document common Shadow DOM patterns |
| Memory pressure on many captures | Tab crashes | Low | Process sequentially, limit total count |

---

## 12. Permissions Check

Current manifest permissions (`activeTab`, `scripting`, `<all_urls>`) should be sufficient for `captureVisibleTab()`.

If captures fail due to permission issues, the manifest may need:

```json
{
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "tabs"
  ]
}
```

The `tabs` permission enables `captureVisibleTab` on all tabs, not just the active one.

---

## 13. Dependencies

### New Files to Create

| File | Purpose |
|------|---------|
| `extension/src/embeds/types.ts` | Type definitions |
| `extension/src/embeds/providers/index.ts` | Provider registry |
| `extension/src/embeds/detector.ts` | Embed detection |
| `extension/src/embeds/preparer.ts` | Scroll/wait logic |
| `extension/src/embeds/capturer.ts` | Capture coordination |
| `extension/src/embeds/integrator.ts` | Markdown integration |

### Files to Modify

| File | Changes |
|------|---------|
| `extension/src/content.ts` | Integrate embed capture into capturePage |
| `extension/src/background.ts` | Add CAPTURE_EMBED handler |
| `extension/src/types/index.ts` | Add CAPTURE_EMBED message types |

### Browser APIs Used

| API | Permission | Purpose |
|-----|------------|---------|
| `chrome.tabs.captureVisibleTab` | `activeTab` | Screenshot capture |
| `OffscreenCanvas` | (none) | Image cropping |
| `createImageBitmap` | (none) | Image loading |
| `Element.scrollIntoView` | (none) | Scroll preparation |

---

## 14. Relationship to TS-0003

This specification depends on and extends TS-0003 (Multi-Mode Capture System):

- **Uses CAPTURE_EMBED infrastructure** defined in TS-0003 for screenshot capture
- **Extends the capture pipeline** to include embedded content alongside regular images
- **Integrates with existing Turndown processing** from TS-0003
- **Follows the same error handling patterns** (non-blocking, graceful degradation)

TS-0004 can be implemented independently but shares code and patterns with TS-0003.

---

## 15. UX Specifications

### 15.1 User Flow Analysis

#### Primary User Journey

```
User clicks extension icon
    |
    v
Popup appears (Article mode active)
    |
    v
User clicks "Clip Article"
    |
    v
[EMBED DETECTION BEGINS]
    |
    +--- User sees immediate feedback: "Preparing clip..."
    |
    +--- If embeds found: "Capturing 5 embedded items..."
    |
    +--- Progress indicator shows: "Capturing embed 2 of 5"
    |
    v
[CAPTURE COMPLETE]
    |
    v
Success message: "Clip saved with 5 embedded charts"
```

### 15.2 Progress Indication

#### Progress States

```
PHASE 1: DETECTION (0-2s)
├── Visual: Scanning icon animation
├── Text: "Detecting embedded content..."
└── Cancellable: Yes

PHASE 2: CAPTURE (variable duration)
├── Visual: Linear progress bar (per-embed)
├── Text: "Capturing chart 2 of 5..."
├── Secondary: Provider name "Datawrapper"
├── Tertiary: Elapsed time "3s / 30s timeout"
└── Cancellable: Yes (saves partial)

PHASE 3: INTEGRATION (0-1s)
├── Visual: Checkmark animation
├── Text: "Processing markdown..."
└── Cancellable: No
```

#### Progress Component

```html
<div class="capture-progress" role="status" aria-live="polite">
  <div class="phase-indicator">
    <svg class="spinner" aria-hidden="true">...</svg>
    <span class="phase-text">Capturing embedded content</span>
  </div>
  <div class="progress-container">
    <div class="progress-bar" style="width: 40%"></div>
    <span class="progress-text">2 of 5 embeds</span>
  </div>
  <div class="current-item">
    <div class="provider-badge">Datawrapper</div>
    <div class="item-status">Preparing chart...</div>
  </div>
  <button class="btn-secondary btn-sm" aria-label="Cancel and save partial clip">
    Cancel
  </button>
</div>
```

### 15.3 Error Handling UX

#### Error Severity Levels

| Level | Example | Visual | Recovery |
|-------|---------|--------|----------|
| **Level 1: Benign** | 1 of 5 embeds failed | No interruption, note in summary | Automatic fallback to link |
| **Level 2: Partial** | 3 of 5 embeds failed | Warning badge in success message | Offer retry option |
| **Level 3: Total Embed Failure** | All embeds failed | Warning message, article still saved | Retry button |
| **Level 4: Critical** | Entire clip failed | Error message with details | Retry clip |

#### Error Messages

**Level 1 (Benign):**
```
✓ Clip saved successfully
  4 of 5 embeds captured (1 fell back to link)
```

**Level 2 (Partial):**
```
⚠ Clip saved with issues
  Only 2 of 5 embeds captured successfully
  [View Details] [Retry Failed]
```

### 15.4 User Controls

#### Options Page Settings

- Enable/disable chart capture (Datawrapper, Flourish)
- Enable/disable social media capture (Twitter/X)
- Enable/disable video thumbnails (YouTube)
- Maximum embeds per page (1-20, default 10)
- Timeout per embed (1-10s, default 5s)

#### During-Capture Controls

- **Skip Current**: Skip hanging embed, continue with next
- **Cancel**: Save partial results, stop processing

### 15.5 Accessibility Requirements

#### Screen Reader Announcements

| Event | Announcement |
|-------|--------------|
| Detection start | "Detected 5 embedded items for capture" |
| Progress update | "Capturing embed 2 of 5: Datawrapper chart" |
| Completion | "Clip saved successfully with 4 embeds captured" |
| Error | "Warning: 2 embeds failed to capture. Article text saved." |

#### ARIA Implementation

```html
<!-- Progress bar -->
<div
  role="progressbar"
  aria-valuenow="40"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Capturing embeds: 2 of 5 complete"
>
  <div class="progress-bar" style="width: 40%"></div>
</div>

<!-- Status messages -->
<div role="status" aria-live="polite" aria-atomic="true">
  <!-- Dynamic content -->
</div>
```

#### Keyboard Navigation

| Key | Context | Action |
|-----|---------|--------|
| `Escape` | During capture | Cancel, save partial |
| `Tab` | Progress UI | Navigate to cancel button |
| `Enter` | Retry button | Retry failed embeds |

### 15.6 Additional Types Required

```typescript
interface EmbedCaptureProgress {
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

interface EmbedCaptureResult {
  captured: CapturedEmbed[];
  failed: FailedEmbed[];
  duration: number;
  cancelled: boolean;
}

interface FailedEmbed {
  embed: DetectedEmbed;
  error: string;
  errorType: 'timeout' | 'permission' | 'network' | 'unknown';
  retryable: boolean;
}
```

---

## 16. UI Specifications

### 16.1 Embed Highlight Overlay

Visual feedback when embeds are detected and being captured.

```css
.embed-highlight {
  position: absolute;
  pointer-events: none;
  border: 2px solid var(--primary-500);
  background: var(--primary-50);
  opacity: 0.3;
  border-radius: var(--rounded-md);
  box-shadow: 0 0 0 4px var(--primary-100);
  z-index: 2147483646;
  transition: opacity 150ms ease-out;
}

.embed-highlight.capturing {
  animation: pulse-border 1.2s ease-in-out infinite;
}

@keyframes pulse-border {
  0%, 100% { border-color: var(--primary-500); }
  50% { border-color: var(--primary-600); }
}
```

### 16.2 Embed Badge

Status badge overlay on each embed.

```css
.embed-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: var(--rounded-full);
  box-shadow: var(--shadow-md);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  display: flex;
  align-items: center;
  gap: 4px;
  backdrop-filter: blur(8px);
}

.embed-badge.processing { color: var(--primary-600); }
.embed-badge.success { color: var(--success-700); }
.embed-badge.error { color: var(--error-700); }
```

### 16.3 Popup Embed Panel

Expandable panel showing detected embeds.

```css
.embed-panel {
  border-top: 1px solid var(--neutral-200);
  padding: 12px 0;
  margin-top: 12px;
}

.embed-list {
  max-height: 0;
  overflow: hidden;
  transition: max-height 200ms ease-out;
}

.embed-panel.expanded .embed-list {
  max-height: 300px;
  overflow-y: auto;
}

.embed-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px var(--space-4);
  border-radius: var(--rounded-md);
}

.embed-thumbnail {
  width: 48px;
  height: 48px;
  border-radius: var(--rounded-sm);
  background: var(--neutral-200);
}

.embed-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--neutral-900);
}

.embed-source {
  font-size: var(--text-xs);
  color: var(--neutral-500);
}
```

### 16.4 Error Placeholder

Visual placeholder for failed embeds in the output.

```css
.embed-error-placeholder {
  width: 100%;
  padding: 24px;
  border: 2px dashed var(--error-300);
  border-radius: var(--rounded-lg);
  background: var(--error-50);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}

.embed-error-title {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--error-700);
}

.embed-retry-btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid var(--neutral-300);
  border-radius: var(--rounded-lg);
  font-size: var(--text-sm);
  cursor: pointer;
}
```

### 16.5 Icons Required

| Icon | Usage |
|------|-------|
| `embed-chart` | Chart embeds (Datawrapper, Flourish) |
| `embed-social` | Social media (Twitter/X) |
| `embed-video` | Video (YouTube) |
| `embed-generic` | Unknown embeds |
| `capture-success` | Checkmark for success |
| `capture-error` | X for failure |
| `retry` | Circular arrow |

### 16.6 Dark Mode

```css
@media (prefers-color-scheme: dark) {
  .embed-highlight {
    background: rgba(59, 130, 246, 0.15);
  }

  .embed-badge {
    background: rgba(31, 41, 55, 0.95);
  }

  .embed-panel {
    border-top-color: var(--neutral-700);
  }

  .embed-title {
    color: var(--neutral-100);
  }

  .embed-error-placeholder {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
  }
}
```

### 16.7 Animation Guidelines

| Animation | Duration | Easing |
|-----------|----------|--------|
| Highlight pulse | 1.2s | ease-in-out, infinite |
| Progress bar | 300ms | ease-out |
| Badge appear | 200ms | ease-out |
| Success checkmark | 400ms | ease-out |
| Error shake | 300ms | ease |

All animations respect `prefers-reduced-motion: reduce`.

---

## 17. Updated Acceptance Criteria

| ID | Criterion | Test |
|----|-----------|------|
| AC1 | Datawrapper charts detected and captured | Clip page with Datawrapper iframe |
| AC2 | Flourish visualizations captured | Clip page with Flourish embed |
| AC3 | Twitter/X posts captured as images | Clip page with embedded tweet |
| AC4 | YouTube thumbnails captured | Clip page with YouTube embed |
| AC5 | Generic iframes handled | Clip page with unknown iframe |
| AC6 | Fallback to metadata on capture failure | Simulate timeout, verify link preserved |
| AC7 | Maximum 10 embeds limit enforced | Page with 20 embeds only captures 10 |
| AC8 | 30s total timeout respected | Many slow embeds hit timeout gracefully |
| AC9 | Failed embeds don't break article clip | Embed failure, article still saves |
| AC10 | Provider registry extensible | Add custom provider programmatically |
| AC11 | Progress visible within 100ms | Button click shows immediate feedback |
| AC12 | Each embed shows capture feedback | Progress updates per embed |
| AC13 | Failed embeds show retry option | Warning message with retry button |
| AC14 | Screen reader announces progress | Test with VoiceOver/NVDA |
| AC15 | Keyboard navigation functional | Tab to cancel, Escape to abort |
