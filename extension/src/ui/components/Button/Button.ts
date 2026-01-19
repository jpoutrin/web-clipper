/**
 * Button Component
 *
 * A versatile button component with Shadow DOM isolation supporting multiple
 * variants, sizes, states (loading, disabled), and icon configurations.
 *
 * Features:
 * - Shadow DOM for style isolation
 * - Multiple variants: primary, secondary, ghost, danger
 * - Three sizes: sm (28px), md (36px), lg (44px)
 * - Loading state with spinner
 * - Icon support (left, right, or icon-only)
 * - Full width mode
 * - Comprehensive accessibility support
 * - Dark mode compatible
 */

import { getCombinedStyles } from '../../utils';

/**
 * Button component styles
 * Inlined for Shadow DOM isolation
 */
const buttonStyles = `
/* Base Button Styles */
.wc-button {
  /* Layout */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--wc-icon-gap-sm);

  /* Typography */
  font-family: var(--wc-font-family-sans);
  font-size: var(--wc-font-size-sm);
  font-weight: var(--wc-font-weight-medium);
  line-height: var(--wc-line-height-normal);
  text-align: center;
  text-decoration: none;
  white-space: nowrap;

  /* Border */
  border: var(--wc-border-width-base) solid transparent;
  border-radius: var(--wc-radius-button);

  /* Interaction */
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;

  /* Transitions */
  transition: var(--wc-transition-button);

  /* Ensure minimum touch target for accessibility */
  min-height: 2.75rem; /* 44px */
  min-width: 2.75rem; /* 44px */
}

/* Remove default button styles */
.wc-button::-moz-focus-inner {
  border: 0;
  padding: 0;
}

/* Focus Visible - Accessibility */
.wc-button:focus-visible {
  outline: 2px solid var(--wc-border-focus);
  outline-offset: 2px;
  box-shadow: var(--wc-shadow-focus);
}

/* Disabled State */
.wc-button:disabled {
  opacity: var(--wc-opacity-disabled);
  cursor: not-allowed;
  pointer-events: none;
}

/* Loading State */
.wc-button--loading {
  cursor: wait;
  pointer-events: none;
}

/* SIZE VARIANTS */

/* Small - 28px height */
.wc-button--sm {
  min-height: 1.75rem;
  padding: var(--wc-button-padding-y-sm) var(--wc-button-padding-x-sm);
  font-size: var(--wc-font-size-xs);
  gap: var(--wc-icon-gap-xs);
}

/* Medium (Default) - 36px height */
.wc-button--md {
  min-height: 2.25rem;
  padding: var(--wc-button-padding-y-base) var(--wc-button-padding-x-base);
  font-size: var(--wc-font-size-sm);
  gap: var(--wc-icon-gap-sm);
}

/* Large - 44px height */
.wc-button--lg {
  min-height: 2.75rem;
  padding: var(--wc-button-padding-y-lg) var(--wc-button-padding-x-lg);
  font-size: var(--wc-font-size-base);
  gap: var(--wc-icon-gap-base);
}

/* ICON-ONLY VARIANT */

.wc-button--icon-only {
  padding: var(--wc-button-padding-y-base);
  aspect-ratio: 1;
}

.wc-button--icon-only.wc-button--sm {
  padding: var(--wc-button-padding-y-sm);
  min-width: 1.75rem;
}

.wc-button--icon-only.wc-button--md {
  padding: var(--wc-button-padding-y-base);
  min-width: 2.25rem;
}

.wc-button--icon-only.wc-button--lg {
  padding: var(--wc-button-padding-y-lg);
  min-width: 2.75rem;
}

/* FULL WIDTH VARIANT */

.wc-button--full-width {
  width: 100%;
}

/* VARIANT STYLES */

/* Primary Variant */
.wc-button--primary {
  color: var(--wc-text-inverse);
  background-color: var(--wc-interactive-default);
  border-color: var(--wc-interactive-default);
}

.wc-button--primary:hover:not(:disabled) {
  background-color: var(--wc-interactive-hover);
  border-color: var(--wc-interactive-hover);
  box-shadow: var(--wc-shadow-button);
}

.wc-button--primary:active:not(:disabled) {
  background-color: var(--wc-interactive-active);
  border-color: var(--wc-interactive-active);
  box-shadow: none;
}

/* Secondary Variant */
.wc-button--secondary {
  color: var(--wc-text-primary);
  background-color: var(--wc-bg-secondary);
  border-color: var(--wc-border-default);
}

.wc-button--secondary:hover:not(:disabled) {
  background-color: var(--wc-bg-hover);
  border-color: var(--wc-border-strong);
  box-shadow: var(--wc-shadow-button);
}

.wc-button--secondary:active:not(:disabled) {
  background-color: var(--wc-bg-active);
  border-color: var(--wc-border-strong);
  box-shadow: none;
}

/* Ghost Variant */
.wc-button--ghost {
  color: var(--wc-text-primary);
  background-color: transparent;
  border-color: transparent;
}

.wc-button--ghost:hover:not(:disabled) {
  background-color: var(--wc-bg-hover);
  border-color: transparent;
}

.wc-button--ghost:active:not(:disabled) {
  background-color: var(--wc-bg-active);
  border-color: transparent;
}

/* Danger Variant */
.wc-button--danger {
  color: var(--wc-text-inverse);
  background-color: var(--wc-error-600);
  border-color: var(--wc-error-600);
}

.wc-button--danger:hover:not(:disabled) {
  background-color: var(--wc-error-700);
  border-color: var(--wc-error-700);
  box-shadow: var(--wc-shadow-button);
}

.wc-button--danger:active:not(:disabled) {
  background-color: var(--wc-error-800);
  border-color: var(--wc-error-800);
  box-shadow: none;
}

.wc-button--danger:focus-visible {
  box-shadow: var(--wc-shadow-focus-error);
}

/* BUTTON CONTENT ELEMENTS */

.wc-button__text {
  display: inline-block;
  flex-shrink: 0;
}

.wc-button__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wc-button__icon svg {
  display: block;
  width: var(--wc-icon-size-sm);
  height: var(--wc-icon-size-sm);
}

.wc-button--sm .wc-button__icon svg {
  width: var(--wc-icon-size-xs);
  height: var(--wc-icon-size-xs);
}

.wc-button--md .wc-button__icon svg {
  width: var(--wc-icon-size-sm);
  height: var(--wc-icon-size-sm);
}

.wc-button--lg .wc-button__icon svg {
  width: var(--wc-icon-size-base);
  height: var(--wc-icon-size-base);
}

.wc-button--icon-only .wc-button__icon svg {
  margin: 0;
}

/* LOADING SPINNER */

.wc-button__spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wc-button__spinner-svg {
  width: var(--wc-icon-size-sm);
  height: var(--wc-icon-size-sm);
  animation: wc-spin var(--wc-animation-spin) linear infinite;
}

.wc-button--sm .wc-button__spinner-svg {
  width: var(--wc-icon-size-xs);
  height: var(--wc-icon-size-xs);
}

.wc-button--md .wc-button__spinner-svg {
  width: var(--wc-icon-size-sm);
  height: var(--wc-icon-size-sm);
}

.wc-button--lg .wc-button__spinner-svg {
  width: var(--wc-icon-size-base);
  height: var(--wc-icon-size-base);
}

.wc-button__spinner-circle {
  opacity: 0.25;
}

.wc-button__spinner-path {
  opacity: 0.75;
}

/* DARK MODE ADJUSTMENTS */

@media (prefers-color-scheme: dark) {
  .wc-button--secondary {
    background-color: var(--wc-bg-tertiary);
  }

  .wc-button--secondary:hover:not(:disabled) {
    background-color: var(--wc-bg-hover);
  }

  .wc-button--ghost:hover:not(:disabled) {
    background-color: var(--wc-bg-hover);
  }

  .wc-button--danger {
    background-color: var(--wc-error-500);
    border-color: var(--wc-error-500);
  }

  .wc-button--danger:hover:not(:disabled) {
    background-color: var(--wc-error-400);
    border-color: var(--wc-error-400);
  }

  .wc-button--danger:active:not(:disabled) {
    background-color: var(--wc-error-300);
    border-color: var(--wc-error-300);
  }
}

/* REDUCED MOTION */

@media (prefers-reduced-motion: reduce) {
  .wc-button {
    transition: none;
  }

  .wc-button__spinner-svg {
    animation: none;
  }
}

/* HIGH CONTRAST MODE */

@media (prefers-contrast: high) {
  .wc-button {
    border-width: var(--wc-border-width-medium);
  }

  .wc-button--ghost {
    border-color: currentColor;
  }

  .wc-button:focus-visible {
    outline-width: 3px;
  }
}

/* MOBILE OPTIMIZATIONS */

@media (pointer: coarse) {
  .wc-button {
    min-height: 2.75rem; /* 44px - iOS minimum touch target */
    min-width: 2.75rem;
  }

  .wc-button--sm {
    min-height: 2.5rem; /* 40px */
    min-width: 2.5rem;
  }
}
`;

