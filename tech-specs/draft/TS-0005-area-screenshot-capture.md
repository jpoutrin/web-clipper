# TS-0005: Area Screenshot Capture

## Metadata

| Field | Value |
|-------|-------|
| Tech Spec ID | TS-0005 |
| Title | Area Screenshot Capture |
| Status | DRAFT |
| Author | |
| Created | 2026-01-17 |
| Last Updated | 2026-01-17 |
| Related RFC | - |
| Phase | 3 - Advanced Capture |
| Reviews | CTO Architecture, UX Expert, UI Product Expert |
| Depends On | TS-0003 |
| Location | tech-specs/draft/TS-0005-area-screenshot-capture.md |

## Executive Summary

Extend the Web Clipper extension to support area screenshot capture, allowing users to draw a rectangle on the page to capture a specific region. This feature complements the existing viewport screenshot mode (TS-0003) by providing precise control over what content is captured, ideal for capturing specific UI elements, code snippets, charts, or any targeted content without unnecessary surrounding context.

## Scope

| Component | Included | Notes |
|-----------|----------|-------|
| Area Selection Overlay UI | Yes | Canvas-based drawing interface |
| Rectangle Drawing | Yes | Mouse/touch event handling |
| Visual Feedback | Yes | Dashed border, dimmed outside area |
| Keyboard Controls | Yes | Escape to cancel, Enter to confirm |
| Minimum Size Constraints | Yes | Prevent accidental tiny captures |
| Cropping with OffscreenCanvas | Yes | Extract selected region from screenshot |
| Mobile/Touch Support | Yes | Basic touch event handling |
| Integration with TS-0003 | Yes | Extends CAPTURE_SCREENSHOT infrastructure |
| Multi-monitor Support | No | Phase 4 consideration |
| Scrollable Area Capture | No | Phase 4 - requires stitching |

---

## 1. Feature Overview

### 1.1 User Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER JOURNEY                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. INITIATE                    2. SELECT                    3. CAPTURE     │
│  ┌──────────┐                  ┌──────────────┐              ┌──────────┐   │
│  │  Click   │                  │    Draw      │              │  Review  │   │
│  │  Area    │ ────────────────>│  Rectangle   │ ───────────> │    &     │   │
│  │  Mode    │                  │   on Page    │              │  Confirm │   │
│  └──────────┘                  └──────────────┘              └──────────┘   │
│       │                              │                             │         │
│       ▼                              ▼                             ▼         │
│  Popup closes              Dimmed overlay appears          Screenshot taken  │
│  Overlay injects           Selection box follows cursor    Cropped to area   │
│                            Visual guides shown             Saved to server   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Detailed UX Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AREA SCREENSHOT MODE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │ ░░░░░░░░░░┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │ ░░░░░░░░░░│                          │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │ ░░░░░░░░░░│    SELECTED AREA         │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │ ░░░░░░░░░░│    (Clear, unshaded)     │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │ ░░░░░░░░░░│                          │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │ ░░░░░░░░░░│    320 x 180             │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │ ░░░░░░░░░░└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ░ = Dimmed overlay (rgba(0, 0, 0, 0.5))                                    │
│  ─ = Selection border (dashed, primary-500)                                  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         FLOATING TOOLBAR                                │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │  Click and drag to select an area  │ [Capture] │ [Cancel (Esc)] │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Type Definitions

### 2.1 Area Selection Types

**src/types/index.ts** (additions):

```typescript
// Area selection bounds
export interface AreaBounds {
  x: number;       // Left position relative to viewport
  y: number;       // Top position relative to viewport
  width: number;   // Width in CSS pixels
  height: number;  // Height in CSS pixels
}

// Area selection state
export type AreaSelectionState =
  | 'idle'         // Waiting for user to start drawing
  | 'drawing'      // User is actively drawing
  | 'selected'     // Area selected, waiting for confirmation
  | 'capturing'    // Taking screenshot and cropping
  | 'complete'     // Capture finished
  | 'cancelled';   // User cancelled

// Area selection event data
export interface AreaSelectionEvent {
  state: AreaSelectionState;
  bounds?: AreaBounds;
  error?: string;
}

// Area screenshot result
export interface AreaScreenshotResult {
  title: string;
  url: string;
  image: {
    filename: string;
    data: string;        // base64
    width: number;       // Cropped width
    height: number;      // Cropped height
    format: 'png' | 'jpeg';
  };
  selection: AreaBounds; // Original selection bounds
}

// Extended message types (add to existing MessageType union)
export type MessageType =
  | 'GET_STATE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'FETCH_CONFIG'
  | 'CAPTURE_PAGE'
  | 'CAPTURE_SCREENSHOT'
  | 'CAPTURE_AREA_SCREENSHOT'    // New: Initiate area capture
  | 'AREA_SELECTION_COMPLETE'    // New: Selection confirmed
  | 'AREA_SELECTION_CANCELLED'   // New: Selection cancelled
  | 'SUBMIT_CLIP'
  | 'AUTH_CALLBACK'
  | 'DEV_LOGIN';

// Extended ClipMode
export type ClipMode =
  | 'article'
  | 'bookmark'
  | 'screenshot'
  | 'area-screenshot'  // New
  | 'selection'
  | 'fullpage';
```

### 2.2 Configuration Types

```typescript
// Area selection configuration
export interface AreaSelectionConfig {
  minWidth: number;           // Minimum selection width (px)
  minHeight: number;          // Minimum selection height (px)
  showDimensions: boolean;    // Show width x height label
  snapToGrid: boolean;        // Snap to pixel grid (future)
  gridSize: number;           // Grid size for snapping (future)
}

// Default configuration
export const DEFAULT_AREA_CONFIG: AreaSelectionConfig = {
  minWidth: 20,
  minHeight: 20,
  showDimensions: true,
  snapToGrid: false,
  gridSize: 10
};
```

---

## 3. Overlay Component Implementation

### 3.1 Area Selection Overlay Class

**src/capture/area-selection-overlay.ts**:

