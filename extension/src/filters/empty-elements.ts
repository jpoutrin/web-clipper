/**
 * Empty Element Cleanup
 *
 * Removes elements that have no meaningful content after other filters have run.
 * This cleans up wrapper divs, empty sections, and excessive whitespace.
 */

import { FilterConfig } from './types';

/**
 * Elements that can be removed if empty.
 * Structural elements (tr, td, th) are preserved for table layout.
 */
const REMOVABLE_ELEMENTS = new Set([
  'div',
  'section',
  'article',
  'aside',
  'nav',
  'span',
  'p',
  'ul',
  'ol',
  'li',
  'blockquote',
  'figure',
  'figcaption',
  'header',
  'footer',
]);

/**
 * Elements that make a container "not empty" even without text.
 */
const CONTENT_ELEMENTS = new Set([
  'img',
  'video',
  'audio',
  'iframe',
  'embed',
  'object',
  'canvas',
  'svg',
  'picture',
  'source',
  'hr',
]);

/**
 * Get depth of element in DOM tree.
 */
function getDepth(element: Element): number {
  let depth = 0;
  let current: Element | null = element;
  while (current.parentElement) {
    depth++;
    current = current.parentElement;
  }
  return depth;
}

/**
 * Check if an element is effectively empty.
 *
 * @param element - Element to check
 * @param config - Filter configuration
 * @returns true if element should be removed
 */
export function isEffectivelyEmpty(element: Element, config: FilterConfig): boolean {
  // Check for content elements (images, video, etc.)
  for (const tag of CONTENT_ELEMENTS) {
    if (element.querySelector(tag)) {
      return false;
    }
  }

  // Check text content
  const text = (element.textContent || '').replace(/[\s\n\r\t]+/g, ' ').trim();

  return text.length < config.emptyElementThreshold;
}

/**
 * Check if an element can be removed when empty.
 *
 * @param element - Element to check
 * @returns true if element type is removable
 */
export function isRemovableElement(element: Element): boolean {
  return REMOVABLE_ELEMENTS.has(element.tagName.toLowerCase());
}

/**
 * Remove empty elements from the content.
 * Processes bottom-up to handle nested empty containers.
 *
 * @param container - Container element to clean
 * @param config - Filter configuration
 * @returns Number of elements removed
 */
export function removeEmptyElements(container: Element, config: FilterConfig): number {
  let removedCount = 0;
  let changed = true;

  // Repeat until no more changes (handles nested empties)
  while (changed) {
    changed = false;

    // Get all potentially removable elements
    const selector = Array.from(REMOVABLE_ELEMENTS).join(', ');
    const elements = Array.from(container.querySelectorAll(selector));

    // Process deepest first (reverse order after sorting by depth)
    elements.sort((a, b) => getDepth(b) - getDepth(a));

    for (const element of elements) {
      // Skip if already removed
      if (!element.parentElement) continue;
      if (!container.contains(element)) continue;

      // Don't remove the container itself
      if (element === container) continue;

      if (isEffectivelyEmpty(element, config)) {
        if (config.debug) {
          console.log('[EmptyFilter] Removed empty element:', element.tagName.toLowerCase());
        }
        element.remove();
        removedCount++;
        changed = true;
      }
    }
  }

  return removedCount;
}

/**
 * Clean up excessive whitespace in HTML.
 * - Collapse multiple <br> tags
 * - Remove <br> at block boundaries
 *
 * @param container - Container element to clean
 */
export function cleanupWhitespace(container: Element): void {
  let html = container.innerHTML;

  // Collapse multiple consecutive <br> (3+ becomes 2)
  html = html.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');

  // Collapse multiple <hr>
  html = html.replace(/(<hr\s*\/?>\s*){2,}/gi, '<hr>');

  // Remove <br> at start of block elements
  html = html.replace(/<(div|p|li|td|blockquote|section|article)([^>]*)>(\s*<br\s*\/?>)+/gi, '<$1$2>');

  // Remove <br> at end of block elements
  html = html.replace(/(<br\s*\/?>\s*)+<\/(div|p|li|td|blockquote|section|article)>/gi, '</$2>');

  // Remove <br> immediately before block elements
  html = html.replace(/(<br\s*\/?>\s*)+<(div|p|h[1-6]|ul|ol|table|blockquote)/gi, '<$2');

  // Remove <br> immediately after block elements
  html = html.replace(/<\/(div|p|h[1-6]|ul|ol|table|blockquote)>(\s*<br\s*\/?>)+/gi, '</$1>');

  container.innerHTML = html;
}
