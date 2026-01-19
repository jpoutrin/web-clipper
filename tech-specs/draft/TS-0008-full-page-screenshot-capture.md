# TS-0008: Full Page Screenshot Capture

## Metadata

| Field | Value |
|-------|-------|
| Tech Spec ID | TS-0008 |
| Title | Full Page Screenshot Capture |
| Status | DRAFT |
| Author | |
| Created | 2026-01-17 |
| Last Updated | 2026-01-17 |
| Related RFC | - |
| Phase | 4 - Extended Capture |
| Reviews | CTO Architecture, UX Expert, UI Product Expert |
| Depends On | TS-0003, TS-0007 |
| Location | tech-specs/draft/TS-0008-full-page-screenshot-capture.md |

## Executive Summary

Extend the Web Clipper extension to support full page screenshot capture, allowing users to capture the entire scrollable content of a webpage in a single image. This feature addresses a common use case where users need to capture long articles, documentation pages, or any content that extends beyond the visible viewport. The implementation uses a scroll-and-stitch approach that works within standard extension permissions without requiring the invasive `debugger` permission.

## Why Not Use Native Browser API?

Chrome DevTools Protocol (CDP) offers `Page.captureScreenshot({ fullPage: true })` which would be ideal, but extensions face significant barriers:

| Issue | Impact |
|-------|--------|
| Requires `debugger` permission | Very powerful permission that raises security concerns |
| Warning banner | Chrome displays "Extension is debugging this browser" which alarms users |
| Enterprise policies | Many organizations block debugger access entirely |
| User trust erosion | Users may uninstall extensions that appear to "debug" their browser |

The **scroll-and-stitch** approach only needs `activeTab` permission, which users are comfortable granting.

## Scope

| Component | Included | Notes |
|-----------|----------|-------|
| Scroll-and-Stitch Capture | Yes | Core algorithm for full page capture |
| Progress Indicator | Yes | Shows capture progress for long pages |
| Fixed Element Handling | Yes | Hide/restore sticky headers/footers |
| Lazy-Load Triggering | Yes | Scroll to load content before capture |
| Image Stitching | Yes | Combine captures into single image |
| Memory Management | Yes | Handle very long pages gracefully |
| Cancel Support | Yes | Allow user to abort long captures |
| Popup Integration | Yes | Add "Full Page" mode button |
| Infinite Scroll Detection | Partial | Basic detection with configurable max height |
| PDF Export | No | Future consideration |
| Animated Content Handling | No | Static capture only |

---

## 1. Feature Overview

### 1.1 User Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER JOURNEY                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. INITIATE              2. CAPTURE                    3. COMPLETE         │
│  ┌──────────┐            ┌──────────────┐              ┌──────────┐         │
│  │  Click   │            │   Auto-scan  │              │  Review  │         │
│  │Full Page │ ──────────>│    Page      │ ───────────> │    &     │         │
│  │  Mode    │            │  (progress)  │              │   Save   │         │
│  └──────────┘            └──────────────┘              └──────────┘         │
│       │                        │                             │               │
│       ▼                        ▼                             ▼               │
│  Popup shows             Page scrolls automatically    Single stitched      │
│  progress overlay        Screenshots taken at          image saved          │
│                          each scroll position          to server            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Capture Process Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SCROLL-AND-STITCH PROCESS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 1: Pre-scan          STEP 2: Capture Loop         STEP 3: Stitch      │
│  ┌──────────────┐          ┌──────────────┐            ┌──────────────┐     │
│  │ ┌──────────┐ │          │ ┌──────────┐ │            │ ┌──────────┐ │     │
│  │ │ VIEWPORT │ │   ──>    │ │ Capture 1│ │   ──>      │ │          │ │     │
│  │ └──────────┘ │          │ ├──────────┤ │            │ │ Combined │ │     │
│  │ ┌──────────┐ │          │ │ Capture 2│ │            │ │  Image   │ │     │
│  │ │ HIDDEN   │ │          │ ├──────────┤ │            │ │          │ │     │
│  │ │ CONTENT  │ │          │ │ Capture 3│ │            │ │          │ │     │
│  │ │          │ │          │ ├──────────┤ │            │ │          │ │     │
│  │ │          │ │          │ │ Capture 4│ │            │ │          │ │     │
│  │ └──────────┘ │          │ └──────────┘ │            │ └──────────┘ │     │
│  └──────────────┘          └──────────────┘            └──────────────┘     │
│                                                                              │
│  - Measure total height    - Scroll to position        - Create canvas      │
│  - Detect fixed elements   - Hide fixed elements       - Draw each capture  │
│  - Pre-scroll for lazy     - Capture viewport          - Handle overlaps    │
│    content loading         - Store in memory           - Export final image │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Progress UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROGRESS OVERLAY                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │                    ┌─────────────────────────┐                         │ │
│  │                    │                         │                         │ │
│  │                    │    📷 Capturing Page    │                         │ │
│  │                    │                         │                         │ │
│  │                    │    ████████░░░░  67%    │                         │ │
│  │                    │                         │                         │ │
│  │                    │    Section 4 of 6       │                         │ │
│  │                    │                         │                         │ │
│  │                    │      [ Cancel ]         │                         │ │
│  │                    │                         │                         │ │
│  │                    └─────────────────────────┘                         │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Type Definitions