```typescript
import { AreaBounds, AreaSelectionState, AreaSelectionConfig, DEFAULT_AREA_CONFIG } from '../types';

export class AreaSelectionOverlay {
  private shadowHost: HTMLDivElement;
  private shadowRoot: ShadowRoot;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private toolbar: HTMLDivElement;

  private state: AreaSelectionState = 'idle';
  private startPoint: { x: number; y: number } | null = null;
  private currentBounds: AreaBounds | null = null;
  private config: AreaSelectionConfig;

  private onConfirm: (bounds: AreaBounds) => void;
  private onCancel: () => void;

  // Device pixel ratio for high-DPI displays
  private dpr: number;

  constructor(
    onConfirm: (bounds: AreaBounds) => void,
    onCancel: () => void,
    config: Partial<AreaSelectionConfig> = {}
  ) {
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;
    this.config = { ...DEFAULT_AREA_CONFIG, ...config };
    this.dpr = window.devicePixelRatio || 1;

    // Create shadow DOM host
    this.shadowHost = this.createShadowHost();
    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'closed' });

    // Create and configure canvas
    this.canvas = this.createCanvas();
    this.ctx = this.canvas.getContext('2d')!;

    // Create toolbar
    this.toolbar = this.createToolbar();

    // Inject styles and elements
    this.shadowRoot.innerHTML = this.getStyles();
    this.shadowRoot.appendChild(this.canvas);
    this.shadowRoot.appendChild(this.toolbar);

    // Attach to DOM
    document.body.appendChild(this.shadowHost);

    // Set up event listeners
    this.attachEventListeners();

    // Initial render
    this.render();

    // Announce to screen readers
    this.announceToScreenReader('Area selection mode active. Click and drag to select an area. Press Escape to cancel.');
  }

  private createShadowHost(): HTMLDivElement {
    const host = document.createElement('div');
    host.id = 'web-clipper-area-selection-host';
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

  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.id = 'area-selection-canvas';

    // Set canvas size accounting for device pixel ratio
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width * this.dpr;
    canvas.height = height * this.dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    return canvas;
  }

  private createToolbar(): HTMLDivElement {
    const toolbar = document.createElement('div');
    toolbar.id = 'area-selection-toolbar';
    toolbar.setAttribute('role', 'dialog');
    toolbar.setAttribute('aria-label', 'Area selection toolbar');
    toolbar.innerHTML = `
      <span id="toolbar-instructions" class="instructions">
        Click and drag to select an area
      </span>
      <span id="dimensions-label" class="dimensions hidden" aria-live="polite"></span>
      <div class="toolbar-buttons">
        <button
          id="capture-btn"
          class="btn btn-primary"
          disabled
          aria-disabled="true"
        >
          Capture
        </button>
        <button id="cancel-btn" class="btn btn-secondary">
          Cancel <kbd>Esc</kbd>
        </button>
      </div>
    `;
    return toolbar;
  }

  private getStyles(): string {
    return `
      <style>
        * {
          box-sizing: border-box;
        }

        #area-selection-canvas {
          position: absolute;
          top: 0;
          left: 0;
          cursor: crosshair;
        }

        #area-selection-toolbar {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 12px 20px;
          display: flex;
          gap: 16px;
          align-items: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          z-index: 1;
          color: #374151;
        }

        .instructions {
          color: #6b7280;
        }

        .dimensions {
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
          font-size: 12px;
          color: #3b82f6;
          background: #eff6ff;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .dimensions.hidden {
          display: none;
        }

        .toolbar-buttons {
          display: flex;
          gap: 8px;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-primary:active:not(:disabled) {
          background: #1d4ed8;
        }

        .btn-primary:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        kbd {
          font-family: inherit;
          font-size: 11px;
          padding: 2px 6px;
          background: #e5e7eb;
          border-radius: 4px;
          margin-left: 4px;
        }

        /* Dark mode */
        @media (prefers-color-scheme: dark) {
          #area-selection-toolbar {
            background: #1f2937;
            color: #f3f4f6;
          }

          .instructions {
            color: #9ca3af;
          }

          .dimensions {
            background: #1e3a8a;
            color: #93c5fd;
          }

          .btn-secondary {
            background: #374151;
            color: #f3f4f6;
          }

          .btn-secondary:hover {
            background: #4b5563;
          }

          kbd {
            background: #4b5563;
          }
        }

        /* Screen reader only */
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

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .btn {
            transition: none;
          }
        }
      </style>
    `;
  }

  private attachEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);

    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd);

    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown);

    // Window resize
    window.addEventListener('resize', this.handleResize);

    // Toolbar buttons
    const captureBtn = this.shadowRoot.getElementById('capture-btn');
    const cancelBtn = this.shadowRoot.getElementById('cancel-btn');

    captureBtn?.addEventListener('click', this.handleConfirm);
    cancelBtn?.addEventListener('click', this.handleCancel);
  }

  private removeEventListeners(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    document.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('resize', this.handleResize);
  }

  // Event Handlers

  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return; // Only left click

    this.startDrawing(e.clientX, e.clientY);
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (this.state !== 'drawing') return;

    this.updateDrawing(e.clientX, e.clientY);
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (this.state !== 'drawing') return;

    this.finishDrawing(e.clientX, e.clientY);
  };

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault(); // Prevent scrolling

    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    this.startDrawing(touch.clientX, touch.clientY);
  };

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();

    if (this.state !== 'drawing' || e.touches.length !== 1) return;

    const touch = e.touches[0];
    this.updateDrawing(touch.clientX, touch.clientY);
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    if (this.state !== 'drawing') return;

    // Use last known position from changedTouches
    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      this.finishDrawing(touch.clientX, touch.clientY);
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this.handleCancel();
        break;

      case 'Enter':
        e.preventDefault();
        if (this.state === 'selected' && this.currentBounds) {
          this.handleConfirm();
        }
        break;
    }
  };

  private handleResize = (): void => {
    // Update canvas size
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // Reset selection on resize
    this.state = 'idle';
    this.startPoint = null;
    this.currentBounds = null;
    this.updateToolbar();
    this.render();
  };

  private handleConfirm = (): void => {
    if (this.state !== 'selected' || !this.currentBounds) return;

    this.state = 'complete';
    const bounds = { ...this.currentBounds };
    this.cleanup();
    this.onConfirm(bounds);
  };

  private handleCancel = (): void => {
    this.state = 'cancelled';
    this.cleanup();
    this.onCancel();
  };

  // Drawing Logic

  private startDrawing(x: number, y: number): void {
    this.state = 'drawing';
    this.startPoint = { x, y };
    this.currentBounds = { x, y, width: 0, height: 0 };
    this.updateToolbar();
    this.render();
  }

  private updateDrawing(x: number, y: number): void {
    if (!this.startPoint) return;

    // Calculate bounds (handle negative dimensions from dragging backwards)
    const minX = Math.min(this.startPoint.x, x);
    const minY = Math.min(this.startPoint.y, y);
    const maxX = Math.max(this.startPoint.x, x);
    const maxY = Math.max(this.startPoint.y, y);

    this.currentBounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };

    this.updateDimensionsLabel();
    this.render();
  }

  private finishDrawing(x: number, y: number): void {
    this.updateDrawing(x, y);

    // Check minimum size
    if (this.currentBounds) {
      const meetsMinSize =
        this.currentBounds.width >= this.config.minWidth &&
        this.currentBounds.height >= this.config.minHeight;

      if (meetsMinSize) {
        this.state = 'selected';
        this.announceToScreenReader(
          `Selected area: ${this.currentBounds.width} by ${this.currentBounds.height} pixels. Press Enter to capture or Escape to cancel.`
        );
      } else {
        // Selection too small, reset
        this.state = 'idle';
        this.startPoint = null;
        this.currentBounds = null;
        this.announceToScreenReader(
          `Selection too small. Minimum size is ${this.config.minWidth} by ${this.config.minHeight} pixels.`
        );
      }
    }

    this.startPoint = null;
    this.updateToolbar();
    this.render();
  }

  // Rendering

  private render(): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Scale for device pixel ratio
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Clear canvas
    ctx.clearRect(0, 0, width / this.dpr, height / this.dpr);

    // Draw dimmed overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width / this.dpr, height / this.dpr);

    // If we have a selection, cut out the selected area
    if (this.currentBounds && (this.state === 'drawing' || this.state === 'selected')) {
      const { x, y, width: w, height: h } = this.currentBounds;

      // Clear the selected area (makes it transparent to show page content)
      ctx.clearRect(x, y, w, h);

      // Draw selection border
      ctx.strokeStyle = '#3b82f6'; // primary-500
      ctx.lineWidth = 2;

      if (this.state === 'drawing') {
        // Dashed border while drawing
        ctx.setLineDash([6, 4]);
      } else {
        // Solid border when selected
        ctx.setLineDash([]);
      }

      ctx.strokeRect(x, y, w, h);

      // Draw corner handles when selected
      if (this.state === 'selected') {
        this.drawCornerHandles(x, y, w, h);
      }

      // Draw dimensions label inside selection if enabled
      if (this.config.showDimensions && w > 60 && h > 30) {
        this.drawDimensionsInSelection(x, y, w, h);
      }
    }

    // Reset line dash
    ctx.setLineDash([]);
  }

  private drawCornerHandles(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    const handleSize = 8;

    ctx.fillStyle = '#3b82f6';

    // Corner positions
    const corners = [
      { x: x, y: y },                     // Top-left
      { x: x + w, y: y },                 // Top-right
      { x: x, y: y + h },                 // Bottom-left
      { x: x + w, y: y + h }              // Bottom-right
    ];

    corners.forEach(corner => {
      ctx.fillRect(
        corner.x - handleSize / 2,
        corner.y - handleSize / 2,
        handleSize,
        handleSize
      );
    });
  }

  private drawDimensionsInSelection(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    const text = `${Math.round(w)} x ${Math.round(h)}`;

    ctx.font = '12px "SF Mono", Monaco, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Background pill
    const textMetrics = ctx.measureText(text);
    const padding = 6;
    const pillWidth = textMetrics.width + padding * 2;
    const pillHeight = 20;
    const pillX = x + w / 2 - pillWidth / 2;
    const pillY = y + h / 2 - pillHeight / 2;

    ctx.fillStyle = 'rgba(59, 130, 246, 0.9)'; // primary-500 with opacity
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 4);
    ctx.fill();

    // Text
    ctx.fillStyle = 'white';
    ctx.fillText(text, x + w / 2, y + h / 2);
  }

  // UI Updates

  private updateToolbar(): void {
    const captureBtn = this.shadowRoot.getElementById('capture-btn') as HTMLButtonElement;
    const instructions = this.shadowRoot.getElementById('toolbar-instructions');

    if (captureBtn) {
      const enabled = this.state === 'selected' && this.currentBounds !== null;
      captureBtn.disabled = !enabled;
      captureBtn.setAttribute('aria-disabled', String(!enabled));
    }

    if (instructions) {
      switch (this.state) {
        case 'idle':
          instructions.textContent = 'Click and drag to select an area';
          break;
        case 'drawing':
          instructions.textContent = 'Release to finish selection';
          break;
        case 'selected':
          instructions.textContent = 'Adjust or capture your selection';
          break;
      }
    }
  }

  private updateDimensionsLabel(): void {
    const label = this.shadowRoot.getElementById('dimensions-label');

    if (label && this.currentBounds) {
      label.textContent = `${Math.round(this.currentBounds.width)} x ${Math.round(this.currentBounds.height)}`;
      label.classList.remove('hidden');
    }
  }

  private announceToScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    this.shadowRoot.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => announcement.remove(), 1000);
  }

  // Cleanup

  private cleanup(): void {
    this.removeEventListeners();
    this.shadowHost.remove();
  }

  // Public methods

  public getState(): AreaSelectionState {
    return this.state;
  }

  public getBounds(): AreaBounds | null {
    return this.currentBounds ? { ...this.currentBounds } : null;
  }

  public destroy(): void {
    this.cleanup();
  }
}
```

