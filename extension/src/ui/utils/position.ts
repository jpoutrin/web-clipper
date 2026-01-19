/**
 * Position Utilities
 *
 * Utilities for positioning floating elements (toolbars, tooltips, popovers)
 * relative to anchor elements with viewport awareness.
 */

/**
 * Position result with coordinates and final placement
 */
export interface Position {
  /** Top position in pixels */
  top: number;
  /** Left position in pixels */
  left: number;
  /** Final position (top or bottom of anchor) */
  position: 'top' | 'bottom';
}

/**
 * Positions a floating toolbar relative to an anchor element
 *
 * The toolbar will:
 * - Be horizontally centered relative to the anchor
 * - Position above or below the anchor based on available space
 * - Stay within viewport boundaries with padding
 * - Include space for the positioning arrow (12px)
 *
 * @param toolbar - Toolbar element to position
 * @param anchor - DOMRect of the element to anchor to
 * @param viewportPadding - Minimum distance from viewport edges (default: 8px)
 * @returns Position object with top, left coordinates and final position
 *
 * @example
 * ```typescript
 * const toolbar = document.querySelector('.wc-toolbar');
 * const selection = window.getSelection().getRangeAt(0).getBoundingClientRect();
 * const pos = positionToolbar(toolbar, selection);
 *
 * toolbar.style.top = `${pos.top}px`;
 * toolbar.style.left = `${pos.left}px`;
 * toolbar.classList.add(`wc-toolbar--${pos.position}`);
 * ```
 */
export function positionToolbar(
  toolbar: HTMLElement,
  anchor: DOMRect,
  viewportPadding = 8
): Position {
  const toolbarRect = toolbar.getBoundingClientRect();
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  // Calculate horizontal center position
  let left = anchor.left + (anchor.width - toolbarRect.width) / 2;

  // Clamp to viewport with padding
  left = Math.max(viewportPadding, left);
  left = Math.min(viewport.width - toolbarRect.width - viewportPadding, left);

  // Determine vertical position based on available space
  const spaceAbove = anchor.top;
  const spaceBelow = viewport.height - anchor.bottom;
  const arrowHeight = 12; // Height of the CSS arrow
  const toolbarHeight = toolbarRect.height + arrowHeight;

  let position: 'top' | 'bottom';
  let top: number;

  // Prefer bottom placement, but use top if there's more space there
  if (spaceBelow >= toolbarHeight) {
    // Enough space below
    position = 'bottom';
    top = anchor.bottom + arrowHeight;
  } else if (spaceAbove >= toolbarHeight) {
    // Not enough space below, but enough above
    position = 'top';
    top = anchor.top - toolbarHeight;
  } else {
    // Not enough space either way, prefer bottom
    position = 'bottom';
    top = anchor.bottom + arrowHeight;
  }

  return { top, left, position };
}
