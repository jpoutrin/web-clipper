/**
 * Floating Element Filter
 *
 * Removes floated elements that are likely sidebars, ad containers, or social widgets.
 * Floating elements with little content are typically not main article content.
 */

import { FilterConfig, FilterResult } from './types';
import { collectMetrics } from './metrics';

/**
 * Elements that commonly float for layout purposes.
 */
const FLOATABLE_ELEMENTS = new Set(['div', 'aside', 'figure', 'table', 'section']);

/**
 * Check if an element is floated via CSS.
 *
 * @param element - Element to check
 * @returns true if element is floated left or right
 */
export function isFloated(element: Element): boolean {
  try {
    const style = window.getComputedStyle(element as HTMLElement);
    const float = style.getPropertyValue('float');
    return float === 'left' || float === 'right';
  } catch {
    // getComputedStyle may fail for detached elements
    return false;
  }
}

/**
 * Check if element is a floatable type.
 *
 * @param element - Element to check
 * @returns true if element type can be considered for floating filter
 */
export function isFloatableElement(element: Element): boolean {
  return FLOATABLE_ELEMENTS.has(element.tagName.toLowerCase());
}

/**
 * Filter floating elements that are likely not content.
 *
 * Floating elements are removed if:
 * - They have little plain text (<200 chars by default)
 * - They don't contain large/medium images
 * - They don't contain headings with substantial text
 *
 * @param element - Element to evaluate
 * @param config - Filter configuration
 * @returns Filter decision
 */
export function filterFloatingElement(element: Element, config: FilterConfig): FilterResult {
  const tagName = element.tagName.toLowerCase();

  // Only check floatable elements
  if (!FLOATABLE_ELEMENTS.has(tagName)) {
    return { shouldRemove: false };
  }

  // Only check if actually floating
  if (!isFloated(element)) {
    return { shouldRemove: false };
  }

  const metrics = collectMetrics(element);

  // Keep if substantial content
  if (metrics.plainTextLength > config.floatingMinText) {
    return { shouldRemove: false };
  }

  // Keep if has large images (probably a content figure)
  if (metrics.images.large > 0) {
    return { shouldRemove: false };
  }

  // Keep if has medium images with minimal link text (probably a photo)
  if (metrics.images.medium > 0 && metrics.linkTextLength < 25) {
    return { shouldRemove: false };
  }

  // Keep if has headings with some text (might be important sidebar section)
  const hasHeadings = element.querySelector('h1, h2, h3, h4, h5, h6');
  if (hasHeadings && metrics.plainTextLength > 50) {
    return { shouldRemove: false };
  }

  // Remove floating element with little content
  return {
    shouldRemove: true,
    reason: `Floating ${tagName} with ${metrics.plainTextLength} chars (threshold: ${config.floatingMinText})`,
    filter: 'floating',
  };
}

/**
 * Apply floating element filter to all elements in a container.
 *
 * @param container - Container to filter
 * @param config - Filter configuration
 * @returns Number of elements removed
 */
export function applyFloatingFilter(container: Element, config: FilterConfig): number {
  let removed = 0;
  const selector = Array.from(FLOATABLE_ELEMENTS).join(', ');
  const elements = Array.from(container.querySelectorAll(selector));

  for (const element of elements) {
    // Skip if already removed
    if (!element.parentElement) continue;
    if (!container.contains(element)) continue;

    const result = filterFloatingElement(element, config);
    if (result.shouldRemove) {
      if (config.debug) {
        console.log('[FloatingFilter] Removed:', result.reason);
      }
      element.remove();
      removed++;
    }
  }

  return removed;
}
