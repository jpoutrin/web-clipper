# TS-0006: Full Page Stitched Screenshot

## Metadata

| Field | Value |
|-------|-------|
| Tech Spec ID | TS-0006 |
| Title | Full Page Stitched Screenshot |
| Status | DRAFT |
| Author | |
| Created | 2026-01-17 |
| Last Updated | 2026-01-17 |
| Related RFC | - |
| Phase | 3 - Advanced Capture |
| Reviews | CTO Architecture, UX Expert, UI Product Expert |
| Depends On | TS-0003 |
| Location | tech-specs/draft/TS-0006-full-page-stitched-screenshot.md |

## Executive Summary

Implement full page screenshot capture by scrolling through the entire page and stitching multiple viewport captures into a single image. This feature enables capturing content that extends beyond the visible viewport, including long-form articles, documentation pages, and scrollable interfaces. The implementation must handle fixed/sticky elements, lazy-loaded content, memory constraints, and provide progress feedback to users.

## Scope

| Component | Included | Notes |
|-----------|----------|-------|
| Page Dimension Calculation | Yes | Determine full scroll dimensions |
| Scroll-Capture Loop | Yes | Sequential viewport captures |
| Fixed Element Handling | Yes | Detect and manage sticky headers/footers |
| Image Stitching | Yes | OffscreenCanvas-based composition |
| Lazy Content Handling | Yes | Wait for content to load after scroll |
| Memory Management | Yes | Chunked processing, size limits |
| Progress Indication | Yes | Real-time capture progress UI |
| Horizontal Scroll | Yes | Handle pages wider than viewport |
| Compression/Output | Yes | Quality settings, format selection |
| Infinite Scroll Detection | No | Warn user, capture visible portion |
| Video/Canvas Capture | No | Static content only |

---

## 1. Architecture Overview

### 1.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Popup UI                                  │
│  [Full Page Screenshot] → Progress Bar → [Save/Cancel]          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Background Script                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │ Capture         │  │ Tab Screenshot  │  │ Result         │  │
│  │ Coordinator     │──│ API             │──│ Assembler      │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Content Script                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │ Page Analyzer   │  │ Scroll          │  │ Fixed Element  │  │
│  │ (dimensions)    │  │ Controller      │  │ Manager        │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Capture Flow

```
Start Full Page Capture
         │
         ▼
┌─────────────────────────┐
│ 1. Analyze Page         │
│    - Calculate dimensions│
│    - Detect fixed elements│
│    - Check page limits   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 2. Prepare Page         │
│    - Hide fixed elements │
│    - Disable animations  │
│    - Store scroll pos    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 3. Capture Loop         │◄────────────────┐
│    - Scroll to position  │                 │
│    - Wait for content    │                 │
│    - Capture viewport    │                 │
│    - Update progress     │─────────────────┘
└───────────┬─────────────┘   (until page end)
            │
            ▼
┌─────────────────────────┐
│ 4. Restore Page         │
│    - Show fixed elements │
│    - Restore scroll pos  │
│    - Re-enable animations│
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 5. Stitch Images        │
│    - Create canvas       │
│    - Draw segments       │
│    - Apply compression   │
└───────────┬─────────────┘
            │
            ▼
      Return Result
```

---

## 2. Type Definitions

### 2.1 Core Types

**src/types/fullpage-screenshot.ts**:
```typescript
/**
 * Configuration for full page screenshot capture
 */
export interface FullPageScreenshotConfig {
  /** Maximum page height in pixels (default: 32000) */
  maxPageHeight: number;
  /** Maximum page width in pixels (default: 4096) */
  maxPageWidth: number;
  /** Maximum total pixels (width * height) to prevent memory issues */
  maxTotalPixels: number;
  /** Delay after scroll before capture (ms) */
  scrollWaitMs: number;
  /** Additional delay for lazy content (ms) */
  lazyLoadWaitMs: number;
  /** Output image format */
  format: 'png' | 'jpeg' | 'webp';
  /** JPEG/WebP quality (0-1) */
  quality: number;
  /** Whether to capture horizontal overflow */
  captureHorizontalScroll: boolean;
  /** Strategy for handling fixed elements */
  fixedElementStrategy: 'hide' | 'capture-once' | 'ignore';
  /** Maximum capture time before timeout (ms) */
  timeoutMs: number;
}

/**
 * Page analysis result
 */
export interface PageDimensions {
  /** Full scrollable width */
  scrollWidth: number;
  /** Full scrollable height */
  scrollHeight: number;
  /** Visible viewport width */
  viewportWidth: number;
  /** Visible viewport height */
  viewportHeight: number;
  /** Device pixel ratio for high-DPI displays */
  devicePixelRatio: number;
  /** Detected fixed/sticky elements */
  fixedElements: FixedElementInfo[];
  /** Whether page uses infinite scroll */
  hasInfiniteScroll: boolean;
  /** Estimated capture count */
  estimatedCaptures: number;
}

/**
 * Information about a fixed/sticky positioned element
 */
export interface FixedElementInfo {
  /** CSS selector to identify element */
  selector: string;
  /** Element's bounding rect */
  rect: DOMRect;
  /** Position type: fixed or sticky */
  positionType: 'fixed' | 'sticky';
  /** Location on screen */
  location: 'top' | 'bottom' | 'left' | 'right' | 'other';
  /** Original visibility style */
  originalVisibility: string;
  /** Original position style */
  originalPosition: string;
}

/**
 * Single viewport capture segment
 */
export interface CaptureSegment {
  /** Segment index (0-based) */
  index: number;
  /** X offset in final image */
  x: number;
  /** Y offset in final image */
  y: number;
  /** Segment width */
  width: number;
  /** Segment height */
  height: number;
  /** Base64 encoded image data */
  data: string;
  /** Scroll position when captured */
  scrollX: number;
  scrollY: number;
}

/**
 * Progress update during capture
 */
export interface CaptureProgress {
  /** Current phase */
  phase: 'analyzing' | 'preparing' | 'capturing' | 'stitching' | 'compressing';
  /** Current segment (during capturing phase) */
  currentSegment: number;
  /** Total segments to capture */
  totalSegments: number;
  /** Percentage complete (0-100) */
  percentage: number;
  /** Human-readable status message */
  message: string;
}

/**
 * Full page screenshot result
 */
export interface FullPageScreenshotResult {
  /** Whether capture succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Page title */
  title: string;
  /** Page URL */
  url: string;
  /** Final image data (base64) */
  imageData?: string;
  /** Image format */
  format: 'png' | 'jpeg' | 'webp';
  /** Final image dimensions */
  width: number;
  height: number;
  /** File size in bytes */
  sizeBytes: number;
  /** Capture duration in ms */
  durationMs: number;
  /** Number of segments captured */
  segmentCount: number;
  /** Warnings (e.g., truncated, lazy content missed) */
  warnings: string[];
}

/**
 * Message types for full page capture communication
 */
export type FullPageCaptureMessage =
  | { type: 'FULLPAGE_ANALYZE' }
  | { type: 'FULLPAGE_PREPARE'; config: FullPageScreenshotConfig }
  | { type: 'FULLPAGE_SCROLL'; x: number; y: number }
  | { type: 'FULLPAGE_CAPTURE_SEGMENT' }
  | { type: 'FULLPAGE_RESTORE' }
  | { type: 'FULLPAGE_PROGRESS'; progress: CaptureProgress }
  | { type: 'FULLPAGE_COMPLETE'; result: FullPageScreenshotResult }
  | { type: 'FULLPAGE_CANCEL' };
```

### 2.2 Default Configuration

```typescript
export const DEFAULT_FULLPAGE_CONFIG: FullPageScreenshotConfig = {
  maxPageHeight: 32000,      // ~32K pixels max height
  maxPageWidth: 4096,        // ~4K pixels max width
  maxTotalPixels: 100000000, // 100 megapixels max
  scrollWaitMs: 100,         // Wait after scroll
  lazyLoadWaitMs: 500,       // Wait for lazy content
  format: 'jpeg',            // JPEG for balance of quality/size
  quality: 0.92,             // High quality
  captureHorizontalScroll: false, // Vertical only by default
  fixedElementStrategy: 'hide',   // Hide fixed elements
  timeoutMs: 60000,          // 1 minute timeout
};
```

---

## 3. Page Analysis

### 3.1 Dimension Calculation

**src/capture/fullpage/analyzer.ts**:
```typescript
/**
 * Analyze page dimensions and characteristics for full page capture
 */
export function analyzePageDimensions(): PageDimensions {
  const body = document.body;
  const html = document.documentElement;

  // Calculate full scroll dimensions
  // Use maximum of various measurement methods for accuracy
  const scrollWidth = Math.max(
    body.scrollWidth,
    body.offsetWidth,
    html.clientWidth,
    html.scrollWidth,
    html.offsetWidth
  );

  const scrollHeight = Math.max(
    body.scrollHeight,
    body.offsetHeight,
    html.clientHeight,
    html.scrollHeight,
    html.offsetHeight
  );

  // Get viewport dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Device pixel ratio for high-DPI support
  const devicePixelRatio = window.devicePixelRatio || 1;

  // Detect fixed elements
  const fixedElements = detectFixedElements();

  // Check for infinite scroll patterns
  const hasInfiniteScroll = detectInfiniteScroll();

  // Calculate estimated capture count
  const horizontalCaptures = Math.ceil(scrollWidth / viewportWidth);
  const verticalCaptures = Math.ceil(scrollHeight / viewportHeight);
  const estimatedCaptures = horizontalCaptures * verticalCaptures;

  return {
    scrollWidth,
    scrollHeight,
    viewportWidth,
    viewportHeight,
    devicePixelRatio,
    fixedElements,
    hasInfiniteScroll,
    estimatedCaptures,
  };
}

/**
 * Detect elements with fixed or sticky positioning
 */
function detectFixedElements(): FixedElementInfo[] {
  const fixedElements: FixedElementInfo[] = [];
  const allElements = document.querySelectorAll('*');

  allElements.forEach((element) => {
    if (!(element instanceof HTMLElement)) return;

    const computed = window.getComputedStyle(element);
    const position = computed.position;

    if (position === 'fixed' || position === 'sticky') {
      const rect = element.getBoundingClientRect();

      // Skip tiny or invisible elements
      if (rect.width < 10 || rect.height < 10) return;
      if (computed.visibility === 'hidden' || computed.display === 'none') return;

      // Determine location
      let location: 'top' | 'bottom' | 'left' | 'right' | 'other' = 'other';
      if (rect.top < 100) location = 'top';
      else if (rect.bottom > window.innerHeight - 100) location = 'bottom';
      else if (rect.left < 50) location = 'left';
      else if (rect.right > window.innerWidth - 50) location = 'right';

      fixedElements.push({
        selector: generateUniqueSelector(element),
        rect: rect,
        positionType: position as 'fixed' | 'sticky',
        location,
        originalVisibility: computed.visibility,
        originalPosition: position,
      });
    }
  });

  return fixedElements;
}

/**
 * Detect infinite scroll patterns
 */
function detectInfiniteScroll(): boolean {
  // Check for common infinite scroll indicators
  const indicators = [
    // Scroll event listeners that load more content
    document.querySelector('[data-infinite-scroll]'),
    document.querySelector('.infinite-scroll'),
    document.querySelector('[data-page]'),
    // Common lazy loading libraries
    document.querySelector('[data-src]:not([src])'),
    document.querySelector('.lazy-load'),
    // Intersection observer targets
    document.querySelector('[data-observe]'),
  ];

  if (indicators.some(Boolean)) return true;

  // Check if page height changes significantly on scroll
  // This is detected during capture, not analysis

  return false;
}

/**
 * Generate a unique CSS selector for an element
 */
function generateUniqueSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.className) {
      const classes = Array.from(current.classList)
        .filter(c => !c.startsWith('_') && c.length < 30)
        .slice(0, 2)
        .map(c => CSS.escape(c))
        .join('.');
      if (classes) selector += `.${classes}`;
    }

    // Add nth-of-type for uniqueness
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        c => c.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}
```