---

## 4. Cropping Implementation

### 4.1 Screenshot Cropping with OffscreenCanvas

**src/capture/area-screenshot.ts**:

```typescript
import { AreaBounds, AreaScreenshotResult } from '../types';

export interface CropConfig {
  maxSizeBytes: number;
  maxDimensionPx: number;
}

/**
 * Crops a full-page screenshot to the specified area bounds.
 * Uses OffscreenCanvas for efficient processing in background context.
 */
export async function cropScreenshot(
  fullScreenshotDataUrl: string,
  bounds: AreaBounds,
  config: CropConfig
): Promise<{ data: string; width: number; height: number; format: 'png' | 'jpeg' }> {
  // Load the full screenshot
  const img = await loadImage(fullScreenshotDataUrl);

  // Calculate device pixel ratio scaling
  // The screenshot is captured at device pixel ratio, but bounds are in CSS pixels
  const dpr = window.devicePixelRatio || 1;

  // Scale bounds to match screenshot resolution
  const scaledBounds: AreaBounds = {
    x: Math.round(bounds.x * dpr),
    y: Math.round(bounds.y * dpr),
    width: Math.round(bounds.width * dpr),
    height: Math.round(bounds.height * dpr)
  };

  // Clamp to image boundaries
  const clampedBounds = clampBounds(scaledBounds, img.width, img.height);

  // Create canvas for cropping
  const canvas = new OffscreenCanvas(clampedBounds.width, clampedBounds.height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw the cropped region
  ctx.drawImage(
    img,
    clampedBounds.x,
    clampedBounds.y,
    clampedBounds.width,
    clampedBounds.height,
    0,
    0,
    clampedBounds.width,
    clampedBounds.height
  );

  // Apply resizing if needed
  const resizedCanvas = await resizeIfNeeded(canvas, config.maxDimensionPx);

  // Convert to blob with compression
  const result = await compressToBlob(resizedCanvas, config.maxSizeBytes);

  // Convert blob to base64
  const base64 = await blobToBase64(result.blob);

  return {
    data: base64,
    width: resizedCanvas.width,
    height: resizedCanvas.height,
    format: result.format
  };
}

/**
 * Load an image from a data URL.
 */
function loadImage(dataUrl: string): Promise<ImageBitmap> {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);
      resolve(bitmap);
    } catch (err) {
      reject(new Error(`Failed to load image: ${err}`));
    }
  });
}

/**
 * Clamp bounds to stay within image dimensions.
 */
function clampBounds(bounds: AreaBounds, imgWidth: number, imgHeight: number): AreaBounds {
  const x = Math.max(0, Math.min(bounds.x, imgWidth));
  const y = Math.max(0, Math.min(bounds.y, imgHeight));
  const width = Math.min(bounds.width, imgWidth - x);
  const height = Math.min(bounds.height, imgHeight - y);

  return { x, y, width, height };
}

/**
 * Resize canvas if it exceeds maximum dimensions.
 */
async function resizeIfNeeded(
  canvas: OffscreenCanvas,
  maxDimension: number
): Promise<OffscreenCanvas> {
  const { width, height } = canvas;

  if (width <= maxDimension && height <= maxDimension) {
    return canvas;
  }

  // Calculate new dimensions maintaining aspect ratio
  let newWidth: number;
  let newHeight: number;

  if (width > height) {
    newWidth = maxDimension;
    newHeight = Math.round((height / width) * maxDimension);
  } else {
    newHeight = maxDimension;
    newWidth = Math.round((width / height) * maxDimension);
  }

  // Create resized canvas
  const resizedCanvas = new OffscreenCanvas(newWidth, newHeight);
  const ctx = resizedCanvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context for resizing');
  }

  // Use high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw resized image
  const bitmap = await createImageBitmap(canvas);
  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);

  return resizedCanvas;
}

/**
 * Compress canvas to blob, trying PNG first, then JPEG with quality reduction.
 */
async function compressToBlob(
  canvas: OffscreenCanvas,
  maxSizeBytes: number
): Promise<{ blob: Blob; format: 'png' | 'jpeg' }> {
  // Try PNG first
  let blob = await canvas.convertToBlob({ type: 'image/png' });

  if (blob.size <= maxSizeBytes) {
    return { blob, format: 'png' };
  }

  // Fall back to JPEG with quality reduction
  let quality = 0.92;
  while (quality > 0.3) {
    blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });

    if (blob.size <= maxSizeBytes) {
      return { blob, format: 'jpeg' };
    }

    quality -= 0.1;
  }

  // Return best effort JPEG
  return { blob, format: 'jpeg' };
}

/**
 * Convert blob to base64 string.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Remove data URL prefix to get raw base64
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };

    reader.onerror = () => reject(new Error('Failed to convert blob to base64'));
    reader.readAsDataURL(blob);
  });
}
```

