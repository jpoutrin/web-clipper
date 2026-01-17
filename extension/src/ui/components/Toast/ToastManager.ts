/**
 * Web Clipper - Toast Manager
 *
 * Singleton manager for displaying and managing multiple toast notifications.
 * Handles stacking, positioning, and lifecycle management.
 */

import { Toast, type ToastProps } from './Toast';

export interface ToastManagerConfig {
  /** Maximum number of visible toasts */
  maxToasts?: number;
  /** Position of toast container */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Vertical gap between toasts in pixels */
  gap?: number;
}

export class ToastManager {
  private static instance: ToastManager | null = null;
  private container: HTMLDivElement | null = null;
  private toasts: Map<string, Toast> = new Map();
  private config: Required<ToastManagerConfig>;

  private constructor(config: ToastManagerConfig = {}) {
    this.config = {
      maxToasts: config.maxToasts ?? 5,
      position: config.position ?? 'bottom-right',
      gap: config.gap ?? 12,
    };
  }

  /**
   * Get the singleton instance of ToastManager
   */
  public static getInstance(config?: ToastManagerConfig): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager(config);
    }
    return ToastManager.instance;
  }

  /**
   * Initialize and mount the toast container
   */
  private ensureContainer(): HTMLDivElement {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = `wc-toast-container wc-toast-container--${this.config.position}`;
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-atomic', 'false');
      this.container.style.setProperty('--wc-toast-gap', `${this.config.gap}px`);

      // Append to body or extension root
      const root = document.body;
      root.appendChild(this.container);
    }
    return this.container;
  }

  /**
   * Show a new toast notification
   * @returns Toast ID for later reference
   */
  public show(props: ToastProps): string {
    const container = this.ensureContainer();

    // Remove oldest toast if max limit reached
    if (this.toasts.size >= this.config.maxToasts) {
      const firstToastId = this.toasts.keys().next().value;
      if (firstToastId) {
        this.dismiss(firstToastId);
      }
    }

    // Create and mount toast
    const toast = new Toast({
      ...props,
      onDismiss: () => {
        this.toasts.delete(toast.id);
        props.onDismiss?.();
      },
    });

    this.toasts.set(toast.id, toast);
    toast.mount(container);

    return toast.id;
  }

  /**
   * Dismiss a specific toast by ID
   */
  public dismiss(id: string): void {
    const toast = this.toasts.get(id);
    if (toast) {
      toast.dismiss();
      this.toasts.delete(id);
    }
  }

  /**
   * Dismiss all active toasts
   */
  public dismissAll(): void {
    const toastIds = Array.from(this.toasts.keys());
    toastIds.forEach(id => this.dismiss(id));
  }

  /**
   * Get the number of active toasts
   */
  public getActiveCount(): number {
    return this.toasts.size;
  }

  /**
   * Check if a specific toast is active
   */
  public isActive(id: string): boolean {
    return this.toasts.has(id);
  }

  /**
   * Update configuration (will apply to new toasts)
   */
  public updateConfig(config: Partial<ToastManagerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };

    if (this.container) {
      // Update container class if position changed
      if (config.position) {
        this.container.className = `wc-toast-container wc-toast-container--${config.position}`;
      }

      // Update gap CSS variable
      if (config.gap !== undefined) {
        this.container.style.setProperty('--wc-toast-gap', `${config.gap}px`);
      }
    }
  }

  /**
   * Clean up and remove the container
   */
  public destroy(): void {
    this.dismissAll();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    ToastManager.instance = null;
  }
}

// Export singleton instance with default config
export const toastManager = ToastManager.getInstance();

// Convenience methods for common toast types
export const toast = {
  success: (title: string, description?: string, options?: Partial<ToastProps>) =>
    toastManager.show({ variant: 'success', title, description, ...options }),

  error: (title: string, description?: string, options?: Partial<ToastProps>) =>
    toastManager.show({ variant: 'error', title, description, ...options }),

  warning: (title: string, description?: string, options?: Partial<ToastProps>) =>
    toastManager.show({ variant: 'warning', title, description, ...options }),

  info: (title: string, description?: string, options?: Partial<ToastProps>) =>
    toastManager.show({ variant: 'info', title, description, ...options }),

  dismiss: (id: string) => toastManager.dismiss(id),

  dismissAll: () => toastManager.dismissAll(),
};