### 3.2 Capture Feasibility Check

```typescript
/**
 * Check if full page capture is feasible given constraints
 */
export function checkCaptureFeasibility(
  dimensions: PageDimensions,
  config: FullPageScreenshotConfig
): { feasible: boolean; warnings: string[]; adjustedDimensions?: PageDimensions } {
  const warnings: string[] = [];
  let adjustedDimensions = { ...dimensions };

  // Check page height limit
  if (dimensions.scrollHeight > config.maxPageHeight) {
    warnings.push(
      `Page height (${dimensions.scrollHeight}px) exceeds limit (${config.maxPageHeight}px). ` +
      `Capture will be truncated.`
    );
    adjustedDimensions.scrollHeight = config.maxPageHeight;
  }

  // Check page width limit
  if (dimensions.scrollWidth > config.maxPageWidth) {
    warnings.push(
      `Page width (${dimensions.scrollWidth}px) exceeds limit (${config.maxPageWidth}px). ` +
      `Capture will be truncated.`
    );
    adjustedDimensions.scrollWidth = config.maxPageWidth;
  }

  // Check total pixel limit
  const totalPixels = adjustedDimensions.scrollWidth * adjustedDimensions.scrollHeight;
  if (totalPixels > config.maxTotalPixels) {
    const scale = Math.sqrt(config.maxTotalPixels / totalPixels);
    adjustedDimensions.scrollHeight = Math.floor(adjustedDimensions.scrollHeight * scale);
    adjustedDimensions.scrollWidth = Math.floor(adjustedDimensions.scrollWidth * scale);
    warnings.push(
      `Total pixels (${totalPixels}) exceeds limit. ` +
      `Image will be scaled down to ${adjustedDimensions.scrollWidth}x${adjustedDimensions.scrollHeight}.`
    );
  }

  // Check for infinite scroll
  if (dimensions.hasInfiniteScroll) {
    warnings.push(
      'Page appears to use infinite scroll. ' +
      'Only currently loaded content will be captured.'
    );
  }

  // Estimate memory usage (rough: 4 bytes per pixel for RGBA)
  const estimatedMemoryMB = (totalPixels * 4) / (1024 * 1024);
  if (estimatedMemoryMB > 500) {
    warnings.push(
      `Estimated memory usage (${estimatedMemoryMB.toFixed(0)}MB) is high. ` +
      `Capture may be slow or fail on memory-constrained devices.`
    );
  }

  return {
    feasible: true, // Always attempt, but with warnings
    warnings,
    adjustedDimensions: warnings.length > 0 ? adjustedDimensions : undefined,
  };
}
```

---

## 4. Fixed Element Management

### 4.1 Fixed Element Handler

**src/capture/fullpage/fixed-elements.ts**:
```typescript
/**
 * Manages fixed/sticky elements during capture
 */
export class FixedElementManager {
  private elements: Map<string, { element: HTMLElement; originalStyles: CSSStyleDeclaration }>;
  private capturedOnce: Set<string>;

  constructor() {
    this.elements = new Map();
    this.capturedOnce = new Set();
  }

  /**
   * Store and hide all fixed elements
   */
  hideFixedElements(fixedElements: FixedElementInfo[]): void {
    for (const info of fixedElements) {
      const element = document.querySelector(info.selector) as HTMLElement;
      if (!element) continue;

      // Store original styles
      const originalStyles = window.getComputedStyle(element);
      this.elements.set(info.selector, {
        element,
        originalStyles: {
          visibility: originalStyles.visibility,
          position: originalStyles.position,
          opacity: originalStyles.opacity,
        } as unknown as CSSStyleDeclaration,
      });

      // Hide element
      element.style.visibility = 'hidden';
    }
  }

  /**
   * Temporarily show a fixed element for capture
   * Used with 'capture-once' strategy
   */
  showForCapture(selector: string): void {
    const stored = this.elements.get(selector);
    if (!stored) return;

    stored.element.style.visibility = 'visible';
  }

  /**
   * Hide element again after capture
   */
  hideAfterCapture(selector: string): void {
    const stored = this.elements.get(selector);
    if (!stored) return;

    stored.element.style.visibility = 'hidden';
    this.capturedOnce.add(selector);
  }

  /**
   * Check if element should be captured in this segment
   */
  shouldCaptureInSegment(
    selector: string,
    segmentIndex: number,
    info: FixedElementInfo
  ): boolean {
    // Only capture top elements in first segment
    if (info.location === 'top' && segmentIndex === 0) {
      return !this.capturedOnce.has(selector);
    }
    // Bottom elements captured in last segment (handled separately)
    return false;
  }

  /**
   * Restore all fixed elements to original state
   */
  restoreAll(): void {
    for (const [selector, stored] of this.elements) {
      stored.element.style.visibility = stored.originalStyles.visibility;
      stored.element.style.position = stored.originalStyles.position;
      stored.element.style.opacity = stored.originalStyles.opacity;
    }
    this.elements.clear();
    this.capturedOnce.clear();
  }
}
```

### 4.2 Fixed Element Strategies

```typescript
/**
 * Strategy implementations for handling fixed elements
 */
export const fixedElementStrategies = {
  /**
   * Hide all fixed elements during capture
   * Simplest approach, prevents duplication
   */
  hide: (manager: FixedElementManager, elements: FixedElementInfo[]) => {
    manager.hideFixedElements(elements);
  },

  /**
   * Capture fixed elements once in their appropriate position
   * - Top elements: first segment only
   * - Bottom elements: last segment only
   */
  captureOnce: (
    manager: FixedElementManager,
    elements: FixedElementInfo[],
    segmentIndex: number,
    totalSegments: number
  ) => {
    for (const info of elements) {
      const shouldShow =
        (info.location === 'top' && segmentIndex === 0) ||
        (info.location === 'bottom' && segmentIndex === totalSegments - 1);

      if (shouldShow) {
        manager.showForCapture(info.selector);
      } else {
        manager.hideAfterCapture(info.selector);
      }
    }
  },

  /**
   * Ignore fixed elements - let them appear in every segment
   * Results in duplicated headers/footers
   */
  ignore: () => {
    // No action needed
  },
};
```

---

## 5. Scroll-Capture-Stitch Algorithm

### 5.1 Capture Coordinator

