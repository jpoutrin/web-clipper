/**
 * Dialog Component
 *
 * Modal dialog with variants, actions, and accessibility features.
 * Uses Shadow DOM for style isolation and focus trapping.
 */

import { createFocusTrap, type FocusTrap } from '../../utils/focus-trap';
import { getCombinedStyles } from '../../utils/shadow-dom';
import dialogCSS from './Dialog.css';

/**
 * Dialog action button configuration
 */
export interface DialogAction {
  /** Button label text */
  label: string;
  /** Button variant styling */
  variant: 'primary' | 'secondary' | 'danger';
  /** Click handler - can return promise for async operations */
  onClick: () => void | Promise<void>;
}

/**
 * Dialog component props
 */
export interface DialogProps {
  /** Visual variant of the dialog */
  variant?: 'default' | 'warning' | 'error' | 'success';
  /** Dialog title */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional SVG icon string */
  icon?: string;
  /** Primary action button */
  primaryAction?: DialogAction;
  /** Secondary action button */
  secondaryAction?: DialogAction;
  /** Whether the dialog can be dismissed with ESC or backdrop click */
  dismissible?: boolean;
  /** Callback when dialog is closed */
  onClose?: () => void;
}

/**
 * Dialog class manages a modal dialog with backdrop and Shadow DOM
 */
export class Dialog {
  private container: HTMLElement;
  private backdrop: HTMLElement;
  private dialog: HTMLElement;
  private shadowRoot: ShadowRoot;
  private focusTrap: FocusTrap;
  private props: DialogProps;
  private isOpen = false;

  constructor(props: DialogProps) {
    this.props = props;

    // Create container element
    this.container = document.createElement('div');
    this.container.className = 'wc-dialog-container';

    // Attach shadow root for style isolation
    this.shadowRoot = this.container.attachShadow({ mode: 'open' });

    // Add styles
    const styleEl = document.createElement('style');
    styleEl.textContent = getCombinedStyles(dialogCSS);
    this.shadowRoot.appendChild(styleEl);

    // Create backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'wc-dialog-backdrop';
    this.backdrop.setAttribute('aria-hidden', 'true');

    // Create dialog
    this.dialog = this.createDialogElement();

    // Assemble structure
    this.shadowRoot.appendChild(this.backdrop);
    this.shadowRoot.appendChild(this.dialog);

    // Setup focus trap
    this.focusTrap = createFocusTrap(this.dialog);

    // Bind event handlers
    this.handleEscapeKey = this.handleEscapeKey.bind(this);
    this.handleBackdropClick = this.handleBackdropClick.bind(this);
  }

  /**
   * Create the dialog element with content
   */
  private createDialogElement(): HTMLElement {
    const dialog = document.createElement('div');
    const role = this.props.variant === 'warning' || this.props.variant === 'error'
      ? 'alertdialog'
      : 'dialog';

    dialog.className = `wc-dialog wc-dialog-${this.props.variant || 'default'}`;
    dialog.setAttribute('role', role);
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'wc-dialog-title');

    if (this.props.description) {
      dialog.setAttribute('aria-describedby', 'wc-dialog-description');
    }

    // Build dialog content
    let content = '';

    // Close button (if dismissible)
    if (this.props.dismissible) {
      content += `
        <button
          type="button"
          class="wc-dialog-close"
          aria-label="Close dialog"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      `;
    }

    // Header with icon and title
    content += '<div class="wc-dialog-header">';

    if (this.props.icon) {
      content += `<div class="wc-dialog-icon">${this.props.icon}</div>`;
    }

    content += `
      <h2 id="wc-dialog-title" class="wc-dialog-title">
        ${this.escapeHtml(this.props.title)}
      </h2>
    </div>`;

    // Description
    if (this.props.description) {
      content += `
        <div id="wc-dialog-description" class="wc-dialog-description">
          ${this.escapeHtml(this.props.description)}
        </div>
      `;
    }

    // Actions
    if (this.props.primaryAction || this.props.secondaryAction) {
      content += '<div class="wc-dialog-actions">';

      if (this.props.secondaryAction) {
        content += `
          <button
            type="button"
            class="wc-dialog-button wc-dialog-button-secondary"
            data-action="secondary"
          >
            ${this.escapeHtml(this.props.secondaryAction.label)}
          </button>
        `;
      }

      if (this.props.primaryAction) {
        const primaryVariantClass =
          this.props.primaryAction.variant === 'danger' ? 'wc-dialog-button-danger' :
          this.props.primaryAction.variant === 'secondary' ? 'wc-dialog-button-secondary' :
          'wc-dialog-button-primary';

        content += `
          <button
            type="button"
            class="wc-dialog-button ${primaryVariantClass}"
            data-action="primary"
          >
            ${this.escapeHtml(this.props.primaryAction.label)}
          </button>
        `;
      }

      content += '</div>';
    }

