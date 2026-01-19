/**
 * Content Filter Pipeline
 *
 * Orchestrates multiple content filters to clean up extracted article content.
 * Based on research from Evernote Clearly's content detection algorithm.
 *
 * Usage:
 * ```typescript
 * import { applyContentFilters } from './filters';
 *
 * // After Readability extraction:
 * const tempDiv = document.createElement('div');
 * tempDiv.innerHTML = article.content;
 *
 * const stats = applyContentFilters(tempDiv, { debug: true });
 * console.log('Filter stats:', stats);
 * ```
 */

import { FilterConfig, FilterStats } from './types';
import { applyLinkDensityFilter } from './link-density';
import { applyFloatingFilter } from './floating-elements';
import { neutralizeAdLinks, filterAdImages } from './ad-domains';
import { filterTrackingPixels } from './image-classifier';
import { removeEmptyElements, cleanupWhitespace } from './empty-elements';

/**
 * Default filter configuration.
 *
 * These values are tuned based on Evernote Clearly's proven heuristics
 * and testing on various news and blog sites.
 */
export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  // Link density: 50% threshold is the sweet spot
  // Navigation is typically 80-95% links, content is 5-20%
  linkDensityThreshold: 0.5,

  // Minimum text to even consider filtering (skip tiny elements)
  linkDensityMinText: 25,

  // Keep elements with substantial content regardless of link density
  linkDensityKeepAbove: 200,

  // Floating elements with less than this text are likely sidebars
  floatingMinText: 200,

  // Enable ad domain filtering
  filterAdImages: true,
  filterAdLinks: true,

  // Skip tiny images (tracking pixels)
  skipTrackingPixels: true,

  // Elements with less than 5 chars are effectively empty
  emptyElementThreshold: 5,

  // Disable debug by default
  debug: false,
};

/**
 * Apply all content filters to an element.
 *
 * This is the main entry point for the filter pipeline.
 * Call this after Readability extraction but before Turndown conversion.
 *
 * Filter order:
 * 1. Link density (removes navigation, related articles)
 * 2. Floating elements (removes sidebars)
 * 3. Ad domain links (neutralizes affiliate/tracker links)
 * 4. Ad domain images (removes ad network images)
 * 5. Tracking pixels (removes tiny tracking images)
 * 6. Empty elements (cleanup)
 * 7. Whitespace cleanup (final polish)
 */
export function applyContentFilters(container: Element, config: Partial<FilterConfig> = {}): FilterStats {
  const cfg: FilterConfig = { ...DEFAULT_FILTER_CONFIG, ...config };

  const stats: FilterStats = {
    linkDensityRemoved: 0,
    floatingRemoved: 0,
    adLinksRemoved: 0,
    emptyRemoved: 0,
    imagesSkipped: 0,
    totalProcessed: 0,
  };

  if (cfg.debug) {
    console.log('[ContentFilter] Starting filter pipeline...');
    console.log('[ContentFilter] Config:', cfg);
  }

  // 1. Link density filter (removes navigation-heavy sections)
  stats.linkDensityRemoved = applyLinkDensityFilter(container, cfg);

  // 2. Floating element filter (removes sidebars)
  stats.floatingRemoved = applyFloatingFilter(container, cfg);

  // 3. Ad link filter (neutralizes affiliate/tracking links)
  stats.adLinksRemoved = neutralizeAdLinks(container, cfg);

  // 4. Ad image filter (removes images from ad networks)
  stats.imagesSkipped += filterAdImages(container, cfg);

  // 5. Tracking pixel filter (removes tiny tracking images)
  stats.imagesSkipped += filterTrackingPixels(container, cfg);

  // 6. Empty element cleanup (removes now-empty containers)
  stats.emptyRemoved = removeEmptyElements(container, cfg);

  // 7. Whitespace cleanup (final polish)
  cleanupWhitespace(container);

  stats.totalProcessed = container.querySelectorAll('*').length;

  if (cfg.debug) {
    console.log('[ContentFilter] Pipeline complete:', stats);
  }

  return stats;
}

/**
 * Create a filter configuration with custom overrides.
 */
export function createFilterConfig(overrides: Partial<FilterConfig> = {}): FilterConfig {
  return { ...DEFAULT_FILTER_CONFIG, ...overrides };
}

// Re-export types and utilities for external use
export type { FilterConfig, FilterStats, FilterResult, ElementMetrics } from './types';
export { ImageSize } from './types';
export { collectMetrics, measureTextLength, countWords } from './metrics';
export { filterLinkDensity, applyLinkDensityFilter } from './link-density';
export { filterFloatingElement, applyFloatingFilter, isFloated, isFloatableElement } from './floating-elements';
export { removeEmptyElements, cleanupWhitespace, isEffectivelyEmpty, isRemovableElement } from './empty-elements';
export {
  classifyImageSize,
  filterTrackingPixels,
  shouldSkipImage,
  getImageDimensions,
  IMAGE_THRESHOLDS,
} from './image-classifier';
export type { ImageSkipResult } from './image-classifier';
export {
  isAdImage,
  isAdLink,
  filterAdImages,
  neutralizeAdLinks,
  AD_IMAGE_DOMAINS,
  AD_LINK_DOMAINS,
} from './ad-domains';