**src/capture/fullpage/coordinator.ts**:
```typescript
/**
 * Coordinates the full page capture process
 */
export class FullPageCaptureCoordinator {
  private config: FullPageScreenshotConfig;
  private dimensions: PageDimensions;
  private segments: CaptureSegment[] = [];
  private fixedManager: FixedElementManager;
  private originalScrollPos: { x: number; y: number };
  private startTime: number = 0;
  private cancelled: boolean = false;

  constructor(config: FullPageScreenshotConfig) {
    this.config = config;
    this.fixedManager = new FixedElementManager();
  }

  /**
   * Execute full page capture
   */
  async capture(
    onProgress: (progress: CaptureProgress) => void
  ): Promise<FullPageScreenshotResult> {
    this.startTime = Date.now();
    this.cancelled = false;
    const warnings: string[] = [];

    try {
      // Phase 1: Analyze
      onProgress({
        phase: 'analyzing',
        currentSegment: 0,
        totalSegments: 0,
        percentage: 5,
        message: 'Analyzing page dimensions...',
      });

      this.dimensions = analyzePageDimensions();
      const feasibility = checkCaptureFeasibility(this.dimensions, this.config);
      warnings.push(...feasibility.warnings);

      if (feasibility.adjustedDimensions) {
        this.dimensions = {
          ...this.dimensions,
          ...feasibility.adjustedDimensions,
        };
      }

      // Calculate capture grid
      const captureGrid = this.calculateCaptureGrid();

      // Phase 2: Prepare
      onProgress({
        phase: 'preparing',
        currentSegment: 0,
        totalSegments: captureGrid.length,
        percentage: 10,
        message: 'Preparing page for capture...',
      });

      await this.preparePage();

      // Phase 3: Capture
      for (let i = 0; i < captureGrid.length; i++) {
        if (this.cancelled) {
          throw new Error('Capture cancelled by user');
        }

        const position = captureGrid[i];
        onProgress({
          phase: 'capturing',
          currentSegment: i + 1,
          totalSegments: captureGrid.length,
          percentage: 10 + Math.floor((i / captureGrid.length) * 70),
          message: `Capturing segment ${i + 1} of ${captureGrid.length}...`,
        });

        const segment = await this.captureSegment(position, i);
        this.segments.push(segment);
      }

      // Phase 4: Restore
      this.restorePage();

      // Phase 5: Stitch
      onProgress({
        phase: 'stitching',
        currentSegment: captureGrid.length,
        totalSegments: captureGrid.length,
        percentage: 85,
        message: 'Stitching segments together...',
      });

      const stitchedImage = await this.stitchSegments();

      // Phase 6: Compress
      onProgress({
        phase: 'compressing',
        currentSegment: captureGrid.length,
        totalSegments: captureGrid.length,
        percentage: 95,
        message: 'Compressing final image...',
      });

      const finalImage = await this.compressImage(stitchedImage);

      return {
        success: true,
        title: document.title,
        url: window.location.href,
        imageData: finalImage.data,
        format: this.config.format,
        width: this.dimensions.scrollWidth,
        height: this.dimensions.scrollHeight,
        sizeBytes: finalImage.sizeBytes,
        durationMs: Date.now() - this.startTime,
        segmentCount: this.segments.length,
        warnings,
      };
    } catch (error) {
      this.restorePage();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        title: document.title,
        url: window.location.href,
        format: this.config.format,
        width: 0,
        height: 0,
        sizeBytes: 0,
        durationMs: Date.now() - this.startTime,
        segmentCount: this.segments.length,
        warnings,
      };
    }
  }

  /**
   * Cancel ongoing capture
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Calculate grid of capture positions
   */
  private calculateCaptureGrid(): Array<{ x: number; y: number }> {
    const grid: Array<{ x: number; y: number }> = [];
    const { scrollWidth, scrollHeight, viewportWidth, viewportHeight } = this.dimensions;

    // Calculate overlap to handle potential sub-pixel rendering issues
    const overlapX = 2;
    const overlapY = 2;

    const effectiveWidth = viewportWidth - overlapX;
    const effectiveHeight = viewportHeight - overlapY;

    // Vertical captures (always)
    const verticalPositions = Math.ceil(scrollHeight / effectiveHeight);

    // Horizontal captures (optional)
    const horizontalPositions = this.config.captureHorizontalScroll
      ? Math.ceil(scrollWidth / effectiveWidth)
      : 1;

    for (let row = 0; row < verticalPositions; row++) {
      for (let col = 0; col < horizontalPositions; col++) {
        const x = col * effectiveWidth;
        const y = row * effectiveHeight;

        // Ensure we don't scroll past the edge
        grid.push({
          x: Math.min(x, Math.max(0, scrollWidth - viewportWidth)),
          y: Math.min(y, Math.max(0, scrollHeight - viewportHeight)),
        });
      }
    }

    return grid;
  }

  /**
   * Prepare page for capture
   */
  private async preparePage(): Promise<void> {
    // Store original scroll position
    this.originalScrollPos = {
      x: window.scrollX,
      y: window.scrollY,
    };

    // Handle fixed elements based on strategy
    if (this.config.fixedElementStrategy === 'hide') {
      this.fixedManager.hideFixedElements(this.dimensions.fixedElements);
    }

    // Disable smooth scrolling
    document.documentElement.style.scrollBehavior = 'auto';

    // Pause CSS animations
    const style = document.createElement('style');
    style.id = 'fullpage-capture-styles';
    style.textContent = `
      *, *::before, *::after {
        animation-play-state: paused !important;
        transition: none !important;
      }
    `;
    document.head.appendChild(style);

    // Small delay for styles to apply
    await this.wait(50);
  }

  /**
   * Restore page after capture
   */
  private restorePage(): void {
    // Restore fixed elements
    this.fixedManager.restoreAll();

    // Restore scroll position
    window.scrollTo(this.originalScrollPos.x, this.originalScrollPos.y);

    // Remove capture styles
    const captureStyles = document.getElementById('fullpage-capture-styles');
    if (captureStyles) {
      captureStyles.remove();
    }

    // Restore smooth scrolling
    document.documentElement.style.scrollBehavior = '';
  }

  /**
   * Capture a single segment
   */
  private async captureSegment(
    position: { x: number; y: number },
    index: number
  ): Promise<CaptureSegment> {
    // Scroll to position
    window.scrollTo(position.x, position.y);

    // Wait for scroll to complete
    await this.wait(this.config.scrollWaitMs);

    // Additional wait for lazy loaded content
    if (this.hasLazyContent()) {
      await this.waitForLazyContent();
    }

    // Handle fixed elements for 'capture-once' strategy
    if (this.config.fixedElementStrategy === 'capture-once') {
      const totalSegments = Math.ceil(
        this.dimensions.scrollHeight / this.dimensions.viewportHeight
      );
      fixedElementStrategies.captureOnce(
        this.fixedManager,
        this.dimensions.fixedElements,
        index,
        totalSegments
      );
    }

    // Capture viewport via background script
    const imageData = await this.captureViewport();

    return {
      index,
      x: position.x,
      y: position.y,
      width: this.dimensions.viewportWidth,
      height: this.dimensions.viewportHeight,
      data: imageData,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    };
  }

  /**
   * Check if current viewport has lazy content loading
   */
  private hasLazyContent(): boolean {
    const lazyImages = document.querySelectorAll(
      'img[loading="lazy"], img[data-src], img.lazy'
    );
    for (const img of lazyImages) {
      const rect = img.getBoundingClientRect();
      // Check if lazy image is in viewport
      if (
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Wait for lazy content to load
   */
  private async waitForLazyContent(): Promise<void> {
    // Wait for images to start loading
    await this.wait(this.config.lazyLoadWaitMs);

    // Wait for visible images to complete loading
    const images = document.querySelectorAll('img');
    const loadPromises: Promise<void>[] = [];

    images.forEach((img) => {
      if (!img.complete) {
        const rect = img.getBoundingClientRect();
        if (
          rect.top < window.innerHeight &&
          rect.bottom > 0
        ) {
          loadPromises.push(
            new Promise((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
              // Timeout after 2 seconds
              setTimeout(resolve, 2000);
            })
          );
        }
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Capture viewport screenshot via background script message
   */
  private async captureViewport(): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'CAPTURE_VIEWPORT_FOR_FULLPAGE' },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.data);
          }
        }
      );
    });
  }

  /**
   * Stitch all segments into final image
   */
  private async stitchSegments(): Promise<ImageBitmap> {
    const { scrollWidth, scrollHeight } = this.dimensions;

    // Create canvas for final image
    const canvas = new OffscreenCanvas(scrollWidth, scrollHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    // Draw each segment
    for (const segment of this.segments) {
      // Decode segment image
      const blob = await fetch(`data:image/png;base64,${segment.data}`).then(
        (r) => r.blob()
      );
      const bitmap = await createImageBitmap(blob);

      // Calculate source and destination regions
      // Handle edge segments that may be partial
      const srcX = 0;
      const srcY = 0;
      const srcWidth = bitmap.width;
      const srcHeight = bitmap.height;

      // Destination position based on scroll position
      const destX = segment.scrollX;
      const destY = segment.scrollY;

      ctx.drawImage(
        bitmap,
        srcX,
        srcY,
        srcWidth,
        srcHeight,
        destX,
        destY,
        srcWidth,
        srcHeight
      );

      // Release bitmap memory
      bitmap.close();
    }

    return canvas.transferToImageBitmap();
  }

  /**
   * Compress final image
   */
  private async compressImage(
    bitmap: ImageBitmap
  ): Promise<{ data: string; sizeBytes: number }> {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    // Convert to blob with specified format and quality
    const mimeType = `image/${this.config.format}`;
    let blob = await canvas.convertToBlob({
      type: mimeType,
      quality: this.config.quality,
    });

    // If JPEG/WebP and still too large, reduce quality iteratively
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB max
    let quality = this.config.quality;

    while (blob.size > maxSizeBytes && quality > 0.3) {
      quality -= 0.1;
      blob = await canvas.convertToBlob({
        type: mimeType,
        quality,
      });
    }

    // Convert to base64
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );

    return {
      data: base64,
      sizeBytes: blob.size,
    };
  }

  /**
   * Utility: wait for specified milliseconds
   */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### 5.2 Background Script Integration

**src/background.ts** (additions):
```typescript
import { FullPageScreenshotResult } from './types/fullpage-screenshot';

// Handle viewport capture for full page screenshot
async function captureViewportForFullPage(): Promise<{ data: string } | { error: string }> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id || !tab.windowId) {
      return { error: 'No active tab' };
    }

    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
      quality: 100,
    });

    // Extract base64 data
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    return { data: base64 };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Capture failed' };
  }
}

// Message handler addition
case 'CAPTURE_VIEWPORT_FOR_FULLPAGE':
  return captureViewportForFullPage();

case 'START_FULLPAGE_CAPTURE':
  return startFullPageCapture(message.config);

case 'CANCEL_FULLPAGE_CAPTURE':
  return cancelFullPageCapture();
```

---

## 6. Progress Indication

### 6.1 Progress UI Component

**src/popup/fullpage-progress.ts**:
```typescript
import { CaptureProgress } from '../types/fullpage-screenshot';

/**
 * Progress UI for full page capture
 */
export class FullPageProgressUI {
  private container: HTMLElement;
  private progressBar: HTMLElement;
  private progressText: HTMLElement;
  private cancelButton: HTMLElement;
  private onCancel: () => void;

  constructor(parentElement: HTMLElement, onCancel: () => void) {
    this.onCancel = onCancel;
    this.container = this.createContainer();
    parentElement.appendChild(this.container);
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'fullpage-progress';
    container.innerHTML = `
      <style>
        #fullpage-progress {
          padding: 16px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        #fullpage-progress .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        #fullpage-progress .progress-title {
          font-weight: 600;
          font-size: 14px;
        }
        #fullpage-progress .progress-bar-container {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        #fullpage-progress .progress-bar {
          height: 100%;
          background: #3b82f6;
          border-radius: 4px;
          transition: width 0.3s ease;
          width: 0%;
        }
        #fullpage-progress .progress-text {
          font-size: 12px;
          color: #6b7280;
        }
        #fullpage-progress .cancel-btn {
          padding: 4px 12px;
          font-size: 12px;
          background: #f3f4f6;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        #fullpage-progress .cancel-btn:hover {
          background: #e5e7eb;
        }
      </style>
      <div class="progress-header">
        <span class="progress-title">Capturing Full Page</span>
        <button class="cancel-btn">Cancel</button>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar"></div>
      </div>
      <div class="progress-text">Initializing...</div>
    `;

    this.progressBar = container.querySelector('.progress-bar')!;
    this.progressText = container.querySelector('.progress-text')!;
    this.cancelButton = container.querySelector('.cancel-btn')!;

    this.cancelButton.addEventListener('click', () => {
      this.onCancel();
    });

    return container;
  }

  /**
   * Update progress display
   */
  update(progress: CaptureProgress): void {
    this.progressBar.style.width = `${progress.percentage}%`;
    this.progressText.textContent = progress.message;

    // Add phase-specific styling
    this.container.setAttribute('data-phase', progress.phase);
  }

  /**
   * Show completion state
   */
  showComplete(success: boolean, message: string): void {
    this.progressBar.style.width = '100%';
    this.progressBar.style.background = success ? '#22c55e' : '#ef4444';
    this.progressText.textContent = message;
    this.cancelButton.style.display = 'none';
  }

  /**
   * Remove progress UI
   */
  remove(): void {
    this.container.remove();
  }
}
```

---

## 7. Memory Management

### 7.1 Chunked Processing Strategy

```typescript
/**
 * Process segments in chunks to manage memory
 */