---

## 5. Background Script Integration

### 5.1 Message Handler Updates

**src/background.ts** (additions):

```typescript
import { AreaBounds, AreaScreenshotResult } from './types';
import { cropScreenshot } from './capture/area-screenshot';

// Add to message handler switch statement
case 'CAPTURE_AREA_SCREENSHOT':
  return initiateAreaCapture();

case 'AREA_SELECTION_COMPLETE':
  return handleAreaSelectionComplete(message.payload as { bounds: AreaBounds });

case 'AREA_SELECTION_CANCELLED':
  return handleAreaSelectionCancelled();

// Pending area capture state
let pendingAreaCapture: {
  tabId: number;
  windowId: number;
} | null = null;

/**
 * Initiate area screenshot capture by injecting the selection overlay.
 */
async function initiateAreaCapture(): Promise<{ success: boolean } | { error: string }> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id || !tab.windowId) {
      return { error: 'No active tab' };
    }

    // Store pending capture state
    pendingAreaCapture = {
      tabId: tab.id,
      windowId: tab.windowId
    };

    // Inject the area selection overlay via content script
    await chrome.tabs.sendMessage(tab.id, {
      type: 'START_AREA_SELECTION'
    });

    return { success: true };
  } catch (err) {
    pendingAreaCapture = null;
    return { error: `Failed to initiate area capture: ${err}` };
  }
}

/**
 * Handle completed area selection - capture and crop screenshot.
 */
async function handleAreaSelectionComplete(
  payload: { bounds: AreaBounds }
): Promise<AreaScreenshotResult | { error: string }> {
  if (!pendingAreaCapture) {
    return { error: 'No pending area capture' };
  }

  const { tabId, windowId } = pendingAreaCapture;
  pendingAreaCapture = null;

  try {
    // Get tab info for title and URL
    const tab = await chrome.tabs.get(tabId);

    // Capture the full visible tab
    const fullScreenshot = await chrome.tabs.captureVisibleTab(windowId, {
      format: 'png',
      quality: 100
    });

    // Get capture config
    const config = serverConfig?.images || {
      maxSizeBytes: 5242880,
      maxDimensionPx: 2048
    };

    // Crop to selected area
    const croppedImage = await cropScreenshot(fullScreenshot, payload.bounds, {
      maxSizeBytes: config.maxSizeBytes,
      maxDimensionPx: config.maxDimensionPx
    });

    const result: AreaScreenshotResult = {
      title: tab.title || 'Area Screenshot',
      url: tab.url || '',
      image: {
        filename: `area-screenshot-${Date.now()}.${croppedImage.format}`,
        data: croppedImage.data,
        width: croppedImage.width,
        height: croppedImage.height,
        format: croppedImage.format
      },
      selection: payload.bounds
    };

    return result;
  } catch (err) {
    return { error: `Failed to capture area screenshot: ${err}` };
  }
}

/**
 * Handle cancelled area selection.
 */
function handleAreaSelectionCancelled(): { cancelled: boolean } {
  pendingAreaCapture = null;
  return { cancelled: true };
}
```

---

## 6. Content Script Integration

### 6.1 Content Script Message Handler

**src/content.ts** (additions):

