/**
 * Base Overlay Component
 *
 * Provides the foundation for overlay UI elements with different variants:
 * - fullscreen: Modal-style overlay covering the entire viewport
 * - highlight: Emphasizes specific DOM elements with a border
 * - selection: Canvas-based area selection with resize handles
 *
 * Features:
 * - Escape key dismissal
 * - High z-index isolation for Chrome extension content scripts
 * - Accessibility via ARIA live regions
 * - Shadow DOM style isolation
 */

import { getCombinedStyles } from '../../utils/shadow-dom';

export interface OverlayProps {
  /**
   * Overlay variant determines visual style and behavior
   */
  variant: 'fullscreen' | 'highlight' | 'selection';

  /**
   * Z-index for stacking context (default: 2147483647 - max safe integer)
   */
  zIndex?: number;

  /**
   * Callback when Escape key is pressed
   */
  onEscape?: () => void;

  /**
   * Child element to append to overlay container
   */
  children?: HTMLElement;

  /**
   * Class name for additional styling
   */
  className?: string;
}

/**
 * Base Overlay class providing common functionality
 */
export class Overlay {
  protected container: HTMLElement;
  protected shadowRoot: ShadowRoot;
  protected props: OverlayProps;
  protected isVisible: boolean = false;
  protected liveRegion: HTMLElement | null = null;

  constructor(props: OverlayProps) {
    this.props = props;

    // Create container with Shadow DOM for style isolation
    this.container = document.createElement('div');
    this.container.setAttribute('data-web-clipper-overlay', 'true');
    this.container.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: ${props.zIndex ?? 2147483647};
      pointer-events: none;
    `;

    // Attach Shadow DOM (closed mode for isolation)
    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });

    // Initialize overlay
    this.initialize();
  }

  /**
   * Initialize overlay structure and event listeners
   */
  protected initialize(): void {
    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = getCombinedStyles(this.getStyles());
    this.shadowRoot.appendChild(styleEl);

    // Create main overlay element
    const overlay = document.createElement('div');
    overlay.className = `wc-overlay wc-overlay--${this.props.variant} ${this.props.className || ''}`;
    this.shadowRoot.appendChild(overlay);

    // Append children if provided
    if (this.props.children) {
      overlay.appendChild(this.props.children);
    }

    // Set up keyboard event listener
    this.setupKeyboardHandler();

    // Create accessibility live region
    this.createLiveRegion();
  }

  /**
   * Get component-specific styles
   */
  protected getStyles(): string {
    return `
      .wc-overlay {
        position: fixed;
        inset: 0;
        pointer-events: auto;
        transition: opacity var(--wc-duration-normal, 200ms) var(--wc-ease-out, ease-out);
        opacity: 0;
      }

      .wc-overlay--visible {
        opacity: 1;
      }

      .wc-overlay--fullscreen {
        background-color: var(--wc-bg-overlay, rgba(0, 0, 0, 0.5));
      }

      .wc-overlay--highlight {
        background-color: transparent;
        pointer-events: none;
      }

      .wc-overlay--selection {
        background-color: transparent;
        cursor: crosshair;
      }

      @media (prefers-reduced-motion: reduce) {
        .wc-overlay {
          transition: none;
        }
      }
    `;
  }

  /**
   * Set up keyboard event handler for Escape key
   */
  protected setupKeyboardHandler(): void {
    if (this.props.onEscape) {
      document.addEventListener('keydown', this.handleKeyDown);
    }
  }

  /**
   * Handle keyboard events
   */
  protected handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.isVisible) {
      event.preventDefault();
      event.stopPropagation();
      this.props.onEscape?.();
    }
  };

  /**
   * Create ARIA live region for accessibility announcements
   */
  protected createLiveRegion(): void {
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'wc-sr-only';
    document.body.appendChild(this.liveRegion);
  }

  /**
   * Announce message to screen readers
   */
  protected announce(message: string): void {
    if (this.liveRegion) {
      this.liveRegion.textContent = message;
    }
  }

  /**
   * Show the overlay
   */
  show(): void {
    if (this.isVisible) return;

    // Append to DOM if not already present
    if (!this.container.parentElement) {
      document.body.appendChild(this.container);
    }

    // Force reflow for transition
    void this.container.offsetHeight;

    // Add visible class
    const overlay = this.shadowRoot.querySelector('.wc-overlay');
    overlay?.classList.add('wc-overlay--visible');

    this.isVisible = true;

    // Announce to screen readers
    this.announceShow();
  }

  /**
   * Hide the overlay
   */
  hide(): void {
    if (!this.isVisible) return;

    const overlay = this.shadowRoot.querySelector('.wc-overlay');
    overlay?.classList.remove('wc-overlay--visible');

    this.isVisible = false;

    // Announce to screen readers
    this.announceHide();
  }

  /**
   * Destroy the overlay and clean up resources
   */
  destroy(): void {
    // Remove keyboard handler
    document.removeEventListener('keydown', this.handleKeyDown);

    // Remove from DOM
    this.container.remove();

    // Remove live region
    this.liveRegion?.remove();
    this.liveRegion = null;

    this.isVisible = false;
  }

  /**
   * Check if overlay is currently visible
   */
  get visible(): boolean {
    return this.isVisible;
  }

  /**
   * Get the container element
   */
  getContainer(): HTMLElement {
    return this.container;
  }

  /**
   * Get the shadow root
   */
  getShadowRoot(): ShadowRoot {
    return this.shadowRoot;
  }

  /**
   * Announce overlay activation
   */
  protected announceShow(): void {
    const messages = {
      fullscreen: 'Overlay activated. Press Escape to close.',
      highlight: 'Element highlighted.',
      selection: 'Selection mode activated. Click and drag to select an area. Press Escape to cancel.',
    };
    this.announce(messages[this.props.variant]);
  }

  /**
   * Announce overlay deactivation
   */
  protected announceHide(): void {
    const messages = {
      fullscreen: 'Overlay closed.',
      highlight: 'Highlight removed.',
      selection: 'Selection mode deactivated.',
    };
    this.announce(messages[this.props.variant]);
  }
}