async function processSegmentsInChunks(
  segments: CaptureSegment[],
  chunkSize: number = 5
): Promise<ImageBitmap[]> {
  const bitmaps: ImageBitmap[] = [];

  for (let i = 0; i < segments.length; i += chunkSize) {
    const chunk = segments.slice(i, i + chunkSize);

    // Process chunk
    const chunkBitmaps = await Promise.all(
      chunk.map(async (segment) => {
        const blob = await fetch(`data:image/png;base64,${segment.data}`).then(
          (r) => r.blob()
        );
        return createImageBitmap(blob);
      })
    );

    bitmaps.push(...chunkBitmaps);

    // Release base64 data from memory
    chunk.forEach((segment) => {
      segment.data = ''; // Clear large string
    });

    // Allow garbage collection between chunks
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return bitmaps;
}
```

### 7.2 Memory Limits and Warnings

```typescript
/**
 * Check available memory and warn if low
 */
async function checkMemoryAvailability(
  estimatedBytes: number
): Promise<{ available: boolean; warning?: string }> {
  // Use Performance Memory API if available (Chrome only)
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    const usedHeap = memory.usedJSHeapSize;
    const totalHeap = memory.jsHeapSizeLimit;
    const available = totalHeap - usedHeap;

    if (estimatedBytes > available * 0.8) {
      return {
        available: false,
        warning: `Insufficient memory. Need ~${formatBytes(estimatedBytes)}, ` +
                 `available: ~${formatBytes(available)}`,
      };
    }
  }

  // Fallback: estimate based on typical browser limits
  const typicalLimit = 2 * 1024 * 1024 * 1024; // 2GB
  if (estimatedBytes > typicalLimit * 0.5) {
    return {
      available: true,
      warning: 'Large capture may be slow or fail on memory-constrained devices.',
    };
  }

  return { available: true };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
```

---

## 8. Edge Case Handling

### 8.1 Infinite Scroll Pages

```typescript
/**
 * Handle infinite scroll pages
 */
async function handleInfiniteScrollPage(
  dimensions: PageDimensions,
  config: FullPageScreenshotConfig
): Promise<{ adjustedDimensions: PageDimensions; warning: string }> {
  // Capture current loaded content only
  const warning =
    'This page uses infinite scroll. Only currently loaded content will be captured. ' +
    'Consider scrolling to load more content before capturing.';

  // Don't attempt to capture beyond current scroll height
  const adjustedDimensions = {
    ...dimensions,
    // Use current scroll height, not attempting to load more
    scrollHeight: Math.min(dimensions.scrollHeight, config.maxPageHeight),
  };

  return { adjustedDimensions, warning };
}
```

### 8.2 Pages with Animations

```typescript
/**
 * Handle pages with animations
 */
function pauseAnimations(): { restore: () => void } {
  // Store animation states
  const animatedElements = document.querySelectorAll(
    '[class*="animate"], [class*="transition"], [style*="animation"]'
  );

  const originalStates: Map<Element, { animationPlayState: string }> = new Map();

  animatedElements.forEach((el) => {
    if (el instanceof HTMLElement) {
      originalStates.set(el, {
        animationPlayState: el.style.animationPlayState,
      });
      el.style.animationPlayState = 'paused';
    }
  });

  // Also pause CSS animations globally
  const style = document.createElement('style');
  style.id = 'pause-animations';
  style.textContent = '* { animation-play-state: paused !important; }';
  document.head.appendChild(style);

  return {
    restore: () => {
      // Restore individual states
      originalStates.forEach((state, el) => {
        if (el instanceof HTMLElement) {
          el.style.animationPlayState = state.animationPlayState;
        }
      });

      // Remove global pause
      const pauseStyle = document.getElementById('pause-animations');
      if (pauseStyle) pauseStyle.remove();
    },
  };
}
```

### 8.3 Pages That Change on Scroll

```typescript
/**
 * Detect if page content changes significantly between captures
 * (e.g., parallax effects, scroll-triggered content)
 */
function detectScrollTriggeredChanges(
  previousCapture: CaptureSegment,
  currentCapture: CaptureSegment,
  overlapRegion: { y: number; height: number }
): boolean {
  // This would require image comparison which is complex
  // For now, we detect common patterns in the DOM

  // Check for scroll event listeners that modify DOM
  const hasScrollListeners =
    document.body.getAttribute('data-scroll') !== null ||
    document.querySelector('[data-scroll-trigger]') !== null;

  // Check for parallax indicators
  const hasParallax =
    document.querySelector('[data-parallax]') !== null ||
    document.querySelector('.parallax') !== null;

  return hasScrollListeners || hasParallax;
}
```

### 8.4 Very Wide Pages (Horizontal Scroll)

```typescript
/**
 * Calculate capture grid for horizontal overflow
 */
function calculateHorizontalCaptureGrid(
  dimensions: PageDimensions
): Array<{ x: number; y: number; row: number; col: number }> {
  const grid: Array<{ x: number; y: number; row: number; col: number }> = [];

  const { scrollWidth, scrollHeight, viewportWidth, viewportHeight } = dimensions;
  const overlap = 2; // Small overlap to prevent gaps

  const cols = Math.ceil(scrollWidth / (viewportWidth - overlap));
  const rows = Math.ceil(scrollHeight / (viewportHeight - overlap));

  // Capture in reading order: left-to-right, top-to-bottom
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = Math.min(
        col * (viewportWidth - overlap),
        Math.max(0, scrollWidth - viewportWidth)
      );
      const y = Math.min(
        row * (viewportHeight - overlap),
        Math.max(0, scrollHeight - viewportHeight)
      );

      grid.push({ x, y, row, col });
    }
  }

  return grid;
}
```

---

## 9. Error Handling

### 9.1 Error Types and Recovery

```typescript
/**
 * Full page capture error types
 */
export enum FullPageCaptureError {
  MEMORY_EXCEEDED = 'MEMORY_EXCEEDED',
  TIMEOUT = 'TIMEOUT',
  CAPTURE_FAILED = 'CAPTURE_FAILED',
  SCROLL_FAILED = 'SCROLL_FAILED',
  STITCH_FAILED = 'STITCH_FAILED',
  CANCELLED = 'CANCELLED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNSUPPORTED_PAGE = 'UNSUPPORTED_PAGE',
}

/**
 * Error with recovery suggestions
 */
export interface FullPageCaptureErrorInfo {
  code: FullPageCaptureError;
  message: string;
  recoverable: boolean;
  suggestion: string;
}

/**
 * Map errors to user-friendly messages and recovery options
 */
export function mapError(error: Error): FullPageCaptureErrorInfo {
  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
    return {
      code: FullPageCaptureError.MEMORY_EXCEEDED,
      message: 'Insufficient memory to capture this page.',
      recoverable: true,
      suggestion: 'Try reducing page size limits in settings or capture a smaller section.',
    };
  }

  if (errorMessage.includes('timeout')) {
    return {
      code: FullPageCaptureError.TIMEOUT,
      message: 'Capture timed out.',
      recoverable: true,
      suggestion: 'The page may be too large or slow. Try increasing timeout or capturing in sections.',
    };
  }

  if (errorMessage.includes('cancelled')) {
    return {
      code: FullPageCaptureError.CANCELLED,
      message: 'Capture was cancelled.',
      recoverable: true,
      suggestion: 'You can try again when ready.',
    };
  }

  if (errorMessage.includes('permission') || errorMessage.includes('not allowed')) {
    return {
      code: FullPageCaptureError.PERMISSION_DENIED,
      message: 'Cannot capture this page due to browser restrictions.',
      recoverable: false,
      suggestion: 'Some pages (like chrome:// URLs) cannot be captured.',
    };
  }

  // Default error
  return {
    code: FullPageCaptureError.CAPTURE_FAILED,
    message: `Capture failed: ${error.message}`,
    recoverable: true,
    suggestion: 'Try refreshing the page and attempting capture again.',
  };
}
```

### 9.2 Timeout Handling

```typescript
/**
 * Execute capture with timeout
 */
async function captureWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  onTimeout: () => void
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      onTimeout();
      reject(new Error('Capture timeout exceeded'));
    }, timeoutMs);
  });

  return Promise.race([operation(), timeoutPromise]);
}
```

---

## 10. Performance Considerations

### 10.1 Optimization Strategies

| Strategy | Description | Impact |
|----------|-------------|--------|
| Lazy decode | Decode segment images only when stitching | Reduces peak memory |
| Chunk processing | Process 5 segments at a time | Prevents heap exhaustion |
| Early GC hints | Clear segment data after use | Frees memory faster |
| Canvas pooling | Reuse canvas for compression | Reduces allocations |
| Progressive loading | Show partial result while stitching | Better perceived performance |

### 10.2 Performance Metrics

```typescript
/**
 * Capture performance metrics
 */
export interface CaptureMetrics {
  totalDurationMs: number;
  analysisMs: number;
  captureMs: number;
  stitchingMs: number;
  compressionMs: number;
  segmentCount: number;
  averageSegmentMs: number;
  peakMemoryMB?: number;
  finalSizeBytes: number;
}

/**
 * Collect performance metrics during capture
 */
class PerformanceCollector {
  private marks: Map<string, number> = new Map();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string, endMark: string): number {
    const start = this.marks.get(startMark);
    const end = this.marks.get(endMark);
    if (start === undefined || end === undefined) return 0;
    return end - start;
  }

  getMetrics(): Partial<CaptureMetrics> {
    return {
      analysisMs: this.measure('analysis', 'start', 'analysis-end'),
      captureMs: this.measure('capture', 'analysis-end', 'capture-end'),
      stitchingMs: this.measure('stitch', 'capture-end', 'stitch-end'),
      compressionMs: this.measure('compress', 'stitch-end', 'compress-end'),
      totalDurationMs: this.measure('total', 'start', 'compress-end'),
    };
  }
}
```

---

## 11. Acceptance Criteria

| ID | Criterion | Test |
|----|-----------|------|
| AC1 | Captures entire scrollable page | Page with 5000px height fully captured |
| AC2 | Fixed headers not duplicated | Sticky header appears once at top |
| AC3 | Progress shown during capture | Progress bar updates, shows segment count |
| AC4 | Lazy images captured | Images that load on scroll are included |
| AC5 | Memory stays under limit | 32K pixel page captured without crash |
| AC6 | Timeout prevents infinite capture | 60 second timeout triggers error |
| AC7 | Cancel stops capture | Cancel button stops and cleans up |
| AC8 | Output quality configurable | JPEG at 92% quality produces expected size |
| AC9 | Horizontal scroll supported | Wide page captured when option enabled |
| AC10 | Warnings shown for edge cases | Infinite scroll page shows warning |
| AC11 | Original scroll position restored | Page returns to original position after capture |
| AC12 | Animations paused during capture | CSS animations don't cause blur |

---

## 12. Implementation Order

### Phase 3a: Core Infrastructure
1. Add type definitions for full page capture
2. Implement page dimension analyzer
3. Create fixed element detector

### Phase 3b: Capture Loop
4. Implement scroll controller
5. Add viewport capture via background script
6. Create capture coordinator

### Phase 3c: Fixed Element Handling
7. Implement FixedElementManager
8. Add hide/show/capture-once strategies
9. Test with various fixed element patterns

### Phase 3d: Stitching
10. Implement OffscreenCanvas stitcher
11. Add overlap handling
12. Implement compression options

### Phase 3e: Edge Cases
13. Add infinite scroll detection
14. Implement horizontal scroll support
15. Add animation pausing

### Phase 3f: UI Integration
16. Create progress UI component
17. Add to popup mode selector
18. Implement cancel functionality

### Phase 3g: Polish
19. Add performance metrics
20. Implement error recovery
21. End-to-end testing

---

## 13. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Memory exhaustion on large pages | High | High | Strict pixel limits, chunked processing, early warnings |
| Timeout on slow pages | Medium | Medium | Configurable timeout, partial result option |
| Fixed element duplication | Medium | Low | Multiple strategies, user can choose |
| Lazy content missed | Medium | Medium | Configurable wait times, scroll-triggered loading |
| Parallax/scroll effects cause artifacts | Medium | Low | Animation pausing, warning to users |
| Browser throttles background captures | Low | High | Foreground capture fallback, delay between captures |
| Canvas size limits exceeded | Medium | High | Browser canvas size checks, downscaling |
| CORS blocks some page resources | Low | Low | Already handled by existing image fetching |

---

## 14. Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| `chrome.tabs.captureVisibleTab` | Yes | Yes* | No | Yes |
| OffscreenCanvas | Yes | Yes | Yes | Yes |
| createImageBitmap | Yes | Yes | Yes | Yes |
| Performance.memory | Yes | No | No | Yes |

*Firefox uses `browser.tabs.captureVisibleTab`

**Note**: Safari extension support requires separate implementation path.

---

## 15. Configuration UI

### 15.1 Settings Schema

```typescript
/**
 * User-configurable settings for full page capture
 */
