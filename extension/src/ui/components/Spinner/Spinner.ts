/**
 * Spinner Component
 *
 * A circular loading indicator with size variants and accessibility support.
 * Respects prefers-reduced-motion for accessibility.
 */

import { getCombinedStyles } from '../../utils/shadow-dom';
import { shouldAnimate } from '../../utils/theme';
import spinnerCSS from './Spinner.css';

export interface SpinnerProps {
  size: 'sm' | 'md' | 'lg';
  color?: string;  // CSS color, defaults to currentColor (inherits)
  label?: string;  // Accessible label for screen readers
}

export class Spinner {
  private element: HTMLElement;
  private shadowRoot: ShadowRoot;
  private spinnerElement: HTMLElement;
  private props: SpinnerProps;

  constructor(props: SpinnerProps) {
    this.props = props;
    this.element = document.createElement('div');
    this.shadowRoot = this.element.attachShadow({ mode: 'closed' });

    this.render();
    this.spinnerElement = this.shadowRoot.querySelector('.wc-spinner')!;
  }

  private render(): void {
    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = getCombinedStyles(spinnerCSS);
    this.shadowRoot.appendChild(styleEl);

    // Create spinner element
    const spinner = document.createElement('div');
    spinner.className = this.getClassNames();

    // Apply custom color if provided
    if (this.props.color) {
      spinner.style.color = this.props.color;
    }

    // Accessibility attributes
    if (this.props.label) {
      spinner.setAttribute('role', 'status');
      spinner.setAttribute('aria-label', this.props.label);
    } else {
      // Decorative spinner, hidden from screen readers
      spinner.setAttribute('aria-hidden', 'true');
    }

    this.shadowRoot.appendChild(spinner);
  }

  private getClassNames(): string {
    const classes = ['wc-spinner'];
    classes.push(`wc-spinner--${this.props.size}`);
    return classes.join(' ');
  }

  /**
   * Updates the spinner size
   */
  setSize(size: SpinnerProps['size']): void {
    this.props.size = size;
    this.spinnerElement.className = this.getClassNames();
  }

  /**
   * Updates the spinner color
   */
  setColor(color: string): void {
    this.props.color = color;
    this.spinnerElement.style.color = color;
  }

  /**
   * Returns the host element for appending to DOM
   */
  getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Cleans up the component
   */
  destroy(): void {
    this.element.remove();
  }
}

/**
 * Factory function to create a Spinner component
 *
 * @param props - Spinner configuration
 * @returns HTMLElement ready to be appended to the DOM
 *
 * @example
 * ```typescript
 * const spinner = createSpinner({
 *   size: 'md',
 *   label: 'Loading content...'
 * });
 * document.body.appendChild(spinner);
 * ```
 */
export function createSpinner(props: SpinnerProps): HTMLElement {
  const spinner = new Spinner(props);
  return spinner.getElement();
}