/**
 * Button configuration properties
 */
export interface ButtonProps {
  /** Visual style variant */
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Size of the button */
  size: 'sm' | 'md' | 'lg';
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the button is in loading state */
  loading?: boolean;
  /** Whether the button only displays an icon */
  iconOnly?: boolean;
  /** SVG string for icon */
  icon?: string;
  /** Position of icon relative to text */
  iconPosition?: 'left' | 'right';
  /** Whether button should take full width of container */
  fullWidth?: boolean;
  /** Accessible label (required for iconOnly buttons) */
  ariaLabel?: string;
}

/**
 * Button component class
 *
 * Creates an isolated button component with Shadow DOM for style encapsulation.
 * Emits 'wc-click' custom events when clicked (unless disabled or loading).
 */
export class Button {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private buttonElement: HTMLButtonElement;
  private props: ButtonProps;

  /**
   * Creates a new Button instance
   *
   * @param props - Button configuration
   * @param content - Text content for the button (omit for iconOnly)
   */
  constructor(props: ButtonProps, content?: string) {
    // Validate iconOnly buttons have aria-label
    if (props.iconOnly && !props.ariaLabel) {
      throw new Error('ariaLabel is required for iconOnly buttons');
    }

    this.props = props;
    this.host = document.createElement('div');
    this.shadow = this.host.attachShadow({ mode: 'closed' });

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = getCombinedStyles(buttonStyles);
    this.shadow.appendChild(styleEl);

    // Create button element
    this.buttonElement = this.createButtonElement(content);
    this.shadow.appendChild(this.buttonElement);

    // Setup event handling
    this.setupEventHandling();
  }

