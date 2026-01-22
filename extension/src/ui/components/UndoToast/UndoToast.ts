/**
 * UndoToast Component
 *
 * A toast notification with an undo action.
 * Automatically dismisses after a specified duration.
 */

import undoToastStyles from './UndoToast.css';

/**
 * Undo toast options
 */
export interface UndoToastOptions {
  message: string;
  duration?: number; // milliseconds, default 5000
  onUndo: () => void;
  onDismiss?: () => void;
}

/**
 * UndoToast class
 */
export class UndoToast {
  private container: HTMLElement;
  private shadowRoot: ShadowRoot;
  private options: UndoToastOptions;
  private dismissTimer?: ReturnType<typeof setTimeout>;

  constructor(options: UndoToastOptions) {
    this.options = {
      duration: 5000,
      ...options,
    };

    // Create host element with closed Shadow DOM
    this.container = document.createElement('div');
    this.container.setAttribute('data-wc-component', 'undo-toast');
    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = undoToastStyles;
    this.shadowRoot.appendChild(styleEl);

    // Create and render toast
    this.render();
    this.attachEventListeners();

    // Add to document
    document.body.appendChild(this.container);

    // Start dismiss timer
    if (this.options.duration && this.options.duration > 0) {
      this.startDismissTimer();
    }

    // Animate in
    setTimeout(() => {
      const toast = this.shadowRoot.querySelector('.wc-undo-toast') as HTMLElement;
      if (toast) {
        toast.classList.add('wc-undo-toast--visible');
      }
    }, 10);
  }

  /**
   * Renders the toast
   */
  private render(): void {
    const toastHTML = `
      <div class="wc-undo-toast" role="status" aria-live="polite" aria-atomic="true">
        <div class="wc-undo-toast__content">
          <span class="wc-undo-toast__icon">✓</span>
          <span class="wc-undo-toast__message">${this.escapeHtml(this.options.message)}</span>
        </div>
        <button class="wc-undo-toast__button" aria-label="Undo action">
          Undo
        </button>
      </div>
    `;

    const toastContainer = document.createElement('div');
    toastContainer.innerHTML = toastHTML;
    this.shadowRoot.appendChild(toastContainer.firstElementChild!);
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    const undoButton = this.shadowRoot.querySelector('.wc-undo-toast__button');
    if (undoButton) {
      undoButton.addEventListener('click', () => {
        this.handleUndo();
      });
    }
  }

  /**
   * Handle undo action
   */
  private handleUndo(): void {
    this.cancelDismissTimer();
    this.options.onUndo();
    this.dismiss();
  }

  /**
   * Start dismiss timer
   */
  private startDismissTimer(): void {
    this.dismissTimer = setTimeout(() => {
      this.dismiss();
    }, this.options.duration);
  }

  /**
   * Cancel dismiss timer
   */
  private cancelDismissTimer(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = undefined;
    }
  }

  /**
   * Dismiss the toast
   */
  dismiss(): void {
    this.cancelDismissTimer();

    const toast = this.shadowRoot.querySelector('.wc-undo-toast') as HTMLElement;
    if (toast) {
      toast.classList.remove('wc-undo-toast--visible');
      setTimeout(() => {
        if (this.options.onDismiss) {
          this.options.onDismiss();
        }
        this.container.remove();
      }, 300);
    }
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
}

/**
 * Factory function to create an UndoToast
 */
export function showUndoToast(options: UndoToastOptions): UndoToast {
  return new UndoToast(options);
}
