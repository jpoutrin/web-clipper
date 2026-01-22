/**
 * EmptyState Component
 *
 * Displays an empty state message with icon, title, description, and optional action button.
 */

import { getCombinedStyles } from '../../utils/shadow-dom';
import { escapeHtml } from '../../utils/clips';
import emptyStateStyles from './EmptyState.css';

/**
 * Props for EmptyState component
 */
export interface EmptyStateProps {
  icon: string; // Emoji or SVG
  title: string; // Main message
  description?: string; // Detailed text
  actionText?: string; // CTA button text
  onAction?: () => void; // CTA handler
}

/**
 * EmptyState class
 */
export class EmptyState {
  private container: HTMLElement;
  private shadowRoot: ShadowRoot;
  private props: EmptyStateProps;

  constructor(props: EmptyStateProps) {
    this.props = props;

    // Create host element with closed Shadow DOM
    this.container = document.createElement('div');
    this.container.setAttribute('data-wc-component', 'empty-state');
    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = getCombinedStyles(emptyStateStyles);
    this.shadowRoot.appendChild(styleEl);

    // Create and render empty state
    this.render();
    if (this.props.onAction) {
      this.attachEventListeners();
    }
  }

  /**
   * Renders the empty state
   */
  private render(): void {
    const { icon, title, description, actionText } = this.props;

    const emptyStateHTML = `
      <div class="wc-empty-state" role="status">
        <div class="wc-empty-state__icon" aria-hidden="true">${icon}</div>
        <h2 class="wc-empty-state__title">${escapeHtml(title)}</h2>
        ${description ? `<p class="wc-empty-state__description">${escapeHtml(description)}</p>` : ''}
        ${actionText ? `<button class="wc-empty-state__action" type="button">${escapeHtml(actionText)}</button>` : ''}
      </div>
    `;

    this.shadowRoot.innerHTML = `
      <style>${getCombinedStyles(emptyStateStyles)}</style>
      ${emptyStateHTML}
    `;
  }

  /**
   * Attaches event listeners
   */
  private attachEventListeners(): void {
    const actionBtn = this.shadowRoot.querySelector('.wc-empty-state__action');
    if (actionBtn && this.props.onAction) {
      actionBtn.addEventListener('click', () => {
        if (this.props.onAction) {
          this.props.onAction();
        }
        // Emit custom event
        this.container.dispatchEvent(
          new CustomEvent('wc-empty-state-action', {
            bubbles: true,
            composed: true,
          })
        );
      });
    }
  }

  /**
   * Returns the empty state DOM element
   */
  getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Destroys the empty state
   */
  destroy(): void {
    this.container.remove();
  }
}

/**
 * Factory function to create an EmptyState component
 */
export function createEmptyState(props: EmptyStateProps): HTMLElement {
  const emptyState = new EmptyState(props);
  return emptyState.getElement();
}