### 2.1 Full Page Capture Types

**src/types/index.ts** (additions):

```typescript
// Full page capture configuration
export interface FullPageCaptureConfig {
  maxHeight: number;              // Maximum page height to capture (pixels)
  maxCaptures: number;            // Maximum number of viewport captures
  scrollDelay: number;            // Delay between scroll and capture (ms)
  overlapPx: number;              // Overlap between captures to avoid seams
  hideFixedElements: boolean;     // Hide sticky/fixed headers during capture
  triggerLazyLoad: boolean;       // Pre-scroll to trigger lazy loading
  lazyLoadDelay: number;          // Wait time for lazy content to load (ms)
}

// Default configuration
export const DEFAULT_FULL_PAGE_CONFIG: FullPageCaptureConfig = {
  maxHeight: 32000,               // ~32k pixels max (browser canvas limit considerations)
  maxCaptures: 50,                // Reasonable limit for memory
  scrollDelay: 100,               // Allow repaints
  overlapPx: 5,                   // Small overlap to prevent seam artifacts
  hideFixedElements: true,
  triggerLazyLoad: true,
  lazyLoadDelay: 500
};

// Capture state for progress tracking
export type FullPageCaptureState =
  | 'preparing'       // Measuring page, detecting fixed elements
  | 'loading'         // Pre-scrolling to trigger lazy content
  | 'capturing'       // Taking viewport screenshots
  | 'stitching'       // Combining captures into single image
  | 'complete'        // Capture finished successfully
  | 'cancelled'       // User cancelled
  | 'error';          // Capture failed

// Progress event for UI updates
export interface FullPageCaptureProgress {
  state: FullPageCaptureState;
  currentCapture: number;
  totalCaptures: number;
  percentComplete: number;
  error?: string;
}

// Individual capture segment
export interface CaptureSegment {
  dataUrl: string;
  offsetY: number;          // Y position in final image
  width: number;
  height: number;
}

// Full page capture result
export interface FullPageScreenshotResult {
  title: string;
  url: string;
  image: {
    filename: string;
    data: string;           // base64
    width: number;
    height: number;
    format: 'png' | 'jpeg';
  };
  pageHeight: number;       // Original page height
  captureCount: number;     // Number of segments captured
  duration: number;         // Total capture time (ms)
}

// Fixed element info for hiding/restoring
export interface FixedElementInfo {
  element: HTMLElement;
  originalPosition: string;
  originalVisibility: string;
  originalZIndex: string;
}

// Extended message types
export type MessageType =
  | 'GET_STATE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'FETCH_CONFIG'
  | 'CAPTURE_PAGE'
  | 'CAPTURE_SCREENSHOT'
  | 'CAPTURE_AREA_SCREENSHOT'
  | 'CAPTURE_FULL_PAGE'           // New: Initiate full page capture
  | 'FULL_PAGE_PROGRESS'          // New: Progress updates
  | 'FULL_PAGE_CANCEL'            // New: Cancel capture
  | 'SUBMIT_CLIP'
  | 'AUTH_CALLBACK'
  | 'DEV_LOGIN';

// Extended ClipMode
export type ClipMode =
  | 'article'
  | 'bookmark'
  | 'screenshot'
  | 'area-screenshot'
  | 'full-page'           // New
  | 'selection'
  | 'fullpage';
```

---

## 3. Core Algorithm

### 3.1 Full Page Capture Class

**src/capture/full-page-capture.ts**:

