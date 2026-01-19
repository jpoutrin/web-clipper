/**
 * Selection Overlay Component
 *
 * Canvas-based overlay for area selection with resize handles.
 * Renders a dimmed overlay with a cutout for the selection area,
 * bordered by a highlighted outline and 8 resize handles.
 *
 * Features:
 * - Click and drag to create selection
 * - 8 resize handles (4 corners + 4 edge midpoints)
 * - Dimmed background with selection cutout
 * - Smooth canvas rendering
 * - Handle hover states
 *
 * Usage:
 * ```typescript
 * const selection = new SelectionOverlay({
 *   variant: 'selection',
 *   selection: null,
 *   dimOpacity: 0.5,
 *   onSelectionChange: (rect) => console.log('Selection:', rect),
 * });
 * selection.show();
 * ```
 */

import { Overlay, OverlayProps } from './Overlay';
import { getCombinedStyles } from '../../utils/shadow-dom';

export interface SelectionOverlayProps extends Omit<OverlayProps, 'variant' | 'children'> {
  /**
   * Current selection rectangle (null if no selection)
   */
  selection: DOMRect | null;

  /**
   * Opacity of dimmed overlay (default: 0.5)
   */
  dimOpacity?: number;

  /**
   * Callback when selection changes
   */
  onSelectionChange?: (selection: DOMRect | null) => void;

  /**
   * Callback when selection is confirmed (e.g., mouse up)
   */
  onSelectionComplete?: (selection: DOMRect) => void;

  /**
   * Minimum selection size in pixels (default: 10)
   */
  minSize?: number;
}

interface Point {
  x: number;
  y: number;
}

type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface Handle {
  position: HandlePosition;
  rect: DOMRect;
}