export interface FullPageCaptureSettings {
  /** Maximum page height (pixels) */
  maxHeight: number;
  /** Output format preference */
  format: 'png' | 'jpeg' | 'webp';
  /** Quality for lossy formats (1-100) */
  quality: number;
  /** How to handle fixed/sticky elements */
  fixedElementHandling: 'hide' | 'capture-once' | 'ignore';
  /** Wait time for lazy content (ms) */
  lazyLoadWait: number;
  /** Enable horizontal scroll capture */
  captureHorizontal: boolean;
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: FullPageCaptureSettings = {
  maxHeight: 32000,
  format: 'jpeg',
  quality: 92,
  fixedElementHandling: 'hide',
  lazyLoadWait: 500,
  captureHorizontal: false,
};
```

### 15.2 Settings UI

```html
<!-- Full Page Capture Settings -->
<div class="settings-section" id="fullpage-settings">
  <h3>Full Page Screenshot</h3>

  <div class="setting-row">
    <label for="max-height">Maximum Height</label>
    <select id="max-height">
      <option value="16000">16,000 px (Medium)</option>
      <option value="32000" selected>32,000 px (Large)</option>
      <option value="64000">64,000 px (Very Large)</option>
    </select>
    <span class="setting-help">Taller pages will be truncated</span>
  </div>

  <div class="setting-row">
    <label for="output-format">Output Format</label>
    <select id="output-format">
      <option value="jpeg" selected>JPEG (smaller file)</option>
      <option value="png">PNG (lossless)</option>
      <option value="webp">WebP (best compression)</option>
    </select>
  </div>

  <div class="setting-row">
    <label for="quality">Quality</label>
    <input type="range" id="quality" min="50" max="100" value="92">
    <span class="quality-value">92%</span>
  </div>

  <div class="setting-row">
    <label for="fixed-handling">Fixed Headers/Footers</label>
    <select id="fixed-handling">
      <option value="hide" selected>Hide during capture</option>
      <option value="capture-once">Capture once only</option>
      <option value="ignore">Leave visible (may duplicate)</option>
    </select>
  </div>

  <div class="setting-row">
    <label>
      <input type="checkbox" id="capture-horizontal">
      Capture horizontal scroll
    </label>
  </div>
</div>
```

---

## 16. Integration with TS-0003

This feature integrates with the Multi-Mode Capture System (TS-0003) as follows:

### 16.1 Mode Addition

```typescript
// Extended ClipMode type
export type ClipMode =
  | 'article'
  | 'bookmark'
  | 'screenshot'      // Existing: viewport only
  | 'fullpage-screenshot' // New: full page stitched
  | 'selection'
  | 'fullpage';       // Existing: DOM clone
```

### 16.2 UI Integration

```html
<!-- Updated mode selector with full page screenshot -->
<div class="mode-selector">
  <button class="mode-btn" data-mode="article">
    <span class="icon">article-icon</span>
    <span class="label">Article</span>
  </button>
  <button class="mode-btn" data-mode="bookmark">
    <span class="icon">bookmark-icon</span>
    <span class="label">Bookmark</span>
  </button>
  <button class="mode-btn" data-mode="screenshot">
    <span class="icon">camera-icon</span>
    <span class="label">Screenshot</span>
  </button>
  <button class="mode-btn" data-mode="fullpage-screenshot">
    <span class="icon">fullpage-icon</span>
    <span class="label">Full Page</span>
  </button>
  <button class="mode-btn" data-mode="selection">
    <span class="icon">selection-icon</span>
    <span class="label">Selection</span>
  </button>
</div>
```

### 16.3 Message Flow

```typescript
// Popup initiates full page capture
case 'fullpage-screenshot':
  // Show progress UI
  showProgressUI();

  // Start capture with progress callback
  const result = await chrome.runtime.sendMessage({
    type: 'START_FULLPAGE_CAPTURE',
    config: getFullPageConfig(),
  });

