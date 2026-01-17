/**
 * Overlay Component Examples
 *
 * Demonstrates usage patterns for all overlay variants.
 * This file can be used as a reference for implementation.
 */

import { Overlay, HighlightOverlay, SelectionOverlay } from './index';

/**
 * Example 1: Fullscreen Modal Overlay
 *
 * Creates a semi-transparent fullscreen overlay, commonly used
 * for modal dialogs or to prevent interaction with the page.
 */
export function createFullscreenOverlay(): Overlay {
  const overlay = new Overlay({
    variant: 'fullscreen',
    zIndex: 2147483647,
    onEscape: () => {
      console.log('Escape pressed - closing overlay');
      overlay.hide();
    },
  });

  overlay.show();

  return overlay;
}

/**
 * Example 2: Element Picker with Highlight
 *
 * Interactive element picker that highlights elements on hover
 * and allows selection on click.
 */
export function createElementPicker(
  onSelect: (element: HTMLElement) => void
): () => void {
  let highlight: HighlightOverlay | null = null;
  let isActive = true;

  const handleMouseMove = (event: MouseEvent) => {
    if (!isActive) return;

    const target = event.target as HTMLElement;

    // Skip if hovering over our own overlay
    if (target.hasAttribute('data-web-clipper-overlay')) return;

    const rect = target.getBoundingClientRect();

    if (!highlight) {
      highlight = new HighlightOverlay({
        target: rect,
        borderColor: '#3b82f6',
        borderWidth: 2,
        padding: 4,
        pulse: true,
      });
      highlight.show();
    } else {
      highlight.setTarget(rect);
    }
  };

  const handleClick = (event: MouseEvent) => {
    if (!isActive) return;

    event.preventDefault();
    event.stopPropagation();

    const target = event.target as HTMLElement;

    // Skip if clicking our own overlay
    if (target.hasAttribute('data-web-clipper-overlay')) return;

    onSelect(target);
    cleanup();
  };

  const handleEscape = () => {
    cleanup();
  };

  const cleanup = () => {
    isActive = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleEscape);
    highlight?.destroy();
    highlight = null;
  };

  // Set up event listeners
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') handleEscape();
  });

  // Return cleanup function
  return cleanup;
}

/**
 * Example 3: Area Selection for Screenshot
 *
 * Canvas-based area selection with resize handles for capturing
 * a specific portion of the screen.
 */