  /**
   * Creates the button DOM element
   */
  private createButtonElement(content?: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = this.getButtonClasses();

    // Set disabled state
    if (this.props.disabled || this.props.loading) {
      button.disabled = true;
    }

    // Set ARIA attributes
    if (this.props.ariaLabel) {
      button.setAttribute('aria-label', this.props.ariaLabel);
    }

    if (this.props.loading) {
      button.setAttribute('aria-busy', 'true');
    }

    if (this.props.disabled) {
      button.setAttribute('aria-disabled', 'true');
    }

    // Build button content
    button.innerHTML = this.buildButtonContent(content);

    return button;
  }

  /**
   * Builds the class string for the button
   */
  private getButtonClasses(): string {
    const classes = ['wc-button'];

    // Variant
    classes.push(`wc-button--${this.props.variant}`);

    // Size
    classes.push(`wc-button--${this.props.size}`);

    // Modifiers
    if (this.props.iconOnly) {
      classes.push('wc-button--icon-only');
    }

    if (this.props.fullWidth) {
      classes.push('wc-button--full-width');
    }

    if (this.props.loading) {
      classes.push('wc-button--loading');
    }

    return classes.join(' ');
  }

  /**
   * Builds the button's inner HTML content
   */
  private buildButtonContent(content?: string): string {
    const parts: string[] = [];

    // Loading state: show spinner
    if (this.props.loading) {
      parts.push(this.getSpinnerHTML());
    }
    // Icon on left (not loading, has icon, not icon-only or position is left)
    else if (
      this.props.icon &&
      (!this.props.iconOnly || this.props.iconPosition === 'left')
    ) {
      if (!this.props.iconOnly || this.props.iconPosition === 'left') {
        parts.push(`<span class="wc-button__icon wc-button__icon--left">${this.props.icon}</span>`);
      }
    }

    // Text content (if not icon-only)
    if (!this.props.iconOnly && content) {
      parts.push(`<span class="wc-button__text">${this.escapeHTML(content)}</span>`);
    }

    // Icon for icon-only buttons (not loading)
    if (this.props.iconOnly && this.props.icon && !this.props.loading) {
      parts.push(`<span class="wc-button__icon">${this.props.icon}</span>`);
    }

    // Icon on right (not loading, not icon-only, position is right)
    if (
      this.props.icon &&
      !this.props.iconOnly &&
      this.props.iconPosition === 'right' &&
      !this.props.loading
    ) {
      parts.push(`<span class="wc-button__icon wc-button__icon--right">${this.props.icon}</span>`);
    }

    return parts.join('');
  }

