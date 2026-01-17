/**
 * Badge Component
 *
 * A pill-shaped badge component for displaying status, labels, and metadata.
 * Supports multiple variants, sizes, optional icons, and removable functionality.
 */

import { createIsolatedComponent, getCombinedStyles } from '../../utils/index.js';
import badgeStyles from './Badge.css';

/**
 * Props for Badge component
 */
export interface BadgeProps {
  /** Visual variant determining color scheme */
  variant: 'default' | 'success' | 'warning' | 'error' | 'info';
  /** Size of the badge */
  size: 'sm' | 'md';
  /** Optional icon (SVG string) */
  icon?: string;
  /** Text label displayed in badge */
  label: string;
  /** Whether badge can be removed */
  removable?: boolean;
  /** Callback when badge is removed */
  onRemove?: () => void;
}

/**
 * Badge class
 *
 * Creates a badge component with Shadow DOM isolation.
 * Supports variants, sizes, icons, and removable functionality.
 */
export class Badge {
  private container: HTMLElement;
  private shadowRoot: ShadowRoot;
  private badgeElement: HTMLElement;
  private props: BadgeProps;

  constructor(props: BadgeProps) {
    this.props = props;

    // Create host element with closed Shadow DOM
    this.container = document.createElement('span');
    this.container.setAttribute('data-wc-component', 'badge');
    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = getCombinedStyles(badgeStyles);
    this.shadowRoot.appendChild(styleEl);

    // Create and render badge
    this.badgeElement = this.createBadge();
    this.shadowRoot.appendChild(this.badgeElement);
  }

  /**
   * Creates the badge element with all sub-elements
   */
  private createBadge(): HTMLElement {
    const badge = document.createElement('span');
    badge.className = this.getBadgeClasses();
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-label', this.props.label);

    // Add icon if provided
    if (this.props.icon) {
      const iconEl = this.createIcon();
      badge.appendChild(iconEl);
    }

    // Add label text
    const labelEl = document.createElement('span');
    labelEl.className = 'wc-badge__label';
    labelEl.textContent = this.props.label;
    badge.appendChild(labelEl);

    // Add remove button if removable
    if (this.props.removable) {
      const removeBtn = this.createRemoveButton();
      badge.appendChild(removeBtn);
    }

    return badge;
  }

  /**
   * Creates the icon element
   */
  private createIcon(): HTMLElement {
    const icon = document.createElement('span');
    icon.className = 'wc-badge__icon';
    icon.innerHTML = this.props.icon || '';
    icon.setAttribute('aria-hidden', 'true');
    return icon;
  }

  /**
   * Creates the remove button
   */
  private createRemoveButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'wc-badge__remove';
    button.type = 'button';
    button.setAttribute('aria-label', `Remove ${this.props.label}`);

    // Add X icon (close icon)
    button.innerHTML = `
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1l8 8M1 9l8-8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `;

    // Add click handler
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.props.onRemove) {
        this.props.onRemove();
      }
      // Emit custom event
      this.container.dispatchEvent(
        new CustomEvent('wc-badge-remove', {
          bubbles: true,
          composed: true,
          detail: { label: this.props.label },
        })
      );
    });

    return button;
  }

  /**
   * Gets CSS classes for the badge element
   */
  private getBadgeClasses(): string {
    const classes = ['wc-badge'];
    classes.push(`wc-badge--${this.props.variant}`);
    classes.push(`wc-badge--${this.props.size}`);
    return classes.join(' ');
  }

  /**
   * Updates the badge label
   */
  setLabel(label: string): void {
    this.props.label = label;
    const labelEl = this.badgeElement.querySelector('.wc-badge__label');
    if (labelEl) {
      labelEl.textContent = label;
    }
    this.badgeElement.setAttribute('aria-label', label);
  }

  /**
   * Updates the badge variant
   */
  setVariant(variant: BadgeProps['variant']): void {
    // Remove old variant class
    this.badgeElement.classList.remove(`wc-badge--${this.props.variant}`);

    // Update props and add new class
    this.props.variant = variant;
    this.badgeElement.classList.add(`wc-badge--${variant}`);
  }

  /**
   * Returns the badge DOM element
   */
  getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Destroys the badge and removes it from DOM
   */
  destroy(): void {
    this.container.remove();
  }
}

/**
 * Factory function to create a Badge component
 *
 * @param props - Badge configuration
 * @returns HTMLElement containing the badge
 *
 * @example
 * ```typescript
 * const badge = createBadge({
 *   variant: 'success',
 *   size: 'md',
 *   label: 'Published',
 *   icon: '<svg>...</svg>',
 * });
 * document.body.appendChild(badge);
 * ```
 */
export function createBadge(props: BadgeProps): HTMLElement {
  const badge = new Badge(props);
  return badge.getElement();
}