    dialog.innerHTML = content;

    // Attach event listeners
    this.attachEventListeners(dialog);

    return dialog;
  }

  /**
   * Attach event listeners to dialog buttons
   */
  private attachEventListeners(dialog: HTMLElement): void {
    // Close button
    const closeButton = dialog.querySelector('.wc-dialog-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.close());
    }

    // Primary action
    const primaryButton = dialog.querySelector('[data-action="primary"]');
    if (primaryButton && this.props.primaryAction) {
      primaryButton.addEventListener('click', async () => {
        const button = primaryButton as HTMLButtonElement;
        const originalText = button.textContent;

        try {
          button.disabled = true;
          button.textContent = 'Processing...';

          await this.props.primaryAction!.onClick();
          this.close();
        } catch (error) {
          console.error('Dialog primary action error:', error);
          button.disabled = false;
          button.textContent = originalText || '';
        }
      });
    }

    // Secondary action
    const secondaryButton = dialog.querySelector('[data-action="secondary"]');
    if (secondaryButton && this.props.secondaryAction) {
      secondaryButton.addEventListener('click', async () => {
        const button = secondaryButton as HTMLButtonElement;
        const originalText = button.textContent;

        try {
          button.disabled = true;
          button.textContent = 'Processing...';

          await this.props.secondaryAction!.onClick();
          this.close();
        } catch (error) {
          console.error('Dialog secondary action error:', error);
          button.disabled = false;
          button.textContent = originalText || '';
        }
      });
    }

    // Backdrop click
    this.backdrop.addEventListener('click', this.handleBackdropClick);
  }

  /**
   * Handle escape key press
   */
  private handleEscapeKey(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.props.dismissible) {
      event.preventDefault();
      this.close();
    }
  }

  /**
   * Handle backdrop click
   */
  private handleBackdropClick(): void {
    if (this.props.dismissible) {
      this.close();
    }
  }

  /**
   * Open the dialog
   */
  open(): void {
    if (this.isOpen) return;

    // Add to DOM
    document.body.appendChild(this.container);

    // Trigger reflow for animation
    this.container.offsetHeight;

    // Add open class for animation
    this.backdrop.classList.add('wc-dialog-backdrop-open');
    this.dialog.classList.add('wc-dialog-open');

    // Setup event listeners
    document.addEventListener('keydown', this.handleEscapeKey);

    // Activate focus trap
    this.focusTrap.activate();

    this.isOpen = true;
  }

  /**
   * Close the dialog
   */
  close(): void {
    if (!this.isOpen) return;

    // Remove open classes
    this.backdrop.classList.remove('wc-dialog-backdrop-open');
    this.dialog.classList.remove('wc-dialog-open');

    // Deactivate focus trap
    this.focusTrap.deactivate();

    // Remove event listeners
    document.removeEventListener('keydown', this.handleEscapeKey);

    // Wait for animation to complete before removing from DOM
    setTimeout(() => {
      if (this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
    }, 200); // Match animation duration

    // Call onClose callback
    if (this.props.onClose) {
      this.props.onClose();
    }

    this.isOpen = false;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Create a dialog element (returns the container for manual control)
 */
export function createDialog(props: DialogProps): HTMLElement {
  const dialog = new Dialog(props);
  return dialog['container']; // Access private property for advanced use
}

/**
 * Show a dialog and wait for user action
 * @returns Promise that resolves to true if primary action was clicked, false otherwise
 */
export function showDialog(props: DialogProps): Promise<boolean> {
  return new Promise((resolve) => {
    let primaryClicked = false;

    const dialog = new Dialog({
      ...props,
      primaryAction: props.primaryAction
        ? {
            ...props.primaryAction,
            onClick: async () => {
              await props.primaryAction!.onClick();
              primaryClicked = true;
            },
          }
        : undefined,
      onClose: () => {
        if (props.onClose) {
          props.onClose();
        }
        resolve(primaryClicked);
      },
    });

    dialog.open();
  });
}