```typescript
import {
  FullPageCaptureConfig,
  DEFAULT_FULL_PAGE_CONFIG,
  FullPageCaptureState,
  FullPageCaptureProgress,
  CaptureSegment,
  FixedElementInfo
} from '../types';

export class FullPageCapture {
  private config: FullPageCaptureConfig;
  private state: FullPageCaptureState = 'preparing';
  private cancelled = false;
  private fixedElements: FixedElementInfo[] = [];
  private originalScrollPosition: number = 0;

  private onProgress: (progress: FullPageCaptureProgress) => void;

  constructor(
    onProgress: (progress: FullPageCaptureProgress) => void,
    config: Partial<FullPageCaptureConfig> = {}
  ) {
    this.onProgress = onProgress;
    this.config = { ...DEFAULT_FULL_PAGE_CONFIG, ...config };
  }

  /**
   * Execute full page capture.
   * Returns array of capture segments to be stitched by background script.
   */
  async capture(): Promise<{
    segments: CaptureSegment[];
    totalHeight: number;
    viewportWidth: number;
  }> {
    try {
      // Save original scroll position
      this.originalScrollPosition = window.scrollY;

      // Phase 1: Preparation
      this.updateState('preparing', 0, 1);
      const pageMetrics = await this.measurePage();

      if (this.cancelled) throw new Error('Cancelled');

      // Phase 2: Trigger lazy loading (optional)
      if (this.config.triggerLazyLoad) {
        this.updateState('loading', 0, 1);
        await this.triggerLazyLoading(pageMetrics.scrollHeight);
        if (this.cancelled) throw new Error('Cancelled');
      }

      // Re-measure after lazy load
      const finalMetrics = await this.measurePage();

      // Calculate capture segments
      const totalCaptures = Math.min(
        Math.ceil(finalMetrics.scrollHeight / (finalMetrics.viewportHeight - this.config.overlapPx)),
        this.config.maxCaptures
      );

      // Phase 3: Hide fixed elements
      if (this.config.hideFixedElements) {
        this.hideFixedElements();
      }

      // Phase 4: Capture loop
      this.updateState('capturing', 0, totalCaptures);
      const segments: CaptureSegment[] = [];

      for (let i = 0; i < totalCaptures; i++) {
        if (this.cancelled) {
          this.restoreFixedElements();
          throw new Error('Cancelled');
        }

        const offsetY = i * (finalMetrics.viewportHeight - this.config.overlapPx);

        // Don't scroll past the bottom
        const scrollTo = Math.min(offsetY, finalMetrics.scrollHeight - finalMetrics.viewportHeight);

        // Scroll to position
        window.scrollTo(0, scrollTo);

        // Wait for repaint
        await this.delay(this.config.scrollDelay);

        // Request capture from background script
        const dataUrl = await this.requestViewportCapture();

        segments.push({
          dataUrl,
          offsetY: scrollTo,
          width: finalMetrics.viewportWidth,
          height: finalMetrics.viewportHeight
        });

        this.updateState('capturing', i + 1, totalCaptures);
      }

      // Restore fixed elements
      this.restoreFixedElements();

      // Restore scroll position
      window.scrollTo(0, this.originalScrollPosition);

      return {
        segments,
        totalHeight: Math.min(finalMetrics.scrollHeight, this.config.maxHeight),
        viewportWidth: finalMetrics.viewportWidth
      };

    } catch (error) {
      this.restoreFixedElements();
      window.scrollTo(0, this.originalScrollPosition);
      throw error;
    }
  }

  /**
   * Cancel the capture process.
   */
  cancel(): void {
    this.cancelled = true;
    this.updateState('cancelled', 0, 0);
  }

  /**
   * Measure page dimensions.
   */
  private async measurePage(): Promise<{
    scrollHeight: number;
    viewportHeight: number;
    viewportWidth: number;
  }> {
    return {
      scrollHeight: Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      ),
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth
    };
  }

  /**
   * Pre-scroll the page to trigger lazy-loaded content.
   */
  private async triggerLazyLoading(totalHeight: number): Promise<void> {
    const viewportHeight = window.innerHeight;
    const scrollSteps = Math.ceil(totalHeight / viewportHeight);

    for (let i = 0; i <= scrollSteps; i++) {
      if (this.cancelled) return;

      window.scrollTo(0, i * viewportHeight);
      await this.delay(this.config.lazyLoadDelay);
    }

    // Scroll back to top
    window.scrollTo(0, 0);
    await this.delay(this.config.scrollDelay);
  }

  /**
   * Find and hide fixed/sticky positioned elements.
   */
  private hideFixedElements(): void {
    const allElements = document.querySelectorAll('*');

    allElements.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;

      const style = window.getComputedStyle(el);
      const position = style.position;

      if (position === 'fixed' || position === 'sticky') {
        this.fixedElements.push({
          element: el,
          originalPosition: el.style.position,
          originalVisibility: el.style.visibility,
          originalZIndex: el.style.zIndex
        });

        // Hide the element
        el.style.visibility = 'hidden';
      }
    });
  }

  /**
   * Restore fixed/sticky elements to original state.
   */
  private restoreFixedElements(): void {
    this.fixedElements.forEach(({ element, originalPosition, originalVisibility, originalZIndex }) => {
      element.style.position = originalPosition;
      element.style.visibility = originalVisibility;
      element.style.zIndex = originalZIndex;
    });

    this.fixedElements = [];
  }

  /**
   * Request viewport capture from background script.
   */
  private async requestViewportCapture(): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'CAPTURE_VIEWPORT_FOR_FULLPAGE' },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.dataUrl);
          }
        }
      );
    });
  }

  /**
   * Update capture state and notify progress callback.
   */
  private updateState(
    state: FullPageCaptureState,
    current: number,
    total: number
  ): void {
    this.state = state;
    this.onProgress({
      state,
      currentCapture: current,
      totalCaptures: total,
      percentComplete: total > 0 ? Math.round((current / total) * 100) : 0
    });
  }

  /**
   * Promise-based delay.
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 3.2 Image Stitching Utility

**src/capture/stitch-captures.ts**:

```typescript
import { CaptureSegment } from '../types';

