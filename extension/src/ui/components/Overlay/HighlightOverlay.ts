/**
 * Highlight Overlay Component
 *
 * Creates a pulsing border overlay around a target element to draw attention.
 * Commonly used for element selection UI where users hover over page elements.
 *
 * Features:
 * - Dynamic positioning based on target DOMRect
 * - Pulsing border animation
 * - Configurable padding, border color, and width
 * - Smooth transitions when target changes
 *
 * Usage:
 * ```typescript
 * const highlight = new HighlightOverlay({
 *   variant: 'highlight',
 *   target: element.getBoundingClientRect(),
 *   borderColor: '#3b82f6',
 *   borderWidth: 2,
 *   padding: 4,
 * });
 * highlight.show();
 *
 * // Update target on mouse move
 * highlight.setTarget(newElement.getBoundingClientRect());
 * ```
 */

import { Overlay, OverlayProps } from './Overlay';
import { getCombinedStyles } from '../../utils/shadow-dom';

export interface HighlightOverlayProps extends Omit<OverlayProps, 'variant' | 'children'> {
  /**
   * Target element bounds to highlight
   */
  target: DOMRect;

  /**
   * Padding around the target element (default: 4px)
   */
  padding?: number;

  /**
   * Border color (default: --wc-primary-500)
   */
  borderColor?: string;

  /**
   * Border width in pixels (default: 2)
   */
  borderWidth?: number;

  /**
   * Enable pulsing animation (default: true)
   */
  pulse?: boolean;
}

export class HighlightOverlay extends Overlay {
  private highlightBox: HTMLElement;
  private highlightProps: HighlightOverlayProps;

  constructor(props: HighlightOverlayProps) {
    // Force variant to 'highlight'
    super({ ...props, variant: 'highlight' });
    this.highlightProps = props;

    // Create highlight box
    this.highlightBox = this.createHighlightBox();
    this.updatePosition();
  }

  /**
   * Create the highlight box element
   */
  private createHighlightBox(): HTMLElement {
    const box = document.createElement('div');
    box.className = 'wc-highlight-box';

    if (this.highlightProps.pulse !== false) {
      box.classList.add('wc-highlight-box--pulse');
    }

    // Append to overlay
    const overlay = this.shadowRoot.querySelector('.wc-overlay');
    overlay?.appendChild(box);

    return box;
  }

  /**
   * Get component-specific styles
   */
  protected getStyles(): string {
    const baseStyles = super.getStyles();
    const borderColor = this.highlightProps.borderColor || 'var(--wc-primary-500, #3b82f6)';
    const borderWidth = this.highlightProps.borderWidth || 2;

    return `
      ${baseStyles}

      .wc-highlight-box {
        position: absolute;
        border: ${borderWidth}px solid ${borderColor};
        border-radius: 4px;
        pointer-events: none;
        transition: all var(--wc-duration-fast, 100ms) var(--wc-ease-out, ease-out);
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5),
                    0 0 12px rgba(59, 130, 246, 0.4);
      }

      .wc-highlight-box--pulse {
        animation: wc-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }

      @keyframes wc-pulse {
        0%, 100% {
          opacity: 1;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5),
                      0 0 12px rgba(59, 130, 246, 0.4);
        }
        50% {
          opacity: 0.8;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8),
                      0 0 20px rgba(59, 130, 246, 0.6);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .wc-highlight-box {
          transition: none;
          animation: none !important;
        }
      }
    `;
  }

  /**
   * Update highlight box position and size based on target
   */
  private updatePosition(): void {
    const { target, padding = 4 } = this.highlightProps;

    // Calculate position with padding
    const top = target.top - padding + window.scrollY;
    const left = target.left - padding + window.scrollX;
    const width = target.width + padding * 2;
    const height = target.height + padding * 2;

    // Update box styles
    this.highlightBox.style.cssText = `
      top: ${top}px;
      left: ${left}px;
      width: ${width}px;
      height: ${height}px;
    `;
  }

  /**
   * Set a new target element to highlight
   *
   * @param rect - New target element bounds
   */
  setTarget(rect: DOMRect): void {
    this.highlightProps.target = rect;
    this.updatePosition();
  }

  /**
   * Update padding around the target
   *
   * @param padding - Padding in pixels
   */
  setPadding(padding: number): void {
    this.highlightProps.padding = padding;
    this.updatePosition();
  }

  /**
   * Update border color
   *
   * @param color - CSS color value
   */
  setBorderColor(color: string): void {
    this.highlightProps.borderColor = color;
    const borderWidth = this.highlightProps.borderWidth || 2;
    this.highlightBox.style.borderColor = color;
    this.highlightBox.style.borderWidth = `${borderWidth}px`;
  }

  /**
   * Update border width
   *
   * @param width - Border width in pixels
   */
  setBorderWidth(width: number): void {
    this.highlightProps.borderWidth = width;
    this.highlightBox.style.borderWidth = `${width}px`;
  }

  /**
   * Enable or disable pulsing animation
   *
   * @param enabled - Whether pulsing should be enabled
   */
  setPulse(enabled: boolean): void {
    this.highlightProps.pulse = enabled;

    if (enabled) {
      this.highlightBox.classList.add('wc-highlight-box--pulse');
    } else {
      this.highlightBox.classList.remove('wc-highlight-box--pulse');
    }
  }

  /**
   * Override show to announce element highlighted
   */
  show(): void {
    super.show();
    this.updatePosition();
  }
}