```typescript
import { AreaSelectionOverlay } from './capture/area-selection-overlay';

let areaSelectionOverlay: AreaSelectionOverlay | null = null;

// Add to message handler
case 'START_AREA_SELECTION':
  startAreaSelection();
  return { started: true };

case 'CANCEL_AREA_SELECTION':
  cancelAreaSelection();
  return { cancelled: true };

/**
 * Start area selection mode by creating the overlay.
 */
function startAreaSelection(): void {
  // Clean up any existing overlay
  if (areaSelectionOverlay) {
    areaSelectionOverlay.destroy();
    areaSelectionOverlay = null;
  }

  areaSelectionOverlay = new AreaSelectionOverlay(
    // On confirm
    async (bounds) => {
      areaSelectionOverlay = null;

      // Send bounds to background script for capture
      const result = await chrome.runtime.sendMessage({
        type: 'AREA_SELECTION_COMPLETE',
        payload: { bounds }
      });

      if ('error' in result) {
        console.error('Area capture failed:', result.error);
        // Could show error notification here
      }
    },
    // On cancel
    () => {
      areaSelectionOverlay = null;

      chrome.runtime.sendMessage({
        type: 'AREA_SELECTION_CANCELLED'
      });
    }
  );
}

/**
 * Cancel area selection mode.
 */
function cancelAreaSelection(): void {
  if (areaSelectionOverlay) {
    areaSelectionOverlay.destroy();
    areaSelectionOverlay = null;
  }
}
```

---

## 7. Popup Integration

### 7.1 Mode Button Addition

**src/popup/popup.html** (additions to mode selector):

```html
<button class="mode-btn" data-mode="area-screenshot">
  <span class="icon" aria-hidden="true">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 2"/>
      <path d="M9 9h6v6H9z"/>
    </svg>
  </span>
  <span class="label">Area</span>
</button>
```

### 7.2 Mode Handler

**src/popup/popup.ts** (additions):

```typescript
case 'area-screenshot':
  // Close popup and start area selection mode
  const areaResponse = await chrome.runtime.sendMessage({
    type: 'CAPTURE_AREA_SCREENSHOT'
  });

  if ('error' in areaResponse) {
    showMessage(areaResponse.error, 'error');
    return;
  }

  // Close popup - selection happens on page
  window.close();
  return;
```

---

## 8. Acceptance Criteria

| ID | Criterion | Test Method |
|----|-----------|-------------|
| AC1 | User can initiate area selection from popup | Click "Area" mode, verify overlay appears on page |
| AC2 | Rectangle can be drawn by click-and-drag | Draw rectangle, verify visual feedback shows bounds |
| AC3 | Selection shows dashed border while drawing | Observe border style during drag operation |
| AC4 | Outside area is dimmed with overlay | Verify 50% opacity dark overlay outside selection |
| AC5 | Dimensions displayed in real-time | Verify width x height label updates during drag |
| AC6 | Minimum size constraint enforced | Try to select < 20x20px area, verify rejection |
| AC7 | Escape key cancels selection | Press Escape during/after selection, verify cancel |
| AC8 | Enter key confirms selection | Press Enter after selection, verify capture triggers |
| AC9 | Cancel button works | Click Cancel button, verify overlay closes |
| AC10 | Capture button enables only when selected | Verify button disabled until valid selection |
| AC11 | Screenshot cropped to exact selection | Capture area, verify image dimensions match selection |
| AC12 | High-DPI displays handled correctly | Test on Retina display, verify crisp capture |
| AC13 | Touch input supported | On touch device, verify draw-to-select works |
| AC14 | Screen reader announcements work | Test with VoiceOver/NVDA, verify announcements |
| AC15 | Dark mode styling correct | Enable dark mode, verify toolbar adapts |
| AC16 | Image compression applies when needed | Capture large area, verify size within limits |

---

## 9. Accessibility Requirements

### 9.1 WCAG 2.1 Compliance

| Criterion | Level | Implementation |
|-----------|-------|----------------|
| 1.4.3 Contrast | AA | Toolbar text meets 4.5:1 ratio |
| 2.1.1 Keyboard | A | Escape/Enter keyboard controls |
| 2.4.7 Focus Visible | AA | Focus ring on toolbar buttons |
| 4.1.2 Name, Role, Value | A | ARIA labels on all controls |
| 1.4.11 Non-text Contrast | AA | Selection border visible (3:1 against page) |

### 9.2 Screen Reader Behavior

| Event | Announcement |
|-------|--------------|
| Mode activated | "Area selection mode active. Click and drag to select an area. Press Escape to cancel." |
| Drawing started | (No announcement - visual feedback only) |
| Selection too small | "Selection too small. Minimum size is 20 by 20 pixels." |
| Selection complete | "Selected area: [width] by [height] pixels. Press Enter to capture or Escape to cancel." |
| Capture initiated | "Capturing selected area..." |
| Capture complete | "Area screenshot saved successfully." |
| Cancelled | "Area selection cancelled." |

### 9.3 Keyboard Navigation

| Key | Context | Action |
|-----|---------|--------|
| Tab | Toolbar | Navigate between buttons |
| Enter | Toolbar / After selection | Confirm and capture |
| Escape | Any | Cancel and close overlay |
| Space | Button focused | Activate button |

---

## 10. Mobile and Touch Support

### 10.1 Touch Event Handling

| Gesture | Action |
|---------|--------|
| Single finger drag | Draw selection rectangle |
| Lift finger | Complete selection |
| Two-finger tap | Cancel (future enhancement) |

### 10.2 Responsive Considerations

```css
/* Mobile toolbar adjustments */
@media (max-width: 600px) {
  #area-selection-toolbar {
    top: auto;
    bottom: 20px;
    width: calc(100% - 40px);
    max-width: none;
    flex-wrap: wrap;
    justify-content: center;
  }

  .instructions {
    width: 100%;
    text-align: center;
    margin-bottom: 8px;
  }
}
```

### 10.3 Touch-Specific UX

- Larger touch targets (minimum 44x44px)
- Visual feedback on touch start
- Prevent accidental page scrolling during selection
- Consider pinch-to-adjust selection (future enhancement)

---

## 11. Implementation Order

### Phase 3a: Foundation
1. Add type definitions for area selection
2. Implement AreaSelectionOverlay class
3. Add basic canvas rendering

### Phase 3b: Interaction
4. Implement mouse event handling
5. Add keyboard shortcuts (Escape, Enter)
6. Implement minimum size constraint

### Phase 3c: Visual Polish
7. Add dimmed overlay effect
8. Implement dimensions label
9. Add corner handles for selected state

### Phase 3d: Capture Integration
10. Implement cropScreenshot utility
11. Add background script message handlers
12. Connect content script to background

### Phase 3e: Popup Integration
13. Add Area mode button to popup
14. Implement mode handler
15. Handle capture result submission

### Phase 3f: Quality & Polish
16. Add touch event support
17. Implement accessibility features
18. Test high-DPI displays
19. Add dark mode support

---

## 12. Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Device pixel ratio mismatch | Incorrect crop bounds | Medium | Detect DPR, scale bounds accordingly |
| Overlay conflicts with page z-index | Overlay hidden | Low | Use max z-index (2147483647), Shadow DOM isolation |
| Page scrolls during selection | Bounds invalidated | Medium | Prevent default on touch events, capture on current scroll position |
| Screenshot capture fails on some pages | Feature broken | Low | Graceful error handling, fallback messaging |
| Touch events interfere with page | Poor mobile UX | Medium | Careful event handling, clear cancel mechanism |
| Memory pressure from large captures | Crashes/slowdowns | Low | Streaming processing, size limits |
| Cross-origin iframe content | Incomplete capture | Medium | Document limitation, capture visible content only |
| High-latency capture on slow devices | Poor UX | Low | Show loading state, optimize canvas operations |