export interface StitchConfig {
  maxSizeBytes: number;
  maxDimensionPx: number;
}

/**
 * Stitch multiple viewport captures into a single full-page image.
 * Runs in background script using OffscreenCanvas.
 */
export async function stitchCaptures(
  segments: CaptureSegment[],
  totalHeight: number,
  viewportWidth: number,
  config: StitchConfig
): Promise<{ data: string; width: number; height: number; format: 'png' | 'jpeg' }> {
  // Enforce maximum dimensions
  const finalHeight = Math.min(totalHeight, config.maxDimensionPx);
  const finalWidth = Math.min(viewportWidth, config.maxDimensionPx);

  // Calculate scale factor if we need to resize
  const scaleX = finalWidth / viewportWidth;
  const scaleY = finalHeight / totalHeight;
  const scale = Math.min(scaleX, scaleY, 1); // Never upscale

  const outputWidth = Math.round(viewportWidth * scale);
  const outputHeight = Math.round(totalHeight * scale);

  // Create output canvas
  const canvas = new OffscreenCanvas(outputWidth, outputHeight);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Enable high-quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw each segment
  for (const segment of segments) {
    const img = await loadImage(segment.dataUrl);

    const destY = Math.round(segment.offsetY * scale);
    const destWidth = Math.round(segment.width * scale);
    const destHeight = Math.round(segment.height * scale);

    // Clip to canvas bounds (last segment may extend beyond)
    const clippedHeight = Math.min(destHeight, outputHeight - destY);

    if (clippedHeight > 0) {
      ctx.drawImage(
        img,
        0, 0, segment.width, (clippedHeight / scale),  // Source rect
        0, destY, destWidth, clippedHeight              // Dest rect
      );
    }
  }

  // Convert to blob with compression
  const result = await compressToBlob(canvas, config.maxSizeBytes);

  return {
    data: result.base64,
    width: outputWidth,
    height: outputHeight,
    format: result.format
  };
}

/**
 * Load an image from a data URL.
 */
async function loadImage(dataUrl: string): Promise<ImageBitmap> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return createImageBitmap(blob);
}

/**
 * Compress canvas to blob, trying PNG first, then JPEG with quality reduction.
 */
async function compressToBlob(
  canvas: OffscreenCanvas,
  maxSizeBytes: number
): Promise<{ blob: Blob; base64: string; format: 'png' | 'jpeg' }> {
  // Try PNG first
  let blob = await canvas.convertToBlob({ type: 'image/png' });

  if (blob.size <= maxSizeBytes) {
    const base64 = await blobToBase64(blob);
    return { blob, base64, format: 'png' };
  }

  // Fall back to JPEG with decreasing quality
  let quality = 0.92;
  while (quality > 0.3) {
    blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });

    if (blob.size <= maxSizeBytes) {
      const base64 = await blobToBase64(blob);
      return { blob, base64, format: 'jpeg' };
    }

    quality -= 0.1;
  }

  // Return best effort JPEG
  const base64 = await blobToBase64(blob);
  return { blob, base64, format: 'jpeg' };
}