  // Handle result
  if (result.success) {
    await submitScreenshotClip(result);
  } else {
    showError(result.error);
  }
  break;
```

---

## 17. Testing Strategy

### 17.1 Unit Tests

```typescript
describe('FullPageCapture', () => {
  describe('analyzePageDimensions', () => {
    it('calculates correct scroll dimensions', () => {
      // Mock document with known dimensions
      const dimensions = analyzePageDimensions();
      expect(dimensions.scrollHeight).toBeGreaterThan(0);
      expect(dimensions.viewportHeight).toBeLessThanOrEqual(dimensions.scrollHeight);
    });

    it('detects fixed elements', () => {
      document.body.innerHTML = `
        <header style="position: fixed; top: 0;">Header</header>
        <main>Content</main>
      `;
      const dimensions = analyzePageDimensions();
      expect(dimensions.fixedElements).toHaveLength(1);
      expect(dimensions.fixedElements[0].location).toBe('top');
    });
  });

  describe('checkCaptureFeasibility', () => {
    it('warns when page exceeds limits', () => {
      const dimensions = {
        scrollHeight: 50000,
        scrollWidth: 1920,
        // ...
      };
      const result = checkCaptureFeasibility(dimensions, DEFAULT_FULLPAGE_CONFIG);
      expect(result.warnings).toContain(expect.stringMatching(/exceeds limit/));
    });
  });

  describe('FixedElementManager', () => {
    it('hides and restores fixed elements', () => {
      document.body.innerHTML = `
        <header id="header" style="position: fixed;">Header</header>
      `;
      const manager = new FixedElementManager();
      const header = document.getElementById('header')!;

      manager.hideFixedElements([{
        selector: '#header',
        // ...
      }]);

      expect(header.style.visibility).toBe('hidden');

      manager.restoreAll();
      expect(header.style.visibility).not.toBe('hidden');
    });
  });
});
```

### 17.2 Integration Tests

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Simple tall page | 5000px height, no fixed elements | Complete capture, no warnings |
| Page with sticky header | Fixed header at top | Header appears once at top |
| Lazy loaded images | Images load on scroll | All images captured |
| Very tall page | 40000px height | Truncated at 32000px with warning |
| Horizontal scroll | 3000px width | Captured if option enabled |
| Infinite scroll | Twitter-like feed | Warning shown, current content captured |
| Page with animations | CSS animations | Animations paused, clean capture |

### 17.3 Performance Tests

| Metric | Target | Measurement |
|--------|--------|-------------|
| 5000px page capture time | < 5 seconds | End-to-end timing |
| 20000px page capture time | < 20 seconds | End-to-end timing |
| Peak memory usage (20000px) | < 500MB | Performance.memory API |
| Final image size (20000px JPEG) | < 10MB | Blob.size |

---

## 18. Dependencies

### New Dependencies

None required. Uses existing browser APIs:
- `chrome.tabs.captureVisibleTab`
- `OffscreenCanvas`
- `createImageBitmap`
- `canvas.convertToBlob`

### Browser API Requirements

| API | Purpose | Minimum Version |
|-----|---------|-----------------|
| `captureVisibleTab` | Viewport screenshots | Chrome 5+ |
| `OffscreenCanvas` | Off-thread image processing | Chrome 69+ |
| `createImageBitmap` | Efficient image decoding | Chrome 50+ |
| `convertToBlob` | Canvas to image blob | Chrome 50+ |

---

## 19. UX Specifications

### 19.1 User Flow Analysis

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        FULL PAGE SCREENSHOT USER FLOW                       │
└────────────────────────────────────────────────────────────────────────────┘

[User clicks extension icon]
        │
        ▼
┌─────────────────────┐
│    Popup Opens      │
│  Shows mode options │
└─────────┬───────────┘
          │
          ▼
[User clicks "Full Page Screenshot" button]
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PAGE ANALYSIS PHASE                          │
├─────────────────────────────────────────────────────────────────┤
│  • Popup shows: "Analyzing page..." with spinner                │
│  • System detects: page height, fixed elements, lazy content    │
│  • Duration: 200-500ms (perceived as instant)                   │
└─────────────────────────────────────────────────────────────────┘
          │
          ├── [Page exceeds limits] ──────────────────────┐
          │                                                │
          ▼                                                ▼
┌─────────────────────────┐             ┌─────────────────────────────────┐
│  [Normal page]          │             │   WARNING DIALOG                 │
│  Proceed to capture     │             │   "Page is very tall (50,000px) │
│                         │             │   Capture will be limited to     │
│                         │             │   32,000px. Continue?"           │
│                         │             │   [Continue] [Cancel]            │
└─────────┬───────────────┘             └─────────────────┬───────────────┘
          │                                               │
          │◄──────────────[User clicks Continue]──────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CAPTURE PHASE                                │
├─────────────────────────────────────────────────────────────────┤
│  Popup displays:                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Capturing Full Page                          [Cancel]   │   │
│  │  ████████████████░░░░░░░░░░░░  45%                       │   │
│  │  Segment 9 of 20...                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  • Progress bar fills as segments complete                      │
│  • Percentage updates in real-time                              │
│  • Current segment counter provides granularity                 │
│  • Cancel button available throughout                           │
└─────────────────────────────────────────────────────────────────┘
          │
          ├── [User clicks Cancel] ───────┐
          │                                │
          ▼                                ▼
┌─────────────────────────┐   ┌───────────────────────────────────┐
│  [Capture completes]    │   │  CANCELLATION                      │
│                         │   │  • Page restored immediately       │
│                         │   │  • "Capture cancelled" message     │
│                         │   │  • Return to mode selection        │
└─────────┬───────────────┘   └───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PROCESSING PHASE                             │
├─────────────────────────────────────────────────────────────────┤
│  Progress shows:                                                 │
│  • "Stitching segments..." (85-95%)                             │
│  • "Compressing image..." (95-99%)                              │
│  • Spinner indicates ongoing processing                          │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     RESULT PHASE                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ✓ Screenshot captured                                   │   │
│  │                                                          │   │
│  │  [Preview thumbnail: 120x200px]                          │   │
│  │                                                          │   │
│  │  1920 × 12,840 px  •  2.3 MB  •  JPEG                   │   │
│  │  Captured in 8.2 seconds                                 │   │
│  │                                                          │   │
│  │  ⚠ Some lazy-loaded images may not have loaded          │   │
│  │                                                          │   │
│  │  [Save to Server] [Download] [Copy] [Retry]              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 19.2 Pre-Capture Warnings System

**Warning Types and Triggers:**

| Condition | Warning Level | Message | User Action Required |
|-----------|---------------|---------|---------------------|
| Page height > 20,000px | Info | "This is a tall page. Capture may take a moment." | None (auto-dismiss) |
| Page height > maxLimit | Warning | "Page exceeds {limit}px. Capture will be truncated." | Confirm/Cancel |
| Infinite scroll detected | Warning | "Page uses infinite scroll. Only loaded content captured." | Confirm/Cancel |
| Memory estimate > 400MB | Warning | "Large capture may be slow on this device." | Confirm/Cancel |
| Fixed headers detected | Info | "Fixed headers will be captured once at top." | None |
| Active animations | Info | "Animations will be paused during capture." | None |

**Warning Dialog Design:**

```
┌──────────────────────────────────────────────────────────────┐
│  ⚠ Large Page Detected                                       │
│                                                              │
│  This page is 48,000 pixels tall. The capture will be        │
│  limited to 32,000 pixels (approximately 67% of the page).   │
│                                                              │
│  Estimated capture time: ~15 seconds                         │
│  Estimated file size: ~4 MB                                  │
│                                                              │
│             [Cancel]                [Continue Anyway]        │
└──────────────────────────────────────────────────────────────┘
```

### 19.3 Progress Indication Patterns

**Phase-Based Progress:**

| Phase | Progress Range | Duration | User Perception |
|-------|----------------|----------|-----------------|
| Analyzing | 0-5% | 200-500ms | Instant |
| Preparing | 5-10% | 100-300ms | Instant |
| Capturing | 10-80% | Variable | Main wait time |
| Stitching | 80-90% | 500-2000ms | Brief processing |
| Compressing | 90-99% | 200-1000ms | Brief processing |
| Complete | 100% | - | Success indicator |

**Progress Update Frequency:**
- Segment progress: Update after each segment capture
- Phase transitions: Immediate update
- Percentage: Smooth animation (CSS transition 300ms)

**Visual Feedback During Capture:**

```
┌─────────────────────────────────────────────────────────────┐
│  Capturing Full Page                             [Cancel]   │
│                                                             │
│  ████████████████████░░░░░░░░░░░░  62%                     │
│                                                             │
│  📸 Capturing segment 13 of 21                              │
│  ⏱ Elapsed: 6.2s • Remaining: ~4s                          │
└─────────────────────────────────────────────────────────────┘
```

### 19.4 Cancellation Experience

**Cancellation States:**

1. **Immediate Cancel** (during preparation):
   - Page restored instantly
   - No partial data saved
   - Return to mode selection

2. **Mid-Capture Cancel**:
   - Current segment completes (non-interruptible)
   - Page restored
   - Partial captures discarded
   - User returned to mode selection

3. **Processing Cancel** (during stitch/compress):
   - Cannot cancel (operation atomic)
   - Button disabled with tooltip: "Processing cannot be interrupted"

**Cancel Confirmation (if >5 segments captured):**

```
┌──────────────────────────────────────────────────────────────┐
│  Cancel Capture?                                             │
│                                                              │
│  13 of 21 segments have been captured.                       │
│  Cancelling will discard all progress.                       │
│                                                              │
│             [Continue Capture]           [Cancel & Discard]  │
└──────────────────────────────────────────────────────────────┘
```

### 19.5 Error Recovery Patterns

**Error Type: Capture Timeout**
```
┌──────────────────────────────────────────────────────────────┐
│  ⏱ Capture Timed Out                                        │
│                                                              │
│  The capture took longer than 60 seconds.                    │
│                                                              │
│  Suggestions:                                                │
│  • Wait for page to fully load before capturing              │
│  • Try reducing maximum page height in settings              │
│  • Use Area Screenshot for a specific section                │
│                                                              │
│             [Try Again]              [Change Settings]       │
└──────────────────────────────────────────────────────────────┘
```

**Error Type: Memory Exceeded**
```
┌──────────────────────────────────────────────────────────────┐
│  ⚠ Memory Limit Reached                                     │
│                                                              │
│  Your device doesn't have enough memory for this capture.    │
│                                                              │
│  Captured: 18,000 of 32,000 pixels (56%)                    │
│                                                              │
│             [Save Partial]           [Try Smaller Size]      │
└──────────────────────────────────────────────────────────────┘
```

**Error Type: Permission Denied**
```
┌──────────────────────────────────────────────────────────────┐
│  🚫 Cannot Capture This Page                                │
│                                                              │
│  Browser security prevents capturing this type of page       │
│  (chrome://, extensions, or protected content).              │
│                                                              │
│  Try capturing a regular web page instead.                   │
│                                                              │
│                            [Close]                           │
└──────────────────────────────────────────────────────────────┘
```

### 19.6 Result Presentation

**Success State with Metadata:**

```
┌─────────────────────────────────────────────────────────────┐
│  ✓ Full Page Screenshot Captured                            │
│                                                             │
│  ┌───────────────┐                                          │
│  │               │  Dimensions: 1920 × 12,840 px            │
│  │   [Preview    │  File size: 2.3 MB                       │
│  │   Thumbnail]  │  Format: JPEG (92% quality)              │
│  │               │  Segments: 8 captures                     │
│  │               │  Duration: 6.4 seconds                    │
│  └───────────────┘                                          │
│                                                             │
│  ⚠ Page was truncated from 45,000px to 32,000px            │
│                                                             │
│  [💾 Save to Server]  [⬇ Download]  [📋 Copy]  [🔄 Retry]  │
└─────────────────────────────────────────────────────────────┘
```

**Warning Badges on Result:**

| Warning | Badge | Tooltip |
|---------|-------|---------|
| Truncated | `⚠ Truncated` | "Original page: {x}px, Captured: {y}px" |
| Lazy content | `ℹ Partial` | "Some lazy-loaded content may be missing" |
| Fixed elements hidden | `ℹ Headers hidden` | "Fixed headers/footers were hidden" |
| Low quality fallback | `ℹ Compressed` | "Quality reduced to fit size limits" |

### 19.7 Accessibility Enhancements

**Screen Reader Announcements:**

| Event | Announcement | ARIA |
|-------|--------------|------|
| Capture started | "Full page capture started. Progress: 0 percent" | `aria-live="polite"` |
| Progress update | "Capturing segment {n} of {total}. {percent} percent complete" | `aria-live="polite"` (every 10%) |
| Phase change | "Now {phase}. {percent} percent complete" | `aria-live="polite"` |
| Warning shown | Warning message + options | `role="alertdialog"` |
| Capture complete | "Screenshot captured. {dimensions}. {size}." | `aria-live="assertive"` |
| Error | Error message + suggestions | `role="alert"` |

**Keyboard Navigation:**

```
Full Page Screenshot Flow:
─────────────────────────
[Space/Enter] on Full Page button → Start capture
                                    │
                                    ▼
                            Progress shown
                                    │
    [Escape] ───────────────────────┤
                                    │
                                    ▼
                            Result screen
                                    │
    [Tab] ─────► [Save] → [Download] → [Copy] → [Retry]
    [Enter] ──► Activate focused button
    [Escape] ──► Return to mode selection
```

### 19.8 Mobile/Touch Considerations

| Interaction | Touch Behavior |
|-------------|----------------|
| Mode selection | Tap to select |
| Progress view | Non-interactive (view only) |
| Cancel button | 44×44px minimum touch target |
| Result actions | 48px tall buttons, 8px gap |
| Warning dialogs | Full-width buttons on mobile |

### 19.9 Loading States and Timing

**Timing Expectations:**

| Page Type | Expected Duration | Progress Feedback |
|-----------|-------------------|-------------------|
| Short page (<3 segments) | 1-3 seconds | May skip to "Processing" |
| Medium page (3-10 segments) | 3-10 seconds | Per-segment updates |
| Long page (10-20 segments) | 10-25 seconds | Per-segment + ETA |
| Very long page (20+ segments) | 25-60 seconds | Per-segment + ETA |

**Perceived Performance Optimizations:**

1. **Optimistic UI**: Show "Capturing..." before analysis completes
2. **Progress smoothing**: Animate between segment updates
3. **Phase messaging**: Clear messages for each phase
4. **ETA display**: Show estimated time remaining for long captures

---

## 20. UI Specifications

### 20.1 Design Token Integration

All UI components use design tokens from `docs/design-guidelines.md`:

```css
/* Full Page Screenshot UI - Design Tokens */
:root {
  /* Primary Colors */
  --wc-primary-500: #3b82f6;
  --wc-primary-600: #2563eb;
  --wc-primary-700: #1d4ed8;

  /* Semantic Colors */
  --wc-success-500: #22c55e;
  --wc-success-600: #16a34a;
  --wc-warning-500: #f59e0b;
  --wc-warning-600: #d97706;
  --wc-error-500: #ef4444;
  --wc-error-600: #dc2626;

  /* Neutral Colors */
  --wc-gray-50: #f9fafb;
  --wc-gray-100: #f3f4f6;
  --wc-gray-200: #e5e7eb;
  --wc-gray-300: #d1d5db;
  --wc-gray-500: #6b7280;
  --wc-gray-700: #374151;
  --wc-gray-900: #111827;

  /* Typography */
  --wc-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --wc-font-size-xs: 11px;
  --wc-font-size-sm: 12px;
  --wc-font-size-base: 14px;
  --wc-font-size-lg: 16px;
  --wc-font-weight-normal: 400;
  --wc-font-weight-medium: 500;
  --wc-font-weight-semibold: 600;

  /* Spacing */
  --wc-spacing-xs: 4px;
  --wc-spacing-sm: 8px;
  --wc-spacing-md: 12px;
  --wc-spacing-lg: 16px;
  --wc-spacing-xl: 24px;

  /* Border Radius */
  --wc-radius-sm: 4px;
  --wc-radius-md: 6px;
  --wc-radius-lg: 8px;

  /* Shadows */
  --wc-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --wc-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
  --wc-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.15);

  /* Transitions */
  --wc-transition-fast: 150ms ease;
  --wc-transition-normal: 200ms ease;
  --wc-transition-slow: 300ms ease;
}
```

### 20.2 Progress Container Component

```css
/* Full Page Progress Container */
.wc-fullpage-progress {
  padding: var(--wc-spacing-lg);
  background: var(--wc-gray-50);
  border-radius: var(--wc-radius-lg);
  border: 1px solid var(--wc-gray-200);
}

.wc-fullpage-progress__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--wc-spacing-md);
}