---

## 13. Design System Compliance

### 13.1 Color Usage

| Element | Token | Value | Usage |
|---------|-------|-------|-------|
| Selection border | primary-500 | #3b82f6 | Dashed/solid border around selection |
| Dimmed overlay | custom | rgba(0,0,0,0.5) | Outside selection area |
| Confirm button | primary-500 | #3b82f6 | Capture button background |
| Dimensions label | primary-500 + primary-50 | #3b82f6 / #eff6ff | Text on light background |
| Corner handles | primary-500 | #3b82f6 | Selection handles |

### 13.2 Typography

| Element | Size | Weight | Font |
|---------|------|--------|------|
| Toolbar instructions | 14px | 400 | System sans-serif |
| Button text | 14px | 500 | System sans-serif |
| Dimensions label | 12px | 400 | SF Mono / monospace |
| Keyboard hints | 11px | 400 | System sans-serif |

### 13.3 Spacing

| Element | Property | Value |
|---------|----------|-------|
| Toolbar | padding | 12px 20px |
| Toolbar buttons | gap | 8px |
| Button | padding | 8px 16px |
| Corner handles | size | 8x8px |

---

## 14. Dependencies

### 14.1 Browser APIs Used

| API | Permission | Purpose |
|-----|------------|---------|
| `chrome.tabs.captureVisibleTab` | `activeTab` | Capture full viewport |
| `chrome.scripting.executeScript` | `scripting` | Inject overlay if needed |
| `OffscreenCanvas` | (none) | Image cropping |
| `createImageBitmap` | (none) | Image processing |

### 14.2 Extension Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| (none new) | - | Uses existing extension dependencies |

---

## 15. Testing Strategy

### 15.1 Unit Tests

```typescript
// area-screenshot.test.ts
describe('cropScreenshot', () => {
  it('crops image to specified bounds', async () => {
    const mockDataUrl = createMockImageDataUrl(1920, 1080);
    const bounds = { x: 100, y: 100, width: 200, height: 150 };

    const result = await cropScreenshot(mockDataUrl, bounds, {
      maxSizeBytes: 5242880,
      maxDimensionPx: 2048
    });

    expect(result.width).toBe(200);
    expect(result.height).toBe(150);
  });

  it('handles DPR scaling correctly', async () => {
    // Mock window.devicePixelRatio = 2
    const bounds = { x: 50, y: 50, width: 100, height: 100 };
    // Expect actual crop at 100, 100, 200, 200 on a 2x image
  });

  it('enforces maximum dimensions', async () => {
    const bounds = { x: 0, y: 0, width: 4000, height: 3000 };
    const result = await cropScreenshot(mockDataUrl, bounds, {
      maxSizeBytes: 5242880,
      maxDimensionPx: 2048
    });

    expect(result.width).toBeLessThanOrEqual(2048);
    expect(result.height).toBeLessThanOrEqual(2048);
  });

  it('falls back to JPEG when PNG too large', async () => {
    const result = await cropScreenshot(largeImageDataUrl, bounds, {
      maxSizeBytes: 100000, // Very small limit
      maxDimensionPx: 2048
    });

    expect(result.format).toBe('jpeg');
  });
});
```

### 15.2 Integration Tests

```typescript
// area-selection-overlay.test.ts
describe('AreaSelectionOverlay', () => {
  it('creates overlay in Shadow DOM', () => {
    const overlay = new AreaSelectionOverlay(() => {}, () => {});
    const host = document.getElementById('web-clipper-area-selection-host');

    expect(host).toBeTruthy();
    expect(host?.shadowRoot).toBeFalsy(); // Closed shadow root
  });

  it('handles mousedown/move/up sequence', () => {
    // Simulate drawing gesture
  });

  it('enforces minimum selection size', () => {
    // Try to select 10x10, verify rejection
  });

  it('calls onConfirm with correct bounds', () => {
    // Complete selection, verify callback
  });

  it('calls onCancel on Escape', () => {
    // Press Escape, verify callback
  });
});
```

### 15.3 Manual Testing Checklist

- [ ] Draw selection on various page types (text-heavy, image-heavy, complex layouts)
- [ ] Test on high-DPI display (Retina)
- [ ] Test on standard DPI display
- [ ] Test with dark mode enabled
- [ ] Test with reduced motion preference
- [ ] Test keyboard-only navigation
- [ ] Test with screen reader (VoiceOver, NVDA)
- [ ] Test touch input on tablet/phone
- [ ] Test selection near page edges
- [ ] Test very large selection (full viewport)
- [ ] Test very small selection (near minimum)
- [ ] Test rapid repeated selections
- [ ] Test during page with fixed position elements
- [ ] Test on page with high z-index elements

---

## 16. UX Specifications

### 16.1 User Flow Analysis

#### Primary User Journey

```
User opens extension popup
    |
    v
User selects "Area" capture mode
    |
    v
Popup closes automatically
    |
    v
Full-screen overlay appears with:
  - Crosshair cursor
  - Floating toolbar with instructions
  - Dimmed background (semi-transparent)
    |
    v
User clicks and drags to draw rectangle
    |
    +--- While dragging:
    |      - Selection rectangle follows cursor
    |      - Dimensions displayed in real-time
    |      - Outside area remains dimmed
    |
    v
User releases mouse button
    |
    +--- If area >= minimum (20x20):
    |      - Selection confirmed with solid border
    |      - Corner handles appear for adjustment
    |      - Capture/Cancel buttons enabled
    |
    +--- If area < minimum:
    |      - Selection rejected
    |      - Screen reader announces: "Selection too small"
    |      - User can try again
    |
    v
User confirms capture (Enter key or Capture button)
    |
    v
Screenshot taken and cropped
    |
    v
Overlay closes, success feedback shown
```

### 16.2 Selection Interaction Patterns

#### Mouse Interaction

| Gesture | Action | Visual Feedback |
|---------|--------|-----------------|
| Click + Drag | Draw new selection | Dashed rectangle appears |
| Release | Confirm selection | Border becomes solid |
| Click outside selection | Start new selection | Previous selection replaced |
| Click on corner handle | Resize selection | Handle highlighted |

#### Keyboard Interaction