/**
 * Convert blob to base64 string.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to convert blob to base64'));
    reader.readAsDataURL(blob);
  });
}
```

---

## 4. Progress Overlay Component

### 4.1 Progress Overlay Class

**src/capture/full-page-progress-overlay.ts**:

```typescript
import { FullPageCaptureProgress, FullPageCaptureState } from '../types';

export class FullPageProgressOverlay {
  private shadowHost: HTMLDivElement;
  private shadowRoot: ShadowRoot;
  private progressBar: HTMLDivElement;
  private statusText: HTMLSpanElement;
  private sectionText: HTMLSpanElement;
  private percentText: HTMLSpanElement;

  private onCancel: () => void;

  constructor(onCancel: () => void) {
    this.onCancel = onCancel;

    // Create shadow DOM host
    this.shadowHost = this.createShadowHost();
    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'closed' });

    // Build UI
    this.shadowRoot.innerHTML = this.getTemplate();

    // Get references
    this.progressBar = this.shadowRoot.getElementById('progress-fill') as HTMLDivElement;
    this.statusText = this.shadowRoot.getElementById('status-text') as HTMLSpanElement;
    this.sectionText = this.shadowRoot.getElementById('section-text') as HTMLSpanElement;
    this.percentText = this.shadowRoot.getElementById('percent-text') as HTMLSpanElement;

    // Attach cancel handler
    const cancelBtn = this.shadowRoot.getElementById('cancel-btn');
    cancelBtn?.addEventListener('click', () => this.onCancel());

    // Attach to DOM
    document.body.appendChild(this.shadowHost);

    // Announce to screen readers
    this.announce('Full page capture started. Please wait.');
  }

  private createShadowHost(): HTMLDivElement {
    const host = document.createElement('div');
    host.id = 'web-clipper-fullpage-progress-host';
    host.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 2147483647 !important;
      pointer-events: auto !important;
    `;
    return host;
  }

  private getTemplate(): string {
    return `
      <style>
        * {
          box-sizing: border-box;
        }

        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal {
          background: white;
          border-radius: 12px;
          padding: 32px;
          min-width: 320px;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 8px;
        }

        .status {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 20px;
        }

        .progress-container {
          background: #e5e7eb;
          border-radius: 6px;
          height: 8px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .progress-fill {
          height: 100%;
          background: #3b82f6;
          border-radius: 6px;
          transition: width 0.2s ease;
          width: 0%;
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 20px;
        }

        .cancel-btn {
          padding: 10px 24px;
          background: #f3f4f6;
          color: #374151;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .cancel-btn:hover {
          background: #e5e7eb;
        }

        .cancel-btn:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        @media (prefers-color-scheme: dark) {
          .modal {
            background: #1f2937;
          }

          .title {
            color: #f9fafb;
          }

          .status {
            color: #9ca3af;
          }

          .progress-container {
            background: #374151;
          }

          .progress-info {
            color: #9ca3af;
          }

          .cancel-btn {
            background: #374151;
            color: #f3f4f6;
          }

          .cancel-btn:hover {
            background: #4b5563;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .progress-fill {
            transition: none;
          }
        }
      </style>

      <div class="overlay">
        <div class="modal" role="dialog" aria-labelledby="dialog-title" aria-describedby="dialog-status">
          <div class="icon" aria-hidden="true">📷</div>
          <div id="dialog-title" class="title">Capturing Page</div>
          <div id="dialog-status" class="status">
            <span id="status-text">Preparing...</span>
          </div>
          <div class="progress-container">
            <div id="progress-fill" class="progress-fill" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
          </div>
          <div class="progress-info">
            <span id="section-text">Section 0 of 0</span>
            <span id="percent-text">0%</span>
          </div>
          <button id="cancel-btn" class="cancel-btn">Cancel</button>
          <div id="announcer" class="sr-only" role="status" aria-live="polite"></div>
        </div>
      </div>
    `;
  }

  /**
   * Update progress display.
   */
  update(progress: FullPageCaptureProgress): void {
    const { state, currentCapture, totalCaptures, percentComplete } = progress;

    // Update progress bar
    this.progressBar.style.width = `${percentComplete}%`;
    this.progressBar.setAttribute('aria-valuenow', String(percentComplete));

    // Update text
    this.percentText.textContent = `${percentComplete}%`;
    this.sectionText.textContent = `Section ${currentCapture} of ${totalCaptures}`;

    // Update status text based on state
    const statusMessages: Record<FullPageCaptureState, string> = {
      preparing: 'Analyzing page...',
      loading: 'Loading content...',
      capturing: 'Capturing sections...',
      stitching: 'Assembling image...',
      complete: 'Complete!',
      cancelled: 'Cancelled',
      error: 'Error occurred'
    };

    this.statusText.textContent = statusMessages[state] || 'Processing...';

    // Announce significant changes
    if (state === 'capturing' && currentCapture % 5 === 0) {
      this.announce(`Captured ${currentCapture} of ${totalCaptures} sections.`);
    }
  }

  /**
   * Show completion state.
   */
  showComplete(): void {
    this.statusText.textContent = 'Complete!';
    this.progressBar.style.width = '100%';
    this.announce('Full page capture complete.');

    // Auto-close after brief delay
    setTimeout(() => this.destroy(), 1000);
  }

  /**
   * Show error state.
   */
  showError(message: string): void {
    this.statusText.textContent = `Error: ${message}`;
    this.progressBar.style.background = '#ef4444';
    this.announce(`Capture failed: ${message}`);
  }

  /**
   * Announce to screen readers.
   */
  private announce(message: string): void {
    const announcer = this.shadowRoot.getElementById('announcer');
    if (announcer) {
      announcer.textContent = message;
    }
  }

  /**
   * Remove overlay from DOM.
   */
  destroy(): void {
    this.shadowHost.remove();
  }
}
```

---

## 5. Background Script Integration

### 5.1 Message Handler Updates

**src/background.ts** (additions):

```typescript
import { stitchCaptures } from './capture/stitch-captures';
import {
  FullPageScreenshotResult,
  CaptureSegment,
  FullPageCaptureProgress
} from './types';

