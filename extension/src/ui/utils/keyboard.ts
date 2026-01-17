/**
 * Keyboard Navigation Utilities
 *
 * Utilities for handling keyboard navigation patterns like arrow key
 * navigation in lists and Tab key trapping in modal contexts.
 */

/**
 * Handles arrow key navigation within a list of focusable items
 *
 * Supports:
 * - ArrowDown/ArrowRight: Move to next item (wraps to first)
 * - ArrowUp/ArrowLeft: Move to previous item (wraps to last)
 * - Home: Jump to first item
 * - End: Jump to last item
 *
 * @param event - Keyboard event to handle
 * @param items - Array of focusable HTML elements
 * @param currentIndex - Current focused item index
 * @returns New index after navigation (or same if no navigation occurred)
 *
 * @example
 * ```typescript
 * const menuItems = Array.from(menu.querySelectorAll('[role="menuitem"]'));
 * let currentIndex = 0;
 *
 * menu.addEventListener('keydown', (e) => {
 *   const newIndex = handleArrowNavigation(e, menuItems, currentIndex);
 *   if (newIndex !== currentIndex) {
 *     currentIndex = newIndex;
 *     menuItems[currentIndex].focus();
 *   }
 * });
 * ```
 */
export function handleArrowNavigation(
  event: KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number
): number {
  if (items.length === 0) {
    return currentIndex;
  }

  const maxIndex = items.length - 1;
  let newIndex = currentIndex;

  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      event.preventDefault();
      newIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
      break;

    case 'ArrowUp':
    case 'ArrowLeft':
      event.preventDefault();
      newIndex = currentIndex <= 0 ? maxIndex : currentIndex - 1;
      break;

    case 'Home':
      event.preventDefault();
      newIndex = 0;
      break;

    case 'End':
      event.preventDefault();
      newIndex = maxIndex;
      break;

    default:
      // No navigation occurred
      return currentIndex;
  }

  return newIndex;
}

/**
 * Traps Tab key within a container
 *
 * Prevents Tab/Shift+Tab from moving focus outside the container.
 * This is a simpler alternative to createFocusTrap for inline usage.
 *
 * @param event - Keyboard event to handle
 * @param container - Container element to trap focus within
 *
 * @example
 * ```typescript
 * dialog.addEventListener('keydown', (e) => {
 *   trapTabKey(e, dialog);
 * });
 * ```
 */
export function trapTabKey(event: KeyboardEvent, container: HTMLElement): void {
  if (event.key !== 'Tab') {
    return;
  }

  const focusableElements = getFocusableElements(container);

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
 * Gets all focusable elements within a container
 *
 * @param container - Container to search within
 * @returns Array of focusable HTML elements
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
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