.wc-fullpage-progress__title {
  font-size: var(--wc-font-size-base);
  font-weight: var(--wc-font-weight-semibold);
  color: var(--wc-gray-900);
  display: flex;
  align-items: center;
  gap: var(--wc-spacing-sm);
}

.wc-fullpage-progress__title-icon {
  width: 16px;
  height: 16px;
  color: var(--wc-primary-500);
}

/* Spinner animation for title icon */
.wc-fullpage-progress__title-icon--spinning {
  animation: wc-spin 1s linear infinite;
}

@keyframes wc-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### 20.3 Progress Bar Component

```css
/* Progress Bar */
.wc-progress-bar {
  position: relative;
  height: 8px;
  background: var(--wc-gray-200);
  border-radius: var(--wc-radius-sm);
  overflow: hidden;
  margin-bottom: var(--wc-spacing-sm);
}

.wc-progress-bar__fill {
  height: 100%;
  background: var(--wc-primary-500);
  border-radius: var(--wc-radius-sm);
  transition: width var(--wc-transition-slow);
  position: relative;
}

/* Animated stripe effect during capture */
.wc-progress-bar__fill--active {
  background: linear-gradient(
    90deg,
    var(--wc-primary-500) 0%,
    var(--wc-primary-600) 50%,
    var(--wc-primary-500) 100%
  );
  background-size: 200% 100%;
  animation: wc-progress-shimmer 1.5s ease-in-out infinite;
}

@keyframes wc-progress-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Success state */
.wc-progress-bar__fill--success {
  background: var(--wc-success-500);
}

/* Error state */
.wc-progress-bar__fill--error {
  background: var(--wc-error-500);
}

/* Progress percentage label */
.wc-progress-bar__percentage {
  position: absolute;
  right: var(--wc-spacing-sm);
  top: 50%;
  transform: translateY(-50%);
  font-size: var(--wc-font-size-xs);
  font-weight: var(--wc-font-weight-medium);
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  /* Only show when progress > 20% */
  opacity: 0;
  transition: opacity var(--wc-transition-fast);
}

.wc-progress-bar__fill[style*="width: 2"],
.wc-progress-bar__fill[style*="width: 3"],
.wc-progress-bar__fill[style*="width: 4"],
.wc-progress-bar__fill[style*="width: 5"],
.wc-progress-bar__fill[style*="width: 6"],
.wc-progress-bar__fill[style*="width: 7"],
.wc-progress-bar__fill[style*="width: 8"],
.wc-progress-bar__fill[style*="width: 9"],
.wc-progress-bar__fill[style*="width: 100"] {
  .wc-progress-bar__percentage {
    opacity: 1;
  }
}
```

### 20.4 Progress Details Component

```css
/* Progress Details */
.wc-progress-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--wc-font-size-sm);
  color: var(--wc-gray-500);
}

.wc-progress-details__message {
  display: flex;
  align-items: center;
  gap: var(--wc-spacing-xs);
}

.wc-progress-details__segment {
  font-variant-numeric: tabular-nums;
}

.wc-progress-details__time {
  font-variant-numeric: tabular-nums;
  color: var(--wc-gray-500);
}

/* Phase indicators */
.wc-progress-phase {
  display: inline-flex;
  align-items: center;
  gap: var(--wc-spacing-xs);
  padding: 2px var(--wc-spacing-sm);
  background: var(--wc-gray-100);
  border-radius: var(--wc-radius-sm);
  font-size: var(--wc-font-size-xs);
  font-weight: var(--wc-font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.wc-progress-phase--analyzing { color: var(--wc-primary-600); }
.wc-progress-phase--preparing { color: var(--wc-primary-600); }
.wc-progress-phase--capturing { color: var(--wc-primary-600); }
.wc-progress-phase--stitching { color: var(--wc-warning-600); }
.wc-progress-phase--compressing { color: var(--wc-warning-600); }
.wc-progress-phase--complete { color: var(--wc-success-600); }
```

### 20.5 Cancel Button Component

```css
/* Cancel Button */
.wc-btn-cancel {
  padding: var(--wc-spacing-xs) var(--wc-spacing-md);
  font-size: var(--wc-font-size-sm);
  font-weight: var(--wc-font-weight-medium);
  color: var(--wc-gray-700);
  background: var(--wc-gray-100);
  border: 1px solid var(--wc-gray-300);
  border-radius: var(--wc-radius-md);
  cursor: pointer;
  transition: all var(--wc-transition-fast);
  min-width: 44px;
  min-height: 32px;
}

.wc-btn-cancel:hover:not(:disabled) {
  background: var(--wc-gray-200);
  border-color: var(--wc-gray-400);
}

.wc-btn-cancel:focus-visible {
  outline: 2px solid var(--wc-primary-500);
  outline-offset: 2px;
}

.wc-btn-cancel:active:not(:disabled) {
  background: var(--wc-gray-300);
  transform: translateY(1px);
}

.wc-btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Cancel button tooltip when disabled */
.wc-btn-cancel[data-tooltip]:disabled::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: var(--wc-spacing-xs) var(--wc-spacing-sm);
  background: var(--wc-gray-900);
  color: white;
  font-size: var(--wc-font-size-xs);
  border-radius: var(--wc-radius-sm);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--wc-transition-fast);
}

.wc-btn-cancel[data-tooltip]:disabled:hover::after {
  opacity: 1;
}
```

### 20.6 Warning Dialog Component

```css
/* Warning Dialog Overlay */
.wc-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: wc-fade-in var(--wc-transition-fast);
}

@keyframes wc-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Warning Dialog */
.wc-dialog {
  background: white;
  border-radius: var(--wc-radius-lg);
  box-shadow: var(--wc-shadow-lg);
  max-width: 400px;
  width: calc(100% - 32px);
  animation: wc-slide-up var(--wc-transition-normal);
}

@keyframes wc-slide-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.wc-dialog__header {
  display: flex;
  align-items: center;
  gap: var(--wc-spacing-sm);
  padding: var(--wc-spacing-lg);
  border-bottom: 1px solid var(--wc-gray-200);
}

.wc-dialog__icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.wc-dialog__icon--warning {
  color: var(--wc-warning-500);
}

.wc-dialog__icon--error {
  color: var(--wc-error-500);
}

.wc-dialog__icon--info {
  color: var(--wc-primary-500);
}

.wc-dialog__title {
  font-size: var(--wc-font-size-lg);
  font-weight: var(--wc-font-weight-semibold);
  color: var(--wc-gray-900);
  margin: 0;
}

.wc-dialog__body {
  padding: var(--wc-spacing-lg);
}

.wc-dialog__message {
  font-size: var(--wc-font-size-base);
  color: var(--wc-gray-700);
  line-height: 1.5;
  margin: 0 0 var(--wc-spacing-md) 0;
}

.wc-dialog__details {
  background: var(--wc-gray-50);
  border-radius: var(--wc-radius-md);
  padding: var(--wc-spacing-md);
  font-size: var(--wc-font-size-sm);
  color: var(--wc-gray-600);
}

.wc-dialog__details-row {
  display: flex;
  justify-content: space-between;
  padding: var(--wc-spacing-xs) 0;
}

.wc-dialog__details-label {
  color: var(--wc-gray-500);
}

.wc-dialog__details-value {
  font-weight: var(--wc-font-weight-medium);
  color: var(--wc-gray-700);
}

.wc-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--wc-spacing-sm);
  padding: var(--wc-spacing-lg);
  border-top: 1px solid var(--wc-gray-200);
}

/* Dialog buttons */
.wc-dialog__btn {
  padding: var(--wc-spacing-sm) var(--wc-spacing-lg);
  font-size: var(--wc-font-size-base);
  font-weight: var(--wc-font-weight-medium);
  border-radius: var(--wc-radius-md);
  cursor: pointer;
  transition: all var(--wc-transition-fast);
  min-height: 40px;
}

.wc-dialog__btn--secondary {
  background: white;
  border: 1px solid var(--wc-gray-300);
  color: var(--wc-gray-700);
}

.wc-dialog__btn--secondary:hover {
  background: var(--wc-gray-50);
  border-color: var(--wc-gray-400);
}

.wc-dialog__btn--primary {
  background: var(--wc-primary-500);
  border: 1px solid var(--wc-primary-500);
  color: white;
}

.wc-dialog__btn--primary:hover {
  background: var(--wc-primary-600);
  border-color: var(--wc-primary-600);
}

.wc-dialog__btn:focus-visible {
  outline: 2px solid var(--wc-primary-500);
  outline-offset: 2px;
}
```

### 20.7 Result Display Component

