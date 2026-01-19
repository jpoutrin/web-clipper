/**
 * Link Density Filter
 *
 * Filters elements with high link-to-text ratios, which are typically:
 * - Navigation menus
 * - Footer link lists
 * - Related articles sections
 * - Sidebar widgets
 *
 * This is the most effective single filter for removing non-content elements.
 * Based on Evernote Clearly's proven content detection algorithm.
 */

import { FilterConfig, FilterResult } from './types';
import { collectMetrics, formatMetrics } from './metrics';

/**
 * Elements that should be checked for link density.
 * These are typically navigation containers.
 */
const LINK_DENSITY_ELEMENTS = new Set([
  'div',
  'section',
  'aside',
  'nav',
  'header',
  'footer',
  'ul',
  'ol',
  'table',
  'tbody',
]);

/**
 * Elements that should never be removed by link density filter.
 * These are structural or content elements.
 */
const PROTECTED_ELEMENTS = new Set(['article', 'main', 'body', 'html', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/**
 * Filter elements with high link density (likely navigation).
 *
 * This is the most effective filter for removing navigation menus,
 * footers with links, and other non-content sections.
 *
 * The algorithm:
 * 1. Calculate link density = link_text_length / total_text_length
 * 2. If density > threshold (default 50%), mark for removal
 * 3. Exception: Keep if has substantial plain text (>200 chars)
 * 4. Exception: Keep if has large/medium images (likely content)
 * 5. Exception: Keep if few links but high word-to-link ratio
 */
export function filterLinkDensity(element: Element, config: FilterConfig): FilterResult {
  const tagName = element.tagName.toLowerCase();

  // Never remove protected elements
  if (PROTECTED_ELEMENTS.has(tagName)) {
    return { shouldRemove: false };
  }

  // Only check relevant container elements
  if (!LINK_DENSITY_ELEMENTS.has(tagName)) {
    return { shouldRemove: false };
  }

  const metrics = collectMetrics(element);

  if (config.debug) {
    console.log(`[LinkDensity] Checking <${tagName}>:`, formatMetrics(metrics));
  }

  // Exception 1: Keep elements with substantial plain text content
  // These are likely legitimate content even with some links
  if (metrics.plainTextLength > config.linkDensityKeepAbove) {
    if (config.debug) {
      console.log(`[LinkDensity] Keeping: substantial plain text (${metrics.plainTextLength} chars)`);
    }
    return { shouldRemove: false };
  }

  // Exception 2: Keep elements with large/medium images (likely content)
  if (metrics.images.large > 0 || metrics.images.medium > 0) {
    if (config.debug) {
      console.log(
        `[LinkDensity] Keeping: has content images (L:${metrics.images.large}, M:${metrics.images.medium})`
      );
    }
    return { shouldRemove: false };
  }

  // Skip elements with very little content (handled by empty filter)
  if (metrics.totalTextLength < config.linkDensityMinText) {
    return { shouldRemove: false };
  }

  // Check link density threshold
  if (metrics.linkDensity > config.linkDensityThreshold) {
    const reason = `Link density ${(metrics.linkDensity * 100).toFixed(1)}% exceeds threshold ${(config.linkDensityThreshold * 100).toFixed(0)}%`;
    if (config.debug) {
      console.log(`[LinkDensity] REMOVING: ${reason}`);
    }
    return {
      shouldRemove: true,
      reason,
      filter: 'link-density',
    };
  }

  // Also check link count vs word count
  // Many links relative to words = likely navigation
  // Formula: if links * 2 >= plain word count, it's probably navigation
  if (metrics.linkCount > 1 && metrics.linkCount * 2 >= metrics.plainWordCount) {
    // But only if link density is also somewhat elevated (>30%)
    if (metrics.linkDensity > 0.3) {
      const reason = `High link-to-word ratio: ${metrics.linkCount} links for ${metrics.plainWordCount} words (density: ${(metrics.linkDensity * 100).toFixed(1)}%)`;
      if (config.debug) {
        console.log(`[LinkDensity] REMOVING: ${reason}`);
      }
      return {
        shouldRemove: true,
        reason,
        filter: 'link-density',
      };
    }
  }

  return { shouldRemove: false };
}

/**
 * Apply link density filter to all relevant elements in a container.
 *
 * Elements are processed from deepest to shallowest to handle
 * nested navigation structures properly.
 */
export function applyLinkDensityFilter(container: Element, config: FilterConfig): number {
  let removedCount = 0;

  // Get all potential elements
  const selector = Array.from(LINK_DENSITY_ELEMENTS).join(', ');
  const elements = Array.from(container.querySelectorAll(selector));

  // Sort by depth (deepest first) to handle nested structures
  elements.sort((a, b) => {
    const depthA = getElementDepth(a);
    const depthB = getElementDepth(b);
    return depthB - depthA;
  });

  // Process each element
  for (const element of elements) {
    // Skip if already removed (parent was removed)
    if (!element.parentElement) continue;

    // Skip if element is no longer in the container
    if (!container.contains(element)) continue;

    const result = filterLinkDensity(element, config);

    if (result.shouldRemove) {
      if (config.debug) {
        console.log(`[LinkDensity] Removing element:`, element.tagName, result.reason);
      }
      element.remove();
      removedCount++;
    }
  }

  return removedCount;
}

/**
 * Get the depth of an element in the DOM tree.
 */
function getElementDepth(element: Element): number {
  let depth = 0;
  let current: Element | null = element;
  while (current.parentElement) {
    depth++;
    current = current.parentElement;
  }
  return depth;
}