  /**
   * Returns the HTML for the loading spinner
   */
  private getSpinnerHTML(): string {
    return `
      <span class="wc-button__spinner" role="status" aria-live="polite">
        <svg class="wc-button__spinner-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle class="wc-button__spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="wc-button__spinner-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="wc-sr-only">Loading...</span>
      </span>
    `;
  }

  /**
   * Escapes HTML to prevent XSS
   */
  private escapeHTML(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Sets up event handling for the button
   */
  private setupEventHandling(): void {
    this.buttonElement.addEventListener('click', (e) => {
      // Don't emit event if disabled or loading
      if (this.props.disabled || this.props.loading) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Emit custom event
      const customEvent = new CustomEvent('wc-click', {
        bubbles: true,
        composed: true,
        detail: { originalEvent: e },
      });
      this.host.dispatchEvent(customEvent);
    });
  }

  /**
   * Updates the button's props and re-renders
   *
   * @param newProps - Partial props to update
   * @param newContent - Optional new text content
   */
  public update(newProps: Partial<ButtonProps>, newContent?: string): void {
    this.props = { ...this.props, ...newProps };

    // Recreate button element
    const newButton = this.createButtonElement(newContent);
    this.shadow.replaceChild(newButton, this.buttonElement);
    this.buttonElement = newButton;

    // Re-setup event handling
    this.setupEventHandling();
  }

  /**
   * Sets the loading state
   *
   * @param loading - Whether button should be in loading state
   */
  public setLoading(loading: boolean): void {
    this.update({ loading });
  }

  /**
   * Sets the disabled state
   *
   * @param disabled - Whether button should be disabled
   */
  public setDisabled(disabled: boolean): void {
    this.update({ disabled });
  }

  /**
   * Returns the host element to be inserted into the DOM
   */
  public getElement(): HTMLElement {
    return this.host;
  }

  /**
   * Adds an event listener to the button
   *
   * @param event - Event name (use 'wc-click' for button clicks)
   * @param handler - Event handler function
   */
  public addEventListener(
    event: string,
    handler: EventListenerOrEventListenerObject
  ): void {
    this.host.addEventListener(event, handler);
  }

  /**
   * Removes an event listener from the button
   *
   * @param event - Event name
   * @param handler - Event handler function to remove
   */
  public removeEventListener(
    event: string,
    handler: EventListenerOrEventListenerObject
  ): void {
    this.host.removeEventListener(event, handler);
  }

  /**
   * Programmatically focuses the button
   */
  public focus(): void {
    this.buttonElement.focus();
  }

  /**
   * Programmatically blurs the button
   */
  public blur(): void {
    this.buttonElement.blur();
  }

  /**
   * Destroys the button and cleans up resources
   */
  public destroy(): void {
    this.host.remove();
  }
}

/**
 * Factory function to create a button element
 *
 * Convenience function for creating buttons without using the class directly.
 *
 * @param props - Button configuration
 * @param content - Text content for the button
 * @returns HTMLElement that can be inserted into the DOM
 *
 * @example
 * ```typescript
 * const button = createButton(
 *   { variant: 'primary', size: 'md' },
 *   'Click me'
 * );
 * document.body.appendChild(button);
 *
 * button.addEventListener('wc-click', () => {
 *   console.log('Button clicked!');
 * });
 * ```
 */
export function createButton(props: ButtonProps, content?: string): HTMLElement {
  const button = new Button(props, content);
  return button.getElement();
}