```css
/* Result Container */
.wc-fullpage-result {
  padding: var(--wc-spacing-lg);
  background: white;
  border-radius: var(--wc-radius-lg);
  border: 1px solid var(--wc-gray-200);
}

.wc-fullpage-result__header {
  display: flex;
  align-items: center;
  gap: var(--wc-spacing-sm);
  margin-bottom: var(--wc-spacing-lg);
}

.wc-fullpage-result__icon {
  width: 24px;
  height: 24px;
  color: var(--wc-success-500);
}

.wc-fullpage-result__title {
  font-size: var(--wc-font-size-lg);
  font-weight: var(--wc-font-weight-semibold);
  color: var(--wc-gray-900);
  margin: 0;
}

/* Result Content Layout */
.wc-fullpage-result__content {
  display: flex;
  gap: var(--wc-spacing-lg);
  margin-bottom: var(--wc-spacing-lg);
}

/* Thumbnail Preview */
.wc-fullpage-result__preview {
  width: 120px;
  flex-shrink: 0;
}

.wc-fullpage-result__thumbnail {
  width: 100%;
  height: auto;
  max-height: 200px;
  object-fit: cover;
  object-position: top;
  border-radius: var(--wc-radius-md);
  border: 1px solid var(--wc-gray-200);
  background: var(--wc-gray-50);
}

/* Metadata */
.wc-fullpage-result__metadata {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--wc-spacing-sm);
}

.wc-fullpage-result__meta-row {
  display: flex;
  align-items: center;
  gap: var(--wc-spacing-sm);
  font-size: var(--wc-font-size-sm);
}

.wc-fullpage-result__meta-label {
  color: var(--wc-gray-500);
  min-width: 80px;
}

.wc-fullpage-result__meta-value {
  color: var(--wc-gray-900);
  font-weight: var(--wc-font-weight-medium);
  font-variant-numeric: tabular-nums;
}

/* Warning Badges */
.wc-fullpage-result__warnings {
  display: flex;
  flex-wrap: wrap;
  gap: var(--wc-spacing-xs);
  margin-top: var(--wc-spacing-sm);
}

.wc-warning-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--wc-spacing-xs);
  padding: 2px var(--wc-spacing-sm);
  background: var(--wc-warning-500);
  background: rgba(245, 158, 11, 0.1);
  color: var(--wc-warning-600);
  font-size: var(--wc-font-size-xs);
  font-weight: var(--wc-font-weight-medium);
  border-radius: var(--wc-radius-sm);
}

.wc-info-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--wc-spacing-xs);
  padding: 2px var(--wc-spacing-sm);
  background: rgba(59, 130, 246, 0.1);
  color: var(--wc-primary-600);
  font-size: var(--wc-font-size-xs);
  font-weight: var(--wc-font-weight-medium);
  border-radius: var(--wc-radius-sm);
}

/* Action Buttons */
.wc-fullpage-result__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--wc-spacing-sm);
  padding-top: var(--wc-spacing-md);
  border-top: 1px solid var(--wc-gray-200);
}

.wc-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--wc-spacing-xs);
  padding: var(--wc-spacing-sm) var(--wc-spacing-md);
  font-size: var(--wc-font-size-sm);
  font-weight: var(--wc-font-weight-medium);
  border-radius: var(--wc-radius-md);
  cursor: pointer;
  transition: all var(--wc-transition-fast);
  min-height: 36px;
}

.wc-action-btn--primary {
  background: var(--wc-primary-500);
  border: 1px solid var(--wc-primary-500);
  color: white;
  flex: 1;
}

.wc-action-btn--primary:hover {
  background: var(--wc-primary-600);
  border-color: var(--wc-primary-600);
}

.wc-action-btn--secondary {
  background: white;
  border: 1px solid var(--wc-gray-300);
  color: var(--wc-gray-700);
}

.wc-action-btn--secondary:hover {
  background: var(--wc-gray-50);
  border-color: var(--wc-gray-400);
}

.wc-action-btn:focus-visible {
  outline: 2px solid var(--wc-primary-500);
  outline-offset: 2px;
}

.wc-action-btn__icon {
  width: 16px;
  height: 16px;
}
```

### 20.8 Error State Component

```css
/* Error State */
.wc-fullpage-error {
  padding: var(--wc-spacing-lg);
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--wc-radius-lg);
}

.wc-fullpage-error__header {
  display: flex;
  align-items: center;
  gap: var(--wc-spacing-sm);
  margin-bottom: var(--wc-spacing-md);
}

.wc-fullpage-error__icon {
  width: 24px;
  height: 24px;
  color: var(--wc-error-500);
}

.wc-fullpage-error__title {
  font-size: var(--wc-font-size-base);
  font-weight: var(--wc-font-weight-semibold);
  color: var(--wc-error-600);
  margin: 0;
}

.wc-fullpage-error__message {
  font-size: var(--wc-font-size-sm);
  color: var(--wc-gray-700);
  margin-bottom: var(--wc-spacing-md);
}

.wc-fullpage-error__suggestions {
  background: white;
  border-radius: var(--wc-radius-md);
  padding: var(--wc-spacing-md);
  margin-bottom: var(--wc-spacing-md);
}

.wc-fullpage-error__suggestions-title {
  font-size: var(--wc-font-size-sm);
  font-weight: var(--wc-font-weight-medium);
  color: var(--wc-gray-700);
  margin: 0 0 var(--wc-spacing-sm) 0;
}

.wc-fullpage-error__suggestions-list {
  margin: 0;
  padding: 0 0 0 var(--wc-spacing-lg);
  font-size: var(--wc-font-size-sm);
  color: var(--wc-gray-600);
}

.wc-fullpage-error__suggestions-list li {
  margin-bottom: var(--wc-spacing-xs);
}

.wc-fullpage-error__actions {
  display: flex;
  gap: var(--wc-spacing-sm);
}
```

### 20.9 Dark Mode Support

```css
/* Dark Mode */
@media (prefers-color-scheme: dark) {
  :root {
    --wc-gray-50: #1f2937;
    --wc-gray-100: #374151;
    --wc-gray-200: #4b5563;
    --wc-gray-300: #6b7280;
    --wc-gray-500: #9ca3af;
    --wc-gray-700: #d1d5db;
    --wc-gray-900: #f9fafb;
  }

  .wc-fullpage-progress,
  .wc-fullpage-result {
    background: #1f2937;
    border-color: #374151;
  }

  .wc-dialog {
    background: #1f2937;
  }

  .wc-dialog__body,
  .wc-dialog__header,
  .wc-dialog__footer {
    border-color: #374151;
  }

  .wc-dialog__details {
    background: #111827;
  }

  .wc-dialog__btn--secondary {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }

  .wc-dialog__btn--secondary:hover {
    background: #4b5563;
  }

  .wc-fullpage-result__thumbnail {
    border-color: #374151;
    background: #111827;
  }

  .wc-fullpage-error {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
  }

  .wc-fullpage-error__suggestions {
    background: #111827;
  }

  .wc-action-btn--secondary {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }

  .wc-action-btn--secondary:hover {
    background: #4b5563;
  }
}
```

### 20.10 Reduced Motion Support

```css
/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .wc-progress-bar__fill,
  .wc-dialog,
  .wc-dialog-overlay,
  .wc-action-btn,
  .wc-btn-cancel {
    transition: none;
  }

  .wc-progress-bar__fill--active {
    animation: none;
    background: var(--wc-primary-500);
  }

  .wc-fullpage-progress__title-icon--spinning {
    animation: none;
  }

  @keyframes wc-fade-in {
    from { opacity: 1; }
    to { opacity: 1; }
  }

  @keyframes wc-slide-up {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
```

### 20.11 Mobile Responsive Styles

```css
/* Mobile Styles (popup width) */
@media (max-width: 360px) {
  .wc-fullpage-progress,
  .wc-fullpage-result {
    padding: var(--wc-spacing-md);
  }

  .wc-fullpage-result__content {
    flex-direction: column;
  }

  .wc-fullpage-result__preview {
    width: 100%;
    max-width: 200px;
  }

  .wc-fullpage-result__actions {
    flex-direction: column;
  }

  .wc-action-btn {
    width: 100%;
  }

  .wc-dialog__footer {
    flex-direction: column-reverse;
  }

  .wc-dialog__btn {
    width: 100%;
  }

  .wc-progress-details {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--wc-spacing-xs);
  }
}
```

### 20.12 Animation Keyframes

```css
/* Additional Animations */

/* Success checkmark animation */
@keyframes wc-checkmark-draw {
  0% {
    stroke-dashoffset: 24;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

.wc-success-checkmark {
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  animation: wc-checkmark-draw 0.3s ease-out 0.2s forwards;
}

/* Pulse animation for processing */
@keyframes wc-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.wc-processing-pulse {
  animation: wc-pulse 1.5s ease-in-out infinite;
}

/* Shake animation for errors */
@keyframes wc-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}

.wc-error-shake {
  animation: wc-shake 0.4s ease-out;
}
```

### 20.13 Component State Classes

```css
/* State Classes */

/* Progress States */
.wc-fullpage-progress[data-phase="analyzing"] .wc-progress-bar__fill {
  width: 5%;
}

.wc-fullpage-progress[data-phase="preparing"] .wc-progress-bar__fill {
  width: 10%;
}

.wc-fullpage-progress[data-phase="capturing"] .wc-progress-bar__fill {
  /* Width set dynamically via style attribute */
}

.wc-fullpage-progress[data-phase="stitching"] .wc-progress-bar__fill {
  /* Width set dynamically */
  background: var(--wc-warning-500);
}

.wc-fullpage-progress[data-phase="compressing"] .wc-progress-bar__fill {
  background: var(--wc-warning-500);
}

.wc-fullpage-progress[data-state="complete"] .wc-progress-bar__fill {
  width: 100%;
  background: var(--wc-success-500);
}

.wc-fullpage-progress[data-state="error"] .wc-progress-bar__fill {
  background: var(--wc-error-500);
}

/* Loading skeleton for preview */
.wc-fullpage-result__thumbnail--loading {
  background: linear-gradient(
    90deg,
    var(--wc-gray-100) 0%,
    var(--wc-gray-200) 50%,
    var(--wc-gray-100) 100%
  );
  background-size: 200% 100%;
  animation: wc-progress-shimmer 1.5s ease-in-out infinite;
}
```

---

## 21. Updated Acceptance Criteria

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC1 | Captures entire scrollable page up to configured limit | Page with 5000px height fully captured |
| AC2 | Fixed headers/footers not duplicated (hide strategy) | Sticky header appears once at top only |
| AC3 | Progress bar updates smoothly during capture | Visual inspection: no jumps > 10% |
| AC4 | Percentage display accurate to ±5% | Compare displayed vs actual progress |
| AC5 | Segment counter shows "X of Y" format | Visual inspection during capture |
| AC6 | Cancel button stops capture within 2 seconds | Timer test during mid-capture cancel |
| AC7 | Cancel confirmation shown after 5+ segments | Attempt cancel at segment 6+ |
| AC8 | Page restored after capture (scroll position) | Document.scrollTop matches original |
| AC9 | Page restored after cancel | Fixed elements visible, scroll restored |
| AC10 | Warning dialog shown for oversized pages | Test with 50,000px page |
| AC11 | Warning includes truncation details | Check message shows original vs captured |
| AC12 | ETA displayed for captures >10 segments | Visual inspection on long page |
| AC13 | Result shows preview thumbnail | Image visible at 120px width |
| AC14 | Result shows dimensions (W × H) | Format: "1920 × 12840 px" |
| AC15 | Result shows file size | Format: "2.3 MB" or "450 KB" |
| AC16 | Result shows format and quality | "JPEG (92% quality)" |
| AC17 | Warning badges display on truncated captures | "⚠ Truncated" badge visible |
| AC18 | All buttons have visible focus state | Tab through, verify outline |
| AC19 | Screen reader announces progress changes | VoiceOver/NVDA test |
| AC20 | Escape key cancels capture | Keyboard test |
| AC21 | Dark mode renders correctly | Toggle system preference |
| AC22 | Reduced motion disables animations | Enable reduced motion preference |
| AC23 | Mobile layout stacks vertically | Test at 320px width |
| AC24 | Error state shows recovery suggestions | Trigger timeout error |
| AC25 | "Try Again" resets to initial state | Click after error |
