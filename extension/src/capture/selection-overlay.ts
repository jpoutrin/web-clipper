/**
 * Selection Overlay Module
 *
 * Creates an overlay for selecting page elements.
 * Uses Shadow DOM for style isolation.
 */

import { CaptureConfig } from '../types';
import { captureSelection } from './selection';

export interface SelectionOverlayCallbacks {
  onSelect: (result: Awaited<ReturnType<typeof captureSelection>>) => void;
  onCancel: () => void;
}

/**
 * Selection Overlay Class
 *
 * Creates an isolated overlay for element selection using Shadow DOM.
 */
export class SelectionOverlay {
  private shadowHost: HTMLDivElement;
  private shadowRoot: ShadowRoot;
  private highlightBox: HTMLDivElement;
  private toolbar: HTMLDivElement;
  private selectedElement: HTMLElement | null = null;
  private config: CaptureConfig;
  private callbacks: SelectionOverlayCallbacks;
  private isActive = true;

  constructor(config: CaptureConfig, callbacks: SelectionOverlayCallbacks) {
    this.config = config;
    this.callbacks = callbacks;

    // Create shadow host
    this.shadowHost = document.createElement('div');
    this.shadowHost.id = 'web-clipper-selection-host';
    this.shadowHost.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      z-index: 2147483647 !important;
      pointer-events: none !important;
    `;

    // Attach shadow DOM (closed for isolation)
    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'closed' });

    // Add styles
    this.shadowRoot.innerHTML = this.getStyles();

    // Create highlight box
    this.highlightBox = document.createElement('div');
    this.highlightBox.className = 'wc-highlight-box';
    this.shadowRoot.appendChild(this.highlightBox);

    // Create toolbar
    this.toolbar = this.createToolbar();
    this.shadowRoot.appendChild(this.toolbar);

    // Attach to document
    document.body.appendChild(this.shadowHost);

    // Setup event listeners
    this.attachEventListeners();
  }

  /**
   * Get overlay styles
   */
  private getStyles(): string {
    return `
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .wc-highlight-box {
          position: fixed;
          border: 2px dashed #3b82f6;
          background: rgba(59, 130, 246, 0.1);
          pointer-events: none;
          transition: all 0.1s ease-out;
          border-radius: 4px;
          display: none;
        }

        .wc-highlight-box.visible {
          display: block;
        }

        .wc-highlight-box.selected {
          border-style: solid;
          border-color: #22c55e;
          background: rgba(34, 197, 94, 0.1);
        }

        .wc-toolbar {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 12px 20px;
          display: flex;
          gap: 12px;
          align-items: center;
          pointer-events: auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          z-index: 2147483647;
        }

        .wc-toolbar-text {
          color: #374151;
        }

        .wc-toolbar-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.15s ease;
        }

        .wc-toolbar-btn:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .wc-toolbar-btn.primary {
          background: #3b82f6;
          color: white;
        }

        .wc-toolbar-btn.primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .wc-toolbar-btn.primary:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .wc-toolbar-btn.secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .wc-toolbar-btn.secondary:hover {
          background: #e5e7eb;
        }

        .wc-loading {
          display: none;
          align-items: center;
          gap: 8px;
          color: #6b7280;
        }

        .wc-loading.visible {
          display: flex;
        }

        .wc-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Success State */
        .wc-toolbar.success {
          background: #ecfdf5;
          border: 1px solid #10b981;
        }

        .wc-success {
          display: none;
          align-items: center;
          gap: 8px;
          color: #065f46;
          font-weight: 500;
        }

        .wc-success.visible {
          display: flex;
        }

        .wc-success-icon {
          width: 20px;
          height: 20px;
          color: #10b981;
        }

        /* Error State */
        .wc-toolbar.error {
          background: #fef2f2;
          border: 1px solid #ef4444;
        }

        .wc-error {
          display: none;
          align-items: center;
          gap: 8px;
          color: #991b1b;
          font-weight: 500;
        }

        .wc-error.visible {
          display: flex;
        }

        .wc-error-icon {
          width: 20px;
          height: 20px;
          color: #ef4444;
        }

        /* Fade out animation */
        .wc-toolbar.fade-out {
          animation: fadeOut 200ms ease-out forwards;
        }

        @keyframes fadeOut {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }

        @keyframes successPop {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .wc-success-icon {
          animation: successPop 400ms ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .wc-highlight-box {
            transition: none;
          }
          .wc-spinner {
            animation: none;
          }
          .wc-toolbar.fade-out {
            animation: none;
            opacity: 0;
          }
          .wc-success-icon {
            animation: none;
          }
        }
      </style>
    `;
  }

  /**
   * Create the toolbar element
   */
  private createToolbar(): HTMLDivElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'wc-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Element selection toolbar');

    toolbar.innerHTML = `
      <span class="wc-toolbar-text" id="wc-instruction">Click an element to select it</span>
      <div class="wc-loading" id="wc-loading">
        <div class="wc-spinner"></div>
        <span>Capturing...</span>
      </div>
      <div class="wc-success" id="wc-success">
        <svg class="wc-success-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
        <span>Clip saved successfully!</span>
      </div>
      <div class="wc-error" id="wc-error">
        <svg class="wc-error-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <span id="wc-error-message">Failed to save clip</span>
      </div>
      <button class="wc-toolbar-btn primary" id="wc-confirm" disabled aria-disabled="true">
        Clip Selection
      </button>
      <button class="wc-toolbar-btn primary" id="wc-retry" style="display: none;">
        Retry
      </button>
      <button class="wc-toolbar-btn secondary" id="wc-cancel">
        Cancel (Esc)
      </button>
      <button class="wc-toolbar-btn secondary" id="wc-close" style="display: none;">
        Close
      </button>
    `;

    return toolbar;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Mouse move - highlight hovered element
    document.addEventListener('mousemove', this.handleMouseMove, true);

    // Click - select element
    document.addEventListener('click', this.handleClick, true);

    // Keyboard - Escape to cancel
    document.addEventListener('keydown', this.handleKeyDown, true);

    // Toolbar buttons
    const confirmBtn = this.shadowRoot.getElementById('wc-confirm');
    const cancelBtn = this.shadowRoot.getElementById('wc-cancel');
    const retryBtn = this.shadowRoot.getElementById('wc-retry');
    const closeBtn = this.shadowRoot.getElementById('wc-close');

    confirmBtn?.addEventListener('click', this.handleConfirm);
    cancelBtn?.addEventListener('click', this.handleCancel);
    retryBtn?.addEventListener('click', this.handleRetry);
    closeBtn?.addEventListener('click', this.handleClose);
  }

  /**
   * Handle mouse move - highlight element under cursor
   */
  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isActive) return;

    // Don't update highlight if an element is already selected
    if (this.selectedElement) return;

    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;

    // Ignore our own overlay elements
    if (!target || target.closest('#web-clipper-selection-host')) return;

    // Ignore tiny elements
    if (target.offsetWidth < 20 || target.offsetHeight < 20) return;

    // Update highlight position
    const rect = target.getBoundingClientRect();
    this.highlightBox.style.top = `${rect.top}px`;
    this.highlightBox.style.left = `${rect.left}px`;
    this.highlightBox.style.width = `${rect.width}px`;
    this.highlightBox.style.height = `${rect.height}px`;
    this.highlightBox.classList.add('visible');
  };

  /**
   * Handle click - select element
   */
  private handleClick = (e: MouseEvent): void => {
    if (!this.isActive) return;

    // Check if click originated from our shadow host (toolbar clicks)
    // Events from shadow DOM are retargeted to the host
    if (e.target === this.shadowHost) {
      return; // Let toolbar button clicks through
    }

    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;

    // Ignore if no valid target
    if (!target) return;

    // Only prevent default for page elements
    e.preventDefault();
    e.stopPropagation();

    // Select the element
    this.selectedElement = target;
    this.highlightBox.classList.add('selected');

    // Enable confirm button
    const confirmBtn = this.shadowRoot.getElementById('wc-confirm') as HTMLButtonElement;
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.setAttribute('aria-disabled', 'false');
    }

    // Update instruction text
    const instruction = this.shadowRoot.getElementById('wc-instruction');
    if (instruction) {
      const tagName = target.tagName.toLowerCase();
      const className = target.className
        ? `.${target.className.split(' ').slice(0, 2).join('.')}`
        : '';
      instruction.textContent = `Selected: <${tagName}${className}>`;
    }
  };

  /**
   * Handle keyboard events
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.isActive) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.handleCancel();
    } else if (e.key === 'Enter' && this.selectedElement) {
      e.preventDefault();
      this.handleConfirm();
    }
  };

  /**
   * Handle confirm button click
   */
  private handleConfirm = async (): Promise<void> => {
    if (!this.selectedElement || !this.isActive) return;

    this.isActive = false;

    // Get UI elements
    const instruction = this.shadowRoot.getElementById('wc-instruction');
    const loading = this.shadowRoot.getElementById('wc-loading');
    const success = this.shadowRoot.getElementById('wc-success');
    const error = this.shadowRoot.getElementById('wc-error');
    const errorMessage = this.shadowRoot.getElementById('wc-error-message');
    const confirmBtn = this.shadowRoot.getElementById('wc-confirm') as HTMLButtonElement;
    const cancelBtn = this.shadowRoot.getElementById('wc-cancel') as HTMLButtonElement;
    const retryBtn = this.shadowRoot.getElementById('wc-retry') as HTMLButtonElement;
    const closeBtn = this.shadowRoot.getElementById('wc-close') as HTMLButtonElement;

    // Show loading state
    if (instruction) instruction.style.display = 'none';
    if (loading) loading.classList.add('visible');
    if (confirmBtn) confirmBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';

    try {
      // Capture the selection
      const result = await captureSelection(this.selectedElement, this.config);

      // Send to background for clip submission and wait for response
      const response = await chrome.runtime.sendMessage({
        type: 'SELECTION_COMPLETE',
        payload: {
          mode: 'selection',
          title: document.title,
          url: window.location.href,
          markdown: result.markdown,
          html: result.html,
          images: result.images,
          selector: result.selector,
        },
      });

      // Hide loading
      if (loading) loading.classList.remove('visible');

      if (response.success || response.path) {
        // Show success state
        this.toolbar.classList.add('success');
        if (success) success.classList.add('visible');
        if (closeBtn) closeBtn.style.display = '';

        // Hide highlight box
        this.highlightBox.classList.remove('visible');

        // Auto-dismiss after 2.5 seconds
        setTimeout(() => {
          this.dismissWithAnimation();
        }, 2500);
      } else {
        // Show error state
        this.showError(response.error || 'Failed to save clip');
      }
    } catch (err) {
      console.error('Selection capture failed:', err);
      if (loading) loading.classList.remove('visible');
      this.showError(err instanceof Error ? err.message : 'Capture failed');
    }
  };

  /**
   * Show error state in toolbar
   */
  private showError(message: string): void {
    const error = this.shadowRoot.getElementById('wc-error');
    const errorMessage = this.shadowRoot.getElementById('wc-error-message');
    const retryBtn = this.shadowRoot.getElementById('wc-retry') as HTMLButtonElement;
    const closeBtn = this.shadowRoot.getElementById('wc-close') as HTMLButtonElement;

    this.toolbar.classList.add('error');
    if (error) error.classList.add('visible');
    if (errorMessage) errorMessage.textContent = message;
    if (retryBtn) retryBtn.style.display = '';
    if (closeBtn) closeBtn.style.display = '';

    // Re-enable for retry
    this.isActive = true;
  }

  /**
   * Handle retry button click
   */
  private handleRetry = (): void => {
    // Reset UI to loading state and retry
    const error = this.shadowRoot.getElementById('wc-error');
    const retryBtn = this.shadowRoot.getElementById('wc-retry') as HTMLButtonElement;
    const closeBtn = this.shadowRoot.getElementById('wc-close') as HTMLButtonElement;

    this.toolbar.classList.remove('error');
    if (error) error.classList.remove('visible');
    if (retryBtn) retryBtn.style.display = 'none';
    if (closeBtn) closeBtn.style.display = 'none';

    // Retry capture
    this.handleConfirm();
  };

  /**
   * Handle close button click
   */
  private handleClose = (): void => {
    this.dismissWithAnimation();
  };

  /**
   * Dismiss overlay with fade animation
   */
  private dismissWithAnimation(): void {
    this.toolbar.classList.add('fade-out');
    this.highlightBox.style.opacity = '0';
    this.highlightBox.style.transition = 'opacity 200ms ease-out';

    setTimeout(() => {
      this.cleanup();
      // Don't call onSelect callback since we already submitted
    }, 200);
  }

  /**
   * Handle cancel button click
   */
  private handleCancel = (): void => {
    this.cleanup();
    this.callbacks.onCancel();
  };

  /**
   * Cleanup and remove overlay
   */
  private cleanup(): void {
    this.isActive = false;
    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
    this.shadowHost.remove();
  }

  /**
   * Check if overlay is active
   */
  isOverlayActive(): boolean {
    return this.isActive;
  }
}

/**
 * Create and show a selection overlay
 */
export function createSelectionOverlay(
  config: CaptureConfig,
  callbacks: SelectionOverlayCallbacks
): SelectionOverlay {
  return new SelectionOverlay(config, callbacks);
}
