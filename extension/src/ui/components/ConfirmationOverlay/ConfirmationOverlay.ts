/**
 * ConfirmationOverlay Component
 *
 * Shows a confirmation message inline, replacing card content temporarily.
 * Used for destructive actions like delete.
 */

import confirmationOverlayStyles from './ConfirmationOverlay.css';

/**
 * Confirmation overlay options
 */
export interface ConfirmationOverlayOptions {
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * ConfirmationOverlay class
 *
 * Creates a confirmation overlay with Shadow DOM isolation.
 */
export class ConfirmationOverlay {
  private container: HTMLElement;
  private shadowRoot: ShadowRoot;
  private options: ConfirmationOverlayOptions;

  constructor(options: ConfirmationOverlayOptions) {
    this.options = {
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      danger: true,
      ...options,
    };

    // Create host element with closed Shadow DOM
    this.container = document.createElement('div');
    this.container.setAttribute('data-wc-component', 'confirmation-overlay');
    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = confirmationOverlayStyles;
    this.shadowRoot.appendChild(styleEl);

    // Create and render overlay
    this.render();
    this.attachEventListeners();
  }

  /**
   * Renders the confirmation overlay
   */
  private render(): void {
    const overlayHTML = `
      <div class="wc-confirmation-overlay" role="alertdialog" aria-labelledby="confirm-message">
        <div class="wc-confirmation-overlay__icon">⚠️</div>
        <p class="wc-confirmation-overlay__message" id="confirm-message">
          ${this.escapeHtml(this.options.message)}
        </p>
        <div class="wc-confirmation-overlay__actions">
          <button class="wc-confirmation-overlay__btn wc-confirmation-overlay__btn--cancel" data-action="cancel">
            ${this.escapeHtml(this.options.cancelText!)}
          </button>
          <button
            class="wc-confirmation-overlay__btn ${this.options.danger ? 'wc-confirmation-overlay__btn--danger' : 'wc-confirmation-overlay__btn--primary'}"
            data-action="confirm"
          >
            ${this.escapeHtml(this.options.confirmText!)}
          </button>
        </div>
      </div>
    `;

    const overlayContainer = document.createElement('div');
    overlayContainer.innerHTML = overlayHTML;
    this.shadowRoot.appendChild(overlayContainer.firstElementChild!);
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    const confirmBtn = this.shadowRoot.querySelector('[data-action="confirm"]');
    const cancelBtn = this.shadowRoot.querySelector('[data-action="cancel"]');

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        this.options.onConfirm();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.options.onCancel();
      });
    }

    // Focus confirm button by default
    setTimeout(() => {
      const btn = cancelBtn as HTMLElement;
      btn?.focus();
    }, 0);
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get the container element
   */
  getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Remove the overlay
   */
  remove(): void {
    this.container.remove();
  }
}

/**
 * Factory function to create a ConfirmationOverlay
 */
export function createConfirmationOverlay(options: ConfirmationOverlayOptions): ConfirmationOverlay {
  return new ConfirmationOverlay(options);
}
