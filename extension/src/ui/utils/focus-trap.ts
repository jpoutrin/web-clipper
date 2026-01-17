/**
 * Focus Trap Utilities
 *
 * Creates and manages focus trapping for modal dialogs and other
 * UI components that need to constrain keyboard navigation.
 */

/**
 * Focus trap instance interface
 */
export interface FocusTrap {
  /** Activate the focus trap */
  activate(): void;
  /** Deactivate the focus trap and restore previous focus */
  deactivate(): void;
}

/**
 * Selector for all focusable elements
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * Creates a focus trap for a container element
 *
 * The focus trap will:
 * - Keep focus within the container when Tab/Shift+Tab are pressed
 * - Remember the previously focused element
 * - Restore focus to that element when deactivated
 * - Automatically focus the first focusable element on activation
 *
 * @param container - HTML element to trap focus within
 * @returns FocusTrap instance with activate/deactivate methods
 *
 * @example
 * ```typescript
 * const dialog = document.querySelector('.dialog');
 * const trap = createFocusTrap(dialog);
 *
 * // When dialog opens
 * trap.activate();
 *
 * // When dialog closes
 * trap.deactivate();
 * ```
 */
export function createFocusTrap(container: HTMLElement): FocusTrap {
  let previouslyFocusedElement: HTMLElement | null = null;
  let isActive = false;

  /**
   * Get all focusable elements within the container
   */
  function getFocusableElements(): HTMLElement[] {
    const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    return Array.from(elements).filter((el) => {
      // Filter out invisible elements
      const style = window.getComputedStyle(el);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        el.offsetParent !== null
      );
    });
  }

  /**
   * Handle keydown events to trap Tab key
   */
  function handleKeyDown(event: KeyboardEvent): void {
    if (!isActive || event.key !== 'Tab') {
      return;
    }

    const focusableElements = getFocusableElements();

    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement as HTMLElement;

    // Shift + Tab (backwards)
    if (event.shiftKey) {
      if (activeElement === firstElement || !container.contains(activeElement)) {
        event.preventDefault();
        lastElement.focus();
      }
    }
    // Tab (forwards)
    else {
      if (activeElement === lastElement || !container.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * Activate the focus trap
   */
  function activate(): void {
    if (isActive) {
      return;
    }

    // Remember the currently focused element
    previouslyFocusedElement = document.activeElement as HTMLElement;

    // Focus the first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    isActive = true;
  }

  /**
   * Deactivate the focus trap and restore focus
   */
  function deactivate(): void {
    if (!isActive) {
      return;
    }

    // Remove event listener
    document.removeEventListener('keydown', handleKeyDown);
    isActive = false;

    // Restore focus to previously focused element
    if (previouslyFocusedElement && previouslyFocusedElement.focus) {
      previouslyFocusedElement.focus();
      previouslyFocusedElement = null;
    }
  }

  return {
    activate,
    deactivate,
  };
}