export class SelectionOverlay extends Overlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private selectionProps: SelectionOverlayProps;
  private isDragging = false;
  private isResizing = false;
  private dragStart: Point | null = null;
  private activeHandle: HandlePosition | null = null;
  private handles: Handle[] = [];

  // Visual constants
  private readonly DIM_COLOR = 'rgba(0, 0, 0, 0.5)';
  private readonly SELECTION_BORDER_COLOR = '#3b82f6';
  private readonly SELECTION_BORDER_WIDTH = 2;
  private readonly HANDLE_SIZE = 8;
  private readonly HANDLE_COLOR = '#ffffff';
  private readonly HANDLE_BORDER_COLOR = '#3b82f6';
  private readonly HANDLE_BORDER_WIDTH = 2;

  constructor(props: SelectionOverlayProps) {
    // Force variant to 'selection'
    super({ ...props, variant: 'selection' });
    this.selectionProps = props;

    // Create and set up canvas
    this.canvas = this.createCanvas();
    this.ctx = this.canvas.getContext('2d', { alpha: true })!;

    // Set up event listeners
    this.setupEventListeners();

    // Initial render
    this.render();
  }

  /**
   * Create canvas element with proper sizing
   */
  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.className = 'wc-selection-canvas';
    canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      cursor: crosshair;
    `;

    // Set canvas size to viewport
    this.resizeCanvas(canvas);

    // Append to overlay
    const overlay = this.shadowRoot.querySelector('.wc-overlay');
    overlay?.appendChild(canvas);

    // Handle window resize
    window.addEventListener('resize', () => this.resizeCanvas(canvas));

    return canvas;
  }

  /**
   * Resize canvas to match viewport with device pixel ratio
   */
  private resizeCanvas(canvas: HTMLCanvasElement): void {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Set display size
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Set canvas internal size (accounting for DPI)
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // Scale context to match DPI
    this.ctx?.scale(dpr, dpr);

    // Re-render
    this.render();
  }

  /**
   * Set up mouse event listeners
   */
  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
  }

  /**
   * Handle mouse down - start drag or resize
   */
  private handleMouseDown = (event: MouseEvent): void => {
    event.preventDefault();

    const point = this.getMousePosition(event);
    const handle = this.getHandleAtPoint(point);

    if (handle) {
      // Start resizing
      this.isResizing = true;
      this.activeHandle = handle.position;
    } else {
      // Start new selection
      this.isDragging = true;
      this.dragStart = point;
      this.setSelection(null);
    }
  };

  /**
   * Handle mouse move - update selection or resize
   */
  private handleMouseMove = (event: MouseEvent): void => {
    const point = this.getMousePosition(event);

    if (this.isDragging && this.dragStart) {
      // Update selection while dragging
      const rect = this.createRectFromPoints(this.dragStart, point);
      this.setSelection(rect);
    } else if (this.isResizing && this.activeHandle && this.selectionProps.selection) {
      // Resize selection
      const newRect = this.resizeSelection(this.selectionProps.selection, point, this.activeHandle);
      this.setSelection(newRect);
    } else {
      // Update cursor based on handle hover
      this.updateCursor(point);
    }
  };

  /**
   * Handle mouse up - complete selection
   */
  private handleMouseUp = (event: MouseEvent): void => {
    if (this.isDragging || this.isResizing) {
      if (this.selectionProps.selection) {
        this.selectionProps.onSelectionComplete?.(this.selectionProps.selection);
      }

      this.isDragging = false;
      this.isResizing = false;
      this.dragStart = null;
      this.activeHandle = null;
    }
  };

  /**
   * Handle mouse leave - cancel drag
   */
  private handleMouseLeave = (): void => {
    this.isDragging = false;
    this.isResizing = false;
    this.dragStart = null;
    this.activeHandle = null;
  };

  /**
   * Get mouse position relative to viewport
   */
  private getMousePosition(event: MouseEvent): Point {
    return {
      x: event.clientX,
      y: event.clientY,
    };
  }

  /**
   * Create DOMRect from two points
   */
  private createRectFromPoints(start: Point, end: Point): DOMRect {
    const minSize = this.selectionProps.minSize || 10;
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.max(Math.abs(end.x - start.x), minSize);
    const height = Math.max(Math.abs(end.y - start.y), minSize);

    return new DOMRect(x, y, width, height);
  }

  /**
   * Resize selection based on handle being dragged
   */
  private resizeSelection(rect: DOMRect, point: Point, handle: HandlePosition): DOMRect {
    const minSize = this.selectionProps.minSize || 10;
    let { x, y, width, height } = rect;

    // Update based on handle position
    switch (handle) {
      case 'nw':
        width = Math.max(rect.right - point.x, minSize);
        height = Math.max(rect.bottom - point.y, minSize);
        x = rect.right - width;
        y = rect.bottom - height;
        break;
      case 'n':
        height = Math.max(rect.bottom - point.y, minSize);
        y = rect.bottom - height;
        break;
      case 'ne':
        width = Math.max(point.x - rect.left, minSize);
        height = Math.max(rect.bottom - point.y, minSize);
        y = rect.bottom - height;
        break;
      case 'e':
        width = Math.max(point.x - rect.left, minSize);
        break;
      case 'se':
        width = Math.max(point.x - rect.left, minSize);
        height = Math.max(point.y - rect.top, minSize);
        break;
      case 's':
        height = Math.max(point.y - rect.top, minSize);
        break;
      case 'sw':
        width = Math.max(rect.right - point.x, minSize);
        height = Math.max(point.y - rect.top, minSize);
        x = rect.right - width;
        break;
      case 'w':
        width = Math.max(rect.right - point.x, minSize);
        x = rect.right - width;
        break;
    }

    return new DOMRect(x, y, width, height);
  }

  /**
   * Calculate handle positions for current selection
   */
  private calculateHandles(): Handle[] {
    const selection = this.selectionProps.selection;
    if (!selection) return [];

    const { left, top, right, bottom, width, height } = selection;
    const halfSize = this.HANDLE_SIZE / 2;

    return [
      { position: 'nw', rect: new DOMRect(left - halfSize, top - halfSize, this.HANDLE_SIZE, this.HANDLE_SIZE) },
      { position: 'n', rect: new DOMRect(left + width / 2 - halfSize, top - halfSize, this.HANDLE_SIZE, this.HANDLE_SIZE) },
      { position: 'ne', rect: new DOMRect(right - halfSize, top - halfSize, this.HANDLE_SIZE, this.HANDLE_SIZE) },
      { position: 'e', rect: new DOMRect(right - halfSize, top + height / 2 - halfSize, this.HANDLE_SIZE, this.HANDLE_SIZE) },
      { position: 'se', rect: new DOMRect(right - halfSize, bottom - halfSize, this.HANDLE_SIZE, this.HANDLE_SIZE) },
      { position: 's', rect: new DOMRect(left + width / 2 - halfSize, bottom - halfSize, this.HANDLE_SIZE, this.HANDLE_SIZE) },
      { position: 'sw', rect: new DOMRect(left - halfSize, bottom - halfSize, this.HANDLE_SIZE, this.HANDLE_SIZE) },
      { position: 'w', rect: new DOMRect(left - halfSize, top + height / 2 - halfSize, this.HANDLE_SIZE, this.HANDLE_SIZE) },
    ];
  }

  /**
   * Get handle at given point
   */
  private getHandleAtPoint(point: Point): Handle | null {
    for (const handle of this.handles) {
      const { rect } = handle;
      if (
        point.x >= rect.left &&
        point.x <= rect.right &&
        point.y >= rect.top &&
        point.y <= rect.bottom
      ) {
        return handle;
      }
    }
    return null;
  }

  /**
   * Update cursor based on mouse position
   */
  private updateCursor(point: Point): void {
    const handle = this.getHandleAtPoint(point);

    if (handle) {
      const cursors: Record<HandlePosition, string> = {
        nw: 'nw-resize',
        n: 'n-resize',
        ne: 'ne-resize',
        e: 'e-resize',
        se: 'se-resize',
        s: 's-resize',
        sw: 'sw-resize',
        w: 'w-resize',
      };
      this.canvas.style.cursor = cursors[handle.position];
    } else {
      this.canvas.style.cursor = 'crosshair';
    }
  }

  /**
   * Render overlay to canvas
   */
  private render(): void {
    const { width, height } = this.canvas;
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = width / dpr;
    const displayHeight = height / dpr;

    // Clear canvas
    this.ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Draw dimmed overlay
    this.drawDimmedOverlay(displayWidth, displayHeight);

    // Draw selection if exists
    if (this.selectionProps.selection) {
      this.drawSelection(this.selectionProps.selection);
      this.drawHandles();
    }
  }

  /**
   * Draw dimmed overlay with selection cutout
   */
  private drawDimmedOverlay(width: number, height: number): void {
    const selection = this.selectionProps.selection;
    const opacity = this.selectionProps.dimOpacity ?? 0.5;

    this.ctx.save();
    this.ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;

    if (selection) {
      // Create path for entire canvas
      this.ctx.beginPath();
      this.ctx.rect(0, 0, width, height);

      // Subtract selection area (cutout)
      this.ctx.rect(selection.left, selection.top, selection.width, selection.height);

      // Fill using even-odd rule
      this.ctx.fill('evenodd');
    } else {
      // No selection - dim entire screen
      this.ctx.fillRect(0, 0, width, height);
    }

    this.ctx.restore();
  }

  /**
   * Draw selection border
   */
  private drawSelection(selection: DOMRect): void {
    this.ctx.save();
    this.ctx.strokeStyle = this.SELECTION_BORDER_COLOR;
    this.ctx.lineWidth = this.SELECTION_BORDER_WIDTH;
    this.ctx.strokeRect(selection.left, selection.top, selection.width, selection.height);
    this.ctx.restore();
  }

  /**
   * Draw resize handles
   */
  private drawHandles(): void {
    this.handles = this.calculateHandles();

    this.ctx.save();

    for (const handle of this.handles) {
      const { rect } = handle;

      // Fill handle
      this.ctx.fillStyle = this.HANDLE_COLOR;
      this.ctx.fillRect(rect.left, rect.top, rect.width, rect.height);

      // Stroke handle border
      this.ctx.strokeStyle = this.HANDLE_BORDER_COLOR;
      this.ctx.lineWidth = this.HANDLE_BORDER_WIDTH;
      this.ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);
    }

    this.ctx.restore();
  }

  /**
   * Set current selection
   */
  setSelection(rect: DOMRect | null): void {
    this.selectionProps.selection = rect;
    this.selectionProps.onSelectionChange?.(rect);
    this.render();
  }

  /**
   * Get current selection
   */
  getSelection(): DOMRect | null {
    return this.selectionProps.selection;
  }

  /**
   * Clear current selection
   */
  clearSelection(): void {
    this.setSelection(null);
  }

  /**
   * Override destroy to clean up canvas listeners
   */
  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);

    super.destroy();
  }

  /**
   * Get component-specific styles
   */
  protected getStyles(): string {
    const baseStyles = super.getStyles();

    return `
      ${baseStyles}

      .wc-selection-canvas {
        display: block;
        user-select: none;
        -webkit-user-select: none;
      }
    `;
  }
}