| Key | State | Action |
|-----|-------|--------|
| `Escape` | Any | Cancel and close overlay |
| `Enter` | Selection active | Confirm capture |
| `Tab` | Any | Navigate toolbar elements |
| `Space` | Button focused | Activate button |
| `Arrow keys` | Future: resize | Adjust selection by 1px |

#### Touch Interaction

| Gesture | Action |
|---------|--------|
| Single finger drag | Draw selection |
| Lift finger | Complete selection |
| Two-finger tap | Cancel (future) |
| Long press | Context menu (disabled) |

### 16.3 Selection Adjustment (Post-Draw)

#### Handle Behavior

Users can refine their selection after the initial draw:

```
┌─ ─ ─ ─[○]─ ─ ─ ─[○]─ ─ ─ ─┐
│                             │
[○]       SELECTED AREA      [○]
│                             │
│         320 × 180           │
│                             │
[○]                          [○]
└─ ─ ─ ─[○]─ ─ ─ ─[○]─ ─ ─ ─┘

[○] = Resize handle (draggable)
```

**Handle Cursors:**
- Corner handles: `nwse-resize`, `nesw-resize`
- Edge handles: `ns-resize`, `ew-resize`

**Resize Constraints:**
- Maintain minimum 20×20px size
- Constrain to viewport boundaries
- Visual feedback when hitting limits

### 16.4 Feedback States

#### State Transitions

```
IDLE (cursor: crosshair)
    |
    +--- mousedown ---> DRAWING (cursor: crosshair)
    |                        |
    |                        +--- mouseup (valid) ---> SELECTED
    |                        |                              |
    |                        +--- mouseup (invalid) ---> IDLE
    |                        |                              |
    |<---------------------- Escape key ------------------- +
    |                                                        |
    |<---------------------- Cancel button ----------------- +
    |                                                        |
CAPTURING <--------------- Enter/Capture button ------------ +
    |
    v
COMPLETE ---> Overlay closes
```

### 16.5 Error Prevention

#### Accidental Click Prevention

- Minimum drag distance of 5px before selection starts
- Accidental single clicks don't create microscopic selections
- Release within 100ms without movement = ignored

#### Accidental Escape Prevention

- No confirmation dialog (too slow for screenshot workflow)
- Instead: Clear visual state makes current action obvious
- If selection exists, Escape clears selection first (second Escape closes)

### 16.6 Visual Feedback Timing

| Event | Response Time | Animation |
|-------|---------------|-----------|
| Mode activation | < 100ms | Overlay fade-in (150ms) |
| Drawing start | Immediate | Rectangle appears |
| Dimension update | Every frame | Smooth text update |
| Selection confirm | Immediate | Border solid + handles appear |
| Capture start | < 50ms | Brief flash/freeze |
| Success | < 100ms | Overlay fade-out (150ms) |

### 16.7 Accessibility Enhancements

#### Screen Reader Flow

1. **Overlay opens**: "Area selection mode. Click and drag to select an area for screenshot. Press Escape to cancel."
2. **Drawing starts**: No announcement (too disruptive during rapid interaction)
3. **Valid selection**: "Selected area: 320 by 240 pixels. Press Enter to capture or Escape to cancel."
4. **Invalid selection**: "Selection too small. Minimum size is 20 by 20 pixels. Try again."
5. **Capture success**: "Screenshot captured successfully."
6. **Cancelled**: "Area selection cancelled."

#### Keyboard-Only Mode

For users who cannot use mouse/touch:

```
Future Enhancement:
1. Tab to focus selection area
2. Arrow keys to move selection position
3. Shift+Arrow keys to resize selection
4. Enter to capture, Escape to cancel
```

### 16.8 Error Handling UX

#### Error Scenarios

| Error | User Message | Recovery |
|-------|--------------|----------|
| Capture fails | "Screenshot capture failed. Please try again." | Auto-dismiss after 3s, user can retry |
| Permission denied | "Cannot capture this page. Browser settings may block screenshots." | Link to help |
| Memory error | "Image too large to process. Try a smaller selection." | Keep overlay open for retry |

---

## 17. UI Specifications

### 17.1 Overlay Container

```css
#web-clipper-area-selection-host {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 2147483647 !important;
  pointer-events: auto !important;
}
```

### 17.2 Selection Rectangle

```css
.selection-box {
  position: absolute;
  border: 2px solid var(--primary-500, #3b82f6);
  background: transparent;
  pointer-events: none;
}

.selection-box.drawing {
  border-style: dashed;
  border-dasharray: 6 4;
}

.selection-box.confirmed {
  border-style: solid;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3);
}
```

### 17.3 Dimmed Overlay Regions

```css
.dimmed-region {
  position: fixed;
  background: rgba(0, 0, 0, 0.5);
  pointer-events: none;
  transition: none; /* No transitions during drawing */
}

/* Four regions surrounding the selection */
.dimmed-top { top: 0; left: 0; right: 0; }
.dimmed-bottom { bottom: 0; left: 0; right: 0; }
.dimmed-left { left: 0; }
.dimmed-right { right: 0; }
```

### 17.4 Corner Handles

```css
.resize-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: var(--primary-500, #3b82f6);
  border: 2px solid white;
  border-radius: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
  transform: translate(-50%, -50%);
}

.resize-handle:hover {
  background: var(--primary-600, #2563eb);
  transform: translate(-50%, -50%) scale(1.1);
}

.handle-nw { cursor: nwse-resize; }
.handle-ne { cursor: nesw-resize; }
.handle-sw { cursor: nesw-resize; }
.handle-se { cursor: nwse-resize; }
.handle-n, .handle-s { cursor: ns-resize; }
.handle-e, .handle-w { cursor: ew-resize; }
```

### 17.5 Dimensions Label

```css
.dimensions-label {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 10px;
  background: rgba(59, 130, 246, 0.9);
  color: white;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
}

/* Position below selection if there's room, above if not */
.dimensions-label.below {
  top: calc(100% + 8px);
}

.dimensions-label.above {
  bottom: calc(100% + 8px);
}

.dimensions-label.inside {
  top: 50%;
  transform: translate(-50%, -50%);
}

.dimensions-label.too-small {
  background: var(--error-500, #ef4444);
}
```

### 17.6 Floating Toolbar

