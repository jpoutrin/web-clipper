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
    console.log('[EmptyState] attachEventListeners called');
    console.log('[EmptyState] shadowRoot:', this.shadowRoot);
    console.log('[EmptyState] props.onAction:', this.props.onAction);
    console.log('[EmptyState] props.actionText:', this.props.actionText);

    const actionBtn = this.shadowRoot.querySelector('.wc-empty-state__action');
    console.log('[EmptyState] Button found by querySelector:', actionBtn);

    if (actionBtn && this.props.onAction) {
      console.log('[EmptyState] Attaching click listener');
      actionBtn.addEventListener('click', () => {
        console.log('[EmptyState] CLICK HANDLER FIRED!');
        if (this.props.onAction) {
          console.log('[EmptyState] Calling onAction callback');
          try {
            this.props.onAction();
            console.log('[EmptyState] onAction completed');
          } catch (error) {
            console.error('[EmptyState] Error in onAction:', error);
          }
        }
        // Emit custom event
        this.container.dispatchEvent(
          new CustomEvent('wc-empty-state-action', {
            bubbles: true,
            composed: true,
          })
        );
      });
      console.log('[EmptyState] Click listener attached successfully');
    } else {
      console.warn('[EmptyState] Could not attach listener. actionBtn:', actionBtn, 'onAction:', this.props.onAction);
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
  const element = emptyState.getElement();

  // Store instance reference to prevent GC
  (element as any).__wcEmptyStateInstance = emptyState;
  console.log('[EmptyState] Factory: Instance stored on element');

  return element;
}