// Pending full page capture state
let pendingFullPageCapture: {
  tabId: number;
  windowId: number;
  segments: CaptureSegment[];
} | null = null;

// Add to message handler switch statement
case 'CAPTURE_FULL_PAGE':
  return initiateFullPageCapture();

case 'CAPTURE_VIEWPORT_FOR_FULLPAGE':
  return captureViewportForFullPage();

case 'FULL_PAGE_SEGMENTS_READY':
  return handleFullPageSegmentsReady(message.payload);

case 'FULL_PAGE_CANCEL':
  return handleFullPageCancel();

/**
 * Initiate full page capture by sending message to content script.
 */
async function initiateFullPageCapture(): Promise<{ success: boolean } | { error: string }> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id || !tab.windowId) {
      return { error: 'No active tab' };
    }

    // Store pending capture state
    pendingFullPageCapture = {
      tabId: tab.id,
      windowId: tab.windowId,
      segments: []
    };

    // Tell content script to start capture
    await chrome.tabs.sendMessage(tab.id, {
      type: 'START_FULL_PAGE_CAPTURE'
    });

    return { success: true };
  } catch (err) {
    pendingFullPageCapture = null;
    return { error: `Failed to initiate full page capture: ${err}` };
  }
}

/**
 * Capture current viewport for full page capture.
 * Called repeatedly by content script during capture loop.
 */
async function captureViewportForFullPage(): Promise<{ dataUrl: string } | { error: string }> {
  if (!pendingFullPageCapture) {
    return { error: 'No pending full page capture' };
  }

  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(
      pendingFullPageCapture.windowId,
      { format: 'png', quality: 100 }
    );

    return { dataUrl };
  } catch (err) {
    return { error: `Viewport capture failed: ${err}` };
  }
}

/**
 * Handle completed capture segments from content script.
 * Stitch them together and return final image.
 */
async function handleFullPageSegmentsReady(
  payload: {
    segments: CaptureSegment[];
    totalHeight: number;
    viewportWidth: number;
  }
): Promise<FullPageScreenshotResult | { error: string }> {
  if (!pendingFullPageCapture) {
    return { error: 'No pending full page capture' };
  }

  const { tabId } = pendingFullPageCapture;
  pendingFullPageCapture = null;

  try {
    const startTime = Date.now();

    // Get tab info
    const tab = await chrome.tabs.get(tabId);

    // Get config
    const config = serverConfig?.images || {
      maxSizeBytes: 10485760,  // 10MB for full page
      maxDimensionPx: 16384   // Higher limit for full page
    };

    // Stitch captures together
    const stitched = await stitchCaptures(
      payload.segments,
      payload.totalHeight,
      payload.viewportWidth,
      config
    );

    const result: FullPageScreenshotResult = {
      title: tab.title || 'Full Page Screenshot',
      url: tab.url || '',
      image: {
        filename: `full-page-${Date.now()}.${stitched.format}`,
        data: stitched.data,
        width: stitched.width,
        height: stitched.height,
        format: stitched.format
      },
      pageHeight: payload.totalHeight,
      captureCount: payload.segments.length,
      duration: Date.now() - startTime
    };

    return result;
  } catch (err) {
    return { error: `Failed to stitch captures: ${err}` };
  }
}

/**
 * Handle full page capture cancellation.
 */
function handleFullPageCancel(): { cancelled: boolean } {
  pendingFullPageCapture = null;
  return { cancelled: true };
}
```

---

## 6. Content Script Integration

### 6.1 Content Script Message Handler

**src/content.ts** (additions):

```typescript
import { FullPageCapture } from './capture/full-page-capture';
import { FullPageProgressOverlay } from './capture/full-page-progress-overlay';

let fullPageCapture: FullPageCapture | null = null;
let fullPageProgressOverlay: FullPageProgressOverlay | null = null;

// Add to message handler
case 'START_FULL_PAGE_CAPTURE':
  startFullPageCapture();
  return { started: true };

case 'CANCEL_FULL_PAGE_CAPTURE':
  cancelFullPageCapture();
  return { cancelled: true };

/**
 * Start full page capture process.
 */