```css
.area-toolbar {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: white;
  border-radius: var(--rounded-lg, 8px);
  box-shadow: var(--shadow-lg, 0 4px 12px rgba(0, 0, 0, 0.15));
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  z-index: 1;
}

.toolbar-instructions {
  color: var(--neutral-600, #4b5563);
}

.toolbar-buttons {
  display: flex;
  gap: 8px;
}

.btn-capture {
  padding: 8px 16px;
  background: var(--primary-500, #3b82f6);
  color: white;
  border: none;
  border-radius: var(--rounded-md, 6px);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-capture:hover:not(:disabled) {
  background: var(--primary-600, #2563eb);
}

.btn-capture:active:not(:disabled) {
  background: var(--primary-700, #1d4ed8);
}

.btn-capture:disabled {
  background: var(--neutral-300, #d1d5db);
  cursor: not-allowed;
}

.btn-capture:focus-visible {
  outline: 2px solid var(--primary-500, #3b82f6);
  outline-offset: 2px;
}

.btn-cancel {
  padding: 8px 16px;
  background: var(--neutral-100, #f3f4f6);
  color: var(--neutral-700, #374151);
  border: none;
  border-radius: var(--rounded-md, 6px);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-cancel:hover {
  background: var(--neutral-200, #e5e7eb);
}

kbd {
  display: inline-block;
  padding: 2px 6px;
  margin-left: 4px;
  background: var(--neutral-200, #e5e7eb);
  border-radius: 4px;
  font-family: inherit;
  font-size: 11px;
}
```

### 17.7 Dark Mode

```css
@media (prefers-color-scheme: dark) {
  .area-toolbar {
    background: var(--neutral-800, #1f2937);
    color: var(--neutral-100, #f3f4f6);
  }

  .toolbar-instructions {
    color: var(--neutral-400, #9ca3af);
  }

  .btn-cancel {
    background: var(--neutral-700, #374151);
    color: var(--neutral-200, #e5e7eb);
  }

  .btn-cancel:hover {
    background: var(--neutral-600, #4b5563);
  }

  kbd {
    background: var(--neutral-600, #4b5563);
  }

  .dimensions-label {
    background: rgba(59, 130, 246, 0.95);
  }
}
```

### 17.8 Cursor States

```css
/* Default: crosshair for selection */
.area-canvas {
  cursor: crosshair;
}

/* While drawing: keep crosshair */
.area-canvas.drawing {
  cursor: crosshair;
}

/* Over selection: move cursor (if drag-to-move implemented) */
.area-canvas.over-selection {
  cursor: move;
}

/* Over resize handles */
.area-canvas.over-handle-nw,
.area-canvas.over-handle-se {
  cursor: nwse-resize;
}

.area-canvas.over-handle-ne,
.area-canvas.over-handle-sw {
  cursor: nesw-resize;
}

.area-canvas.over-handle-n,
.area-canvas.over-handle-s {
  cursor: ns-resize;
}

.area-canvas.over-handle-e,
.area-canvas.over-handle-w {
  cursor: ew-resize;
}
```

### 17.9 Animations

```css
/* Overlay entrance */
@keyframes overlay-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.area-overlay-enter {
  animation: overlay-fade-in 150ms ease-out;
}

/* Selection confirmation pulse */
@keyframes selection-confirm {
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
  100% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
}

.selection-box.just-confirmed {
  animation: selection-confirm 300ms ease-out;
}

/* Capture flash */
@keyframes capture-flash {
  0% { background: rgba(255, 255, 255, 0); }
  50% { background: rgba(255, 255, 255, 0.3); }
  100% { background: rgba(255, 255, 255, 0); }
}

.capture-flash {
  animation: capture-flash 200ms ease-out;
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .area-overlay-enter,
  .selection-box.just-confirmed,
  .capture-flash {
    animation: none;
  }

  .btn-capture,
  .btn-cancel,
  .resize-handle {
    transition: none;
  }
}
```

### 17.10 Responsive Adjustments

```css
/* Mobile: toolbar at bottom */
@media (max-width: 600px) {
  .area-toolbar {
    top: auto;
    bottom: 20px;
    left: 20px;
    right: 20px;
    transform: none;
    flex-wrap: wrap;
    justify-content: center;
  }

  .toolbar-instructions {
    width: 100%;
    text-align: center;
    margin-bottom: 8px;
  }

  .toolbar-buttons {
    width: 100%;
    justify-content: center;
  }

  .btn-capture,
  .btn-cancel {
    flex: 1;
    max-width: 140px;
  }
}

/* Larger touch targets on touch devices */
@media (pointer: coarse) {
  .resize-handle {
    width: 20px;
    height: 20px;
  }

  .btn-capture,
  .btn-cancel {
    min-height: 44px;
    min-width: 44px;
  }
}
```

### 17.11 Icons

| Icon | Usage | Design |
|------|-------|--------|
| Selection Rectangle | Mode button in popup | Dashed rectangle outline |
| Crosshair | Custom cursor | Simple + shape, 1px lines |
| Checkmark | Capture success | Standard checkmark |
| X | Cancel/Close | Standard X |

### 17.12 State-Specific Styling

```css
/* Minimum size warning */
.selection-box.below-minimum {
  border-color: var(--error-500, #ef4444);
}

.selection-box.below-minimum .dimensions-label {
  background: var(--error-500, #ef4444);
}

/* Valid selection ready for capture */
.selection-box.valid {
  border-color: var(--success-500, #22c55e);
}

/* Selection being resized */
.selection-box.resizing {
  border-style: dashed;
}
```

---

## 18. Updated Acceptance Criteria

| ID | Criterion | Test |
|----|-----------|------|
| AC1 | Area mode visible in popup | 5+ mode buttons shown including "Area" with rectangle icon |
| AC2 | Overlay appears on mode selection | Click Area mode, verify full-screen overlay with toolbar |
| AC3 | Crosshair cursor active | Cursor is crosshair over canvas area |
| AC4 | Rectangle drawing works | Click and drag creates visible rectangle |
| AC5 | Dimensions shown during draw | Width × height label updates in real-time |
| AC6 | Dimming outside selection | Area outside rectangle is 50% darkened |
| AC7 | Minimum size enforced | Selections < 20×20px rejected with feedback |
| AC8 | Toolbar shows contextual instructions | Instructions change: "Click and drag..." → "Press Enter to capture" |
| AC9 | Escape cancels at any time | Escape key closes overlay, returns to page |
| AC10 | Enter confirms valid selection | Enter key triggers capture when selection valid |
| AC11 | Capture button enabled only when valid | Button disabled until valid selection exists |
| AC12 | Screenshot cropped correctly | Captured image matches selection bounds |
| AC13 | High-DPI handled | Retina displays produce sharp images |
| AC14 | Touch input supported | Drawing works with finger on touch device |
| AC15 | Keyboard navigation works | Tab navigates toolbar, focus visible |
| AC16 | Screen reader announcements | VoiceOver/NVDA announces all state changes |
| AC17 | Dark mode styling | Toolbar adapts to system dark mode |
| AC18 | Reduced motion respected | Animations disabled when preference set |
| AC19 | Mobile toolbar position | Toolbar at bottom on narrow viewports |
| AC20 | Resize handles functional | Corner handles allow selection adjustment |