export function createAreaSelector(
  onComplete: (selection: DOMRect) => void,
  onCancel?: () => void
): SelectionOverlay {
  const selection = new SelectionOverlay({
    selection: null,
    dimOpacity: 0.5,
    minSize: 10,
    onSelectionChange: (rect) => {
      if (rect) {
        console.log('Selection:', {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    },
    onSelectionComplete: (rect) => {
      console.log('Selection complete:', rect);
      onComplete(rect);
    },
    onEscape: () => {
      console.log('Selection cancelled');
      onCancel?.();
      selection.destroy();
    },
  });

  selection.show();

  return selection;
}

/**
 * Example 4: Multi-Element Highlight
 *
 * Highlights multiple elements simultaneously, useful for
 * showing all matching elements in a search result.
 */
export function highlightMultipleElements(
  elements: HTMLElement[],
  options?: {
    borderColor?: string;
    borderWidth?: number;
    padding?: number;
    duration?: number;
  }
): () => void {
  const highlights: HighlightOverlay[] = [];

  // Create highlight for each element
  elements.forEach((element) => {
    const highlight = new HighlightOverlay({
      target: element.getBoundingClientRect(),
      borderColor: options?.borderColor || '#22c55e',
      borderWidth: options?.borderWidth || 2,
      padding: options?.padding || 4,
      pulse: true,
    });

    highlight.show();
    highlights.push(highlight);
  });

  // Auto-dismiss after duration
  if (options?.duration) {
    setTimeout(() => {
      cleanup();
    }, options.duration);
  }

  // Return cleanup function
  const cleanup = () => {
    highlights.forEach((h) => h.destroy());
    highlights.length = 0;
  };

  return cleanup;
}

/**
 * Example 5: Guided Tour / Spotlight
 *
 * Creates a spotlight effect that highlights a specific element
 * while dimming the rest of the page.
 */
export function createSpotlight(
  element: HTMLElement,
  options?: {
    onNext?: () => void;
    onClose?: () => void;
  }
): { next: () => void; close: () => void } {
  const rect = element.getBoundingClientRect();

  // Create fullscreen dim overlay
  const overlay = new Overlay({
    variant: 'fullscreen',
    onEscape: () => {
      options?.onClose?.();
      cleanup();
    },
  });

  // Create highlight for target element
  const highlight = new HighlightOverlay({
    target: rect,
    borderColor: '#3b82f6',
    borderWidth: 3,
    padding: 8,
    pulse: true,
    zIndex: 2147483647,
  });

  overlay.show();
  highlight.show();

  const cleanup = () => {
    overlay.destroy();
    highlight.destroy();
  };

  return {
    next: () => {
      options?.onNext?.();
      cleanup();
    },
    close: () => {
      options?.onClose?.();
      cleanup();
    },
  };
}

/**
 * Example 6: Selection with Confirmation
 *
 * Area selection with a confirmation step before finalizing.
 */
export function createSelectionWithConfirmation(
  onConfirm: (selection: DOMRect) => void,
  onCancel?: () => void
): void {
  let pendingSelection: DOMRect | null = null;
  let selectionOverlay: SelectionOverlay;

  selectionOverlay = new SelectionOverlay({
    selection: null,
    dimOpacity: 0.5,
    onSelectionComplete: (rect) => {
      pendingSelection = rect;
      showConfirmation(rect);
    },
    onEscape: () => {
      onCancel?.();
      selectionOverlay.destroy();
    },
  });

  selectionOverlay.show();

  function showConfirmation(rect: DOMRect) {
    // Create confirmation dialog (simplified example)
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      z-index: 2147483647;
    `;
    dialog.innerHTML = `
      <p>Capture selected area?</p>
      <p style="color: #6b7280; font-size: 14px;">
        ${Math.round(rect.width)} × ${Math.round(rect.height)} px
      </p>
      <div style="display: flex; gap: 8px; margin-top: 16px;">
        <button id="confirm-btn" style="padding: 8px 16px;">Confirm</button>
        <button id="cancel-btn" style="padding: 8px 16px;">Cancel</button>
      </div>
    `;

    document.body.appendChild(dialog);

    const confirmBtn = dialog.querySelector('#confirm-btn');
    const cancelBtn = dialog.querySelector('#cancel-btn');

    confirmBtn?.addEventListener('click', () => {
      if (pendingSelection) {
        onConfirm(pendingSelection);
      }
      dialog.remove();
      selectionOverlay.destroy();
    });

    cancelBtn?.addEventListener('click', () => {
      dialog.remove();
      selectionOverlay.clearSelection();
      pendingSelection = null;
    });
  }
}

/**
 * Example 7: Responsive Highlight
 *
 * Highlight that updates position on scroll and resize.
 */
export function createResponsiveHighlight(
  element: HTMLElement,
  options?: {
    borderColor?: string;
    onDismiss?: () => void;
  }
): () => void {
  const highlight = new HighlightOverlay({
    target: element.getBoundingClientRect(),
    borderColor: options?.borderColor || '#3b82f6',
    borderWidth: 2,
    padding: 4,
    pulse: true,
  });

  highlight.show();

  // Update position on scroll and resize
  const updatePosition = () => {
    highlight.setTarget(element.getBoundingClientRect());
  };

  window.addEventListener('scroll', updatePosition, true);
  window.addEventListener('resize', updatePosition);

  // Cleanup
  const cleanup = () => {
    window.removeEventListener('scroll', updatePosition, true);
    window.removeEventListener('resize', updatePosition);
    highlight.destroy();
    options?.onDismiss?.();
  };

  // Auto-cleanup on Escape
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      cleanup();
      document.removeEventListener('keydown', handleEscape);
    }
  };

  document.addEventListener('keydown', handleEscape);

  return cleanup;
}