async function startFullPageCapture(): Promise<void> {
  // Clean up any existing capture
  cleanupFullPageCapture();

  // Create progress overlay
  fullPageProgressOverlay = new FullPageProgressOverlay(() => {
    cancelFullPageCapture();
  });

  // Create capture instance
  fullPageCapture = new FullPageCapture((progress) => {
    fullPageProgressOverlay?.update(progress);
  });

  try {
    // Execute capture
    const result = await fullPageCapture.capture();

    // Update overlay to stitching state
    fullPageProgressOverlay?.update({
      state: 'stitching',
      currentCapture: result.segments.length,
      totalCaptures: result.segments.length,
      percentComplete: 100
    });

    // Send segments to background for stitching
    const response = await chrome.runtime.sendMessage({
      type: 'FULL_PAGE_SEGMENTS_READY',
      payload: result
    });

    if ('error' in response) {
      throw new Error(response.error);
    }

    // Show completion
    fullPageProgressOverlay?.showComplete();

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (message !== 'Cancelled') {
      fullPageProgressOverlay?.showError(message);
      console.error('Full page capture failed:', err);
    }
  } finally {
    fullPageCapture = null;
    // Overlay destroys itself after showing result
  }
}

/**
 * Cancel full page capture.
 */
function cancelFullPageCapture(): void {
  fullPageCapture?.cancel();
  fullPageCapture = null;

  fullPageProgressOverlay?.destroy();
  fullPageProgressOverlay = null;

  chrome.runtime.sendMessage({ type: 'FULL_PAGE_CANCEL' });
}

/**
 * Clean up any existing full page capture state.
 */
function cleanupFullPageCapture(): void {
  if (fullPageCapture) {
    fullPageCapture.cancel();
    fullPageCapture = null;
  }

  if (fullPageProgressOverlay) {
    fullPageProgressOverlay.destroy();
    fullPageProgressOverlay = null;
  }
}
```

---

## 7. Popup Integration

### 7.1 Mode Button Addition

**src/popup/popup.html** (additions to mode selector):

```html
<button class="mode-btn" data-mode="full-page">
  <span class="icon" aria-hidden="true">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M3 15h18"/>
      <path d="M12 3v18" stroke-dasharray="2 2"/>
    </svg>
  </span>
  <span class="label">Full Page</span>
</button>
```

### 7.2 Mode Handler

**src/popup/popup.ts** (additions):

```typescript
case 'full-page':
  // Start full page capture
  const fullPageResponse = await chrome.runtime.sendMessage({
    type: 'CAPTURE_FULL_PAGE'
  });

  if ('error' in fullPageResponse) {
    showMessage(fullPageResponse.error, 'error');
    return;
  }

  // Close popup - progress shown on page
  window.close();
  return;
```

---

## 8. Handling Edge Cases

### 8.1 Infinite Scroll Detection

```typescript
/**
 * Detect if page appears to be infinite scroll.
 * Returns true if page height keeps growing during scroll.
 */
async function detectInfiniteScroll(): Promise<boolean> {
  const initialHeight = document.documentElement.scrollHeight;

  // Scroll near bottom
  window.scrollTo(0, initialHeight - window.innerHeight);
  await delay(1000);

  const newHeight = document.documentElement.scrollHeight;

  // Reset scroll
  window.scrollTo(0, 0);

  // If height grew significantly, likely infinite scroll
  return newHeight > initialHeight * 1.1;
}
```

### 8.2 Memory Management

```typescript
/**
 * Check if we can safely capture more segments.
 * Uses Performance API to estimate memory usage.
 */
function canCaptureMore(currentSegments: number, viewportBytes: number): boolean {
  // Estimate memory usage
  const estimatedMemoryMB = (currentSegments * viewportBytes) / (1024 * 1024);

  // Conservative limit (500MB for capture buffer)
  const maxMemoryMB = 500;

  return estimatedMemoryMB < maxMemoryMB;
}
```

### 8.3 Very Long Pages

```typescript
// In config
export const DEFAULT_FULL_PAGE_CONFIG = {
  maxHeight: 32000,      // Browser canvas height limits vary
  maxCaptures: 50,       // Prevent runaway captures
  // ...
};

