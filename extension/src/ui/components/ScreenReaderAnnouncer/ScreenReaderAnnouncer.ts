/**
 * Screen Reader Announcer
 *
 * Provides live region announcements for screen readers.
 * Creates aria-live regions that announce dynamic content changes
 * to assistive technologies without disrupting the user's focus.
 *
 * @example
 * ```typescript
 * import { announcer } from '@/ui/components/ScreenReaderAnnouncer';
 *
 * // Use singleton for app-wide announcements
 * announcer.announce('Clip saved successfully', 'polite');
 * announcer.announce('Error: Connection lost', 'assertive');
 *
 * // Or create instance for component-specific announcements
 * const myAnnouncer = new ScreenReaderAnnouncer(shadowRoot);
 * myAnnouncer.announce('Loading complete');
 * ```
 */

/**
 * Interface for screen reader announcer functionality
 */
export interface Announcer {
  /**
   * Announces a message to screen readers
   *
   * @param message - Text to announce
   * @param priority - Urgency level ('polite' waits for pause, 'assertive' interrupts)
   */
  announce(message: string, priority?: 'polite' | 'assertive'): void;

  /**
   * Clears all live regions
   */
  clear(): void;
}

/**
 * Screen Reader Announcer Implementation
 *
 * Creates two ARIA live regions (one polite, one assertive) for
 * announcing dynamic content to screen readers.
 */
export class ScreenReaderAnnouncer implements Announcer {
  private politeRegion: HTMLElement;
  private assertiveRegion: HTMLElement;

  /**
   * Creates a new ScreenReaderAnnouncer instance
   *
   * @param container - Shadow root or HTML element to append live regions to
   */
  constructor(container: ShadowRoot | HTMLElement) {
    this.politeRegion = this.createRegion('polite');
    this.assertiveRegion = this.createRegion('assertive');

    container.appendChild(this.politeRegion);
    container.appendChild(this.assertiveRegion);
  }

  /**
   * Creates an ARIA live region element
   *
   * @param politeness - ARIA live politeness level
   * @returns HTML element configured as a live region
   */
  private createRegion(politeness: 'polite' | 'assertive'): HTMLElement {
    const region = document.createElement('div');

    // ARIA live region attributes
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');

    // Visually hide but keep accessible to screen readers
    region.className = 'wc-sr-only';

    return region;
  }

  /**
   * Announces a message to screen readers
   *
   * Uses a clear-then-set technique with requestAnimationFrame to ensure
   * screen readers detect the content change and announce it.
   *
   * @param message - Text to announce
   * @param priority - Urgency level (defaults to 'polite')
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const region = priority === 'polite' ? this.politeRegion : this.assertiveRegion;

    // Clear existing content
    region.textContent = '';

    // Use requestAnimationFrame to ensure the clear happens first
    // This forces screen readers to treat the new content as a change
    requestAnimationFrame(() => {
      region.textContent = message;
    });
  }

  /**
   * Clears all live regions
   */
  clear(): void {
    this.politeRegion.textContent = '';
    this.assertiveRegion.textContent = '';
  }
}

/**
 * Singleton announcer instance for app-wide announcements
 *
 * This is initialized when first accessed and can be used throughout
 * the extension for consistent screen reader feedback.
 */
let _announcer: Announcer | null = null;

/**
 * Gets or creates the singleton announcer instance
 *
 * @returns The global announcer instance
 */
function getAnnouncer(): Announcer {
  if (!_announcer) {
    // Create a container in the document body for the singleton
    const container = document.createElement('div');
    container.id = 'wc-sr-announcer';
    document.body.appendChild(container);

    _announcer = new ScreenReaderAnnouncer(container);
  }

  return _announcer;
}

/**
 * Singleton announcer instance
 *
 * Use this for app-wide announcements. The instance is created lazily
 * on first access.
 *
 * @example
 * ```typescript
 * import { announcer } from '@/ui/components/ScreenReaderAnnouncer';
 *
 * announcer.announce('Clip saved successfully');
 * announcer.announce('Error occurred', 'assertive');
 * announcer.clear();
 * ```
 */
export const announcer: Announcer = {
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    getAnnouncer().announce(message, priority);
  },

  clear(): void {
    getAnnouncer().clear();
  },
};
