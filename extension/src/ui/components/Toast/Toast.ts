/**
 * Web Clipper - Toast Component
 *
 * Individual toast notification with auto-dismiss, pause on hover,
 * and accessibility support.
 */

export interface ToastProps {
  /** Visual variant of the toast */
  variant: 'success' | 'error' | 'warning' | 'info';
  /** Toast title (required) */
  title: string;
  /** Optional description text */
  description?: string;
  /** Auto-dismiss duration in ms, 0 for persistent, default 5000 */
  duration?: number;
  /** Whether toast can be manually dismissed */
  dismissible?: boolean;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Callback when toast is dismissed */
  onDismiss?: () => void;
}

export class Toast {
  private element: HTMLDivElement;
  private progressBar: HTMLDivElement | null = null;
  private dismissTimer: number | null = null;
  private startTime: number = 0;
  private remainingTime: number;
  private isPaused: boolean = false;
  private isExiting: boolean = false;

  readonly id: string;
  readonly props: ToastProps;

  constructor(props: ToastProps) {
    this.props = props;
    this.id = this.generateId();
    this.remainingTime = props.duration ?? 5000;
    this.element = this.createElement();

    if (this.remainingTime > 0) {
      this.startDismissTimer();
    }
  }

  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private createElement(): HTMLDivElement {
    const toast = document.createElement('div');
    toast.className = `wc-toast wc-toast--${this.props.variant}`;
    toast.setAttribute('id', this.id);

    // Accessibility attributes
    const role = this.props.variant === 'error' || this.props.variant === 'warning'
      ? 'alert'
      : 'status';
    const ariaLive = this.props.variant === 'error' || this.props.variant === 'warning'
      ? 'assertive'
      : 'polite';

    toast.setAttribute('role', role);
    toast.setAttribute('aria-live', ariaLive);
    toast.setAttribute('aria-atomic', 'true');

    // Content container
    const content = document.createElement('div');
    content.className = 'wc-toast__content';

    // Icon
    const icon = this.createIcon();
    content.appendChild(icon);

    // Text container
    const textContainer = document.createElement('div');
    textContainer.className = 'wc-toast__text';

    const title = document.createElement('div');
    title.className = 'wc-toast__title';
    title.textContent = this.props.title;
    textContainer.appendChild(title);

    if (this.props.description) {
      const description = document.createElement('div');
      description.className = 'wc-toast__description';
      description.textContent = this.props.description;
      textContainer.appendChild(description);
    }

    content.appendChild(textContainer);

    // Action button
    if (this.props.action) {
      const actionButton = document.createElement('button');
      actionButton.type = 'button';
      actionButton.className = 'wc-toast__action';
      actionButton.textContent = this.props.action.label;
      actionButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.props.action?.onClick();
      });
      content.appendChild(actionButton);
    }

    toast.appendChild(content);

    // Dismiss button
    if (this.props.dismissible !== false) {
      const dismissButton = document.createElement('button');
      dismissButton.type = 'button';
      dismissButton.className = 'wc-toast__dismiss';
      dismissButton.setAttribute('aria-label', 'Dismiss notification');
      dismissButton.innerHTML = this.getDismissIcon();
      dismissButton.addEventListener('click', () => this.dismiss());
      toast.appendChild(dismissButton);
    }

    // Progress bar for timed toasts
    if (this.remainingTime > 0) {
      this.progressBar = document.createElement('div');
      this.progressBar.className = 'wc-toast__progress';

      const progressFill = document.createElement('div');
      progressFill.className = 'wc-toast__progress-fill';
      this.progressBar.appendChild(progressFill);

      toast.appendChild(this.progressBar);
    }

    // Pause timer on hover/focus
    toast.addEventListener('mouseenter', () => this.pauseTimer());
    toast.addEventListener('mouseleave', () => this.resumeTimer());
    toast.addEventListener('focusin', () => this.pauseTimer());
    toast.addEventListener('focusout', () => this.resumeTimer());

    return toast;
  }

  private createIcon(): HTMLElement {
    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'wc-toast__icon';
    iconWrapper.innerHTML = this.getIconSvg();
    iconWrapper.setAttribute('aria-hidden', 'true');
    return iconWrapper;
  }

  private getIconSvg(): string {
    const icons = {
      success: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM8 15L3 10L4.41 8.59L8 12.17L15.59 4.58L17 6L8 15Z" fill="currentColor"/>
      </svg>`,
      error: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V13H11V15ZM11 11H9V5H11V11Z" fill="currentColor"/>
      </svg>`,
      warning: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 17H19L10 1L1 17ZM11 14H9V12H11V14ZM11 10H9V6H11V10Z" fill="currentColor"/>
      </svg>`,
      info: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V9H11V15ZM11 7H9V5H11V7Z" fill="currentColor"/>
      </svg>`
    };
    return icons[this.props.variant];
  }

  private getDismissIcon(): string {
    return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  private startDismissTimer(): void {
    if (this.remainingTime <= 0) return;

    this.startTime = Date.now();
    this.dismissTimer = window.setTimeout(() => {
      this.dismiss();
    }, this.remainingTime);

    this.updateProgressBar();
  }

  private updateProgressBar(): void {
    if (!this.progressBar || this.remainingTime <= 0) return;

    const fill = this.progressBar.querySelector('.wc-toast__progress-fill') as HTMLElement;
    if (!fill) return;

    const totalDuration = this.props.duration ?? 5000;
    const elapsed = Date.now() - this.startTime;
    const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));

    fill.style.width = `${progress}%`;

    if (!this.isPaused && !this.isExiting) {
      requestAnimationFrame(() => this.updateProgressBar());
    }
  }

  private pauseTimer(): void {
    if (this.isPaused || this.remainingTime <= 0) return;

    this.isPaused = true;

    if (this.dismissTimer !== null) {
      window.clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }

    // Calculate remaining time
    const elapsed = Date.now() - this.startTime;
    this.remainingTime = Math.max(0, this.remainingTime - elapsed);
  }

  private resumeTimer(): void {
    if (!this.isPaused || this.remainingTime <= 0) return;

    this.isPaused = false;
    this.startDismissTimer();
  }

  public dismiss(): void {
    if (this.isExiting) return;

    this.isExiting = true;

    // Clear timer
    if (this.dismissTimer !== null) {
      window.clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }

    // Add exit animation
    this.element.classList.add('wc-toast--exiting');

    // Wait for animation to complete
    setTimeout(() => {
      this.element.remove();
      this.props.onDismiss?.();
    }, 200); // Match animation duration
  }

  public getElement(): HTMLDivElement {
    return this.element;
  }

  public mount(container: HTMLElement): void {
    container.appendChild(this.element);

    // Trigger enter animation
    requestAnimationFrame(() => {
      this.element.classList.add('wc-toast--visible');
    });
  }
}