// Warning for very long pages
if (pageHeight > config.maxHeight) {
  console.warn(`Page height (${pageHeight}px) exceeds max (${config.maxHeight}px). Image will be truncated.`);
}
```

---

## 9. Acceptance Criteria

| ID | Criterion | Test Method |
|----|-----------|-------------|
| AC1 | User can initiate full page capture from popup | Click "Full Page" mode, verify capture starts |
| AC2 | Progress overlay shows during capture | Verify modal with progress bar appears |
| AC3 | Progress updates in real-time | Watch percentage and section count update |
| AC4 | Cancel button stops capture | Click Cancel, verify capture aborts |
| AC5 | Fixed headers/footers not duplicated | Capture page with sticky header, verify single instance |
| AC6 | Lazy-loaded content captured | Capture page with lazy images, verify all loaded |
| AC7 | Final image is single stitched image | Verify output is one continuous image |
| AC8 | Scroll position restored after capture | Verify page returns to original scroll position |
| AC9 | Very long pages truncated gracefully | Capture 50k+ px page, verify max height enforced |
| AC10 | Memory limits respected | Capture long page, verify no crash |
| AC11 | Screen reader announces progress | Test with VoiceOver/NVDA |
| AC12 | Dark mode progress overlay | Enable dark mode, verify overlay adapts |
| AC13 | Escape key cancels capture | Press Escape during capture, verify cancellation |
| AC14 | Error state shown on failure | Simulate failure, verify error message shown |
| AC15 | Capture works on various page types | Test on news sites, docs, social media |

---

## 10. Accessibility Requirements

### 10.1 Screen Reader Behavior

| Event | Announcement |
|-------|--------------|
| Capture started | "Full page capture started. Please wait." |
| Progress update (every 5 sections) | "Captured X of Y sections." |
| Capture complete | "Full page capture complete." |
| Capture cancelled | "Full page capture cancelled." |
| Capture error | "Capture failed: [error message]" |

### 10.2 Keyboard Navigation

| Key | Action |
|-----|--------|
| Escape | Cancel capture |
| Tab | Focus cancel button |
| Enter/Space | Activate cancel button (when focused) |

---

## 11. Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Page changes during capture | Inconsistent image | Medium | Capture quickly, warn user |
| Memory exhaustion | Browser crash | Low | Enforce max segments, monitor memory |
| Fixed element detection misses elements | Duplicated content | Medium | Conservative detection, user feedback |
| Lazy load doesn't trigger | Missing content | Medium | Multiple scroll passes, configurable delay |
| Infinite scroll pages | Never-ending capture | Medium | Max height limit, detection warning |
| Canvas size limits | Truncated image | Low | Enforce max dimensions, scale down |
| Slow pages cause timeout | Failed capture | Low | No hard timeout, just segment limit |
| Cross-origin iframes | Missing content | Medium | Document limitation, capture visible only |

---

## 12. Performance Considerations

### 12.1 Timing Estimates

| Page Length | Viewport Count | Estimated Time |
|-------------|----------------|----------------|
| 2,000px (short) | 2-3 | ~1-2 seconds |
| 10,000px (medium) | 10-12 | ~5-10 seconds |
| 30,000px (long) | 30+ | ~15-30 seconds |

### 12.2 Memory Usage

| Component | Estimated Size |
|-----------|----------------|
| Single viewport capture (1920x1080) | ~8MB uncompressed |
| 10 captures in memory | ~80MB |
| Final stitched image | Varies (10-50MB) |
| Compressed output | 1-10MB typically |

---

## 13. Testing Strategy

### 13.1 Unit Tests

```typescript
describe('stitchCaptures', () => {
  it('combines multiple segments into single image', async () => {
    const segments = createMockSegments(5);
    const result = await stitchCaptures(segments, 5000, 1920, config);

    expect(result.height).toBe(5000);
    expect(result.width).toBe(1920);
  });

  it('enforces maximum dimensions', async () => {
    const segments = createMockSegments(50);
    const result = await stitchCaptures(segments, 50000, 1920, {
      maxDimensionPx: 16384,
      maxSizeBytes: 10485760
    });

    expect(result.height).toBeLessThanOrEqual(16384);
  });

  it('handles overlap correctly', async () => {
    // Verify no visible seams between segments
  });
});
```

### 13.2 Integration Tests

```typescript
describe('FullPageCapture', () => {
  it('captures all viewport segments', async () => {
    // Mock page with known height
    // Verify correct number of captures
  });

  it('hides and restores fixed elements', async () => {
    // Add fixed header
    // Capture
    // Verify header hidden during capture
    // Verify header restored after capture
  });

  it('can be cancelled mid-capture', async () => {
    // Start capture
    // Call cancel()
    // Verify cleanup
  });
});
```

### 13.3 Manual Testing Checklist

- [ ] Capture short page (single viewport)
- [ ] Capture medium page (~5 viewports)
- [ ] Capture long page (~20 viewports)
- [ ] Capture page with sticky header
- [ ] Capture page with sticky footer
- [ ] Capture page with lazy-loaded images
- [ ] Cancel capture mid-progress
- [ ] Test on high-DPI display
- [ ] Test dark mode progress overlay
- [ ] Test with screen reader
- [ ] Test memory usage on very long page
- [ ] Verify scroll position restored

---

## 14. Future Enhancements (Out of Scope)

| Feature | Description | Phase |
|---------|-------------|-------|
| PDF export | Export full page as PDF | Phase 5 |
| Selective element exclusion | Let user hide specific elements | Phase 5 |
| Animated content handling | Wait for animations to complete | Phase 5 |
| Scrollable area capture | Capture scrollable area within selection | Phase 5 |
| Multi-tab capture | Capture multiple tabs at once | Phase 6 |

---

## Implementation Tracking

Task List: tasks/TS-0008-full-page-screenshot-capture-tasks.md
Generated: 2026-01-17
Status: See task file for current progress
