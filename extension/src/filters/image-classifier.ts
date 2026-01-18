/**
 * Image Size Classifier
 *
 * Classifies images by size to filter tracking pixels and identify content images.
 * Based on Evernote Clearly's proven heuristics.
 */

import { ImageSize, FilterConfig } from './types';
import { isAdImage } from './ad-domains';

/**
 * Image size thresholds based on Evernote Clearly's heuristics.
 * These values have been proven effective across millions of pages.
 */
export const IMAGE_THRESHOLDS = {
  /** Maximum dimensions for tracking pixels */
  SKIP_MAX_DIM: 5,

  /** Minimum area for large images (e.g., 250x200) */
  LARGE_AREA: 50000,
  /** Alternative: wide images */
  LARGE_WIDTH: 350,
  /** With minimum height */
  LARGE_MIN_HEIGHT: 75,

  /** Minimum area for medium images (e.g., 150x133) */
  MEDIUM_AREA: 20000,
  /** Alternative: square-ish images */
  MEDIUM_MIN_DIM: 150,
};

/**
 * Get image dimensions from various sources.
 *
 * @param img - Image element
 * @returns Object with width and height
 */
export function getImageDimensions(img: HTMLImageElement): { width: number; height: number } {
  // Try rendered dimensions first
  let width = img.offsetWidth || img.width || 0;
  let height = img.offsetHeight || img.height || 0;

  // Fall back to natural dimensions
  if (width === 0) width = img.naturalWidth || 0;
  if (height === 0) height = img.naturalHeight || 0;

  // Fall back to attributes
  if (width === 0) width = parseInt(img.getAttribute('width') || '0', 10);
  if (height === 0) height = parseInt(img.getAttribute('height') || '0', 10);

  return { width, height };
}

/**
 * Classify an image by its dimensions.
 *
 * @param img - Image element to classify
 * @returns Image size category
 */
export function classifyImageSize(img: HTMLImageElement): ImageSize {
  const { width, height } = getImageDimensions(img);

  // Can't classify without dimensions - default to small (don't skip)
  if (width === 0 && height === 0) {
    return ImageSize.SMALL;
  }

  const area = width * height;

  // SKIP: Tracking pixels (1x1, 2x2, etc.)
  if (width <= IMAGE_THRESHOLDS.SKIP_MAX_DIM && height <= IMAGE_THRESHOLDS.SKIP_MAX_DIM) {
    return ImageSize.SKIP;
  }

  // LARGE: Primary content images
  if (area >= IMAGE_THRESHOLDS.LARGE_AREA) {
    return ImageSize.LARGE;
  }
  if (width >= IMAGE_THRESHOLDS.LARGE_WIDTH && height >= IMAGE_THRESHOLDS.LARGE_MIN_HEIGHT) {
    return ImageSize.LARGE;
  }

  // MEDIUM: Secondary content
  if (area >= IMAGE_THRESHOLDS.MEDIUM_AREA) {
    return ImageSize.MEDIUM;
  }
  if (width >= IMAGE_THRESHOLDS.MEDIUM_MIN_DIM && height >= IMAGE_THRESHOLDS.MEDIUM_MIN_DIM) {
    return ImageSize.MEDIUM;
  }

  // SMALL: Icons, thumbnails, avatars
  return ImageSize.SMALL;
}

/**
 * Result of image skip decision.
 */
export interface ImageSkipResult {
  skip: boolean;
  reason?: string;
  size?: ImageSize;
}

/**
 * Check if an image should be skipped based on size and domain.
 *
 * @param img - Image element
 * @param src - Resolved absolute URL
 * @param config - Filter configuration
 * @returns Skip decision with reason
 */
export function shouldSkipImage(img: HTMLImageElement, src: string, config: FilterConfig): ImageSkipResult {
  // 1. Check for ad network images
  if (config.filterAdImages && isAdImage(src)) {
    return {
      skip: true,
      reason: `ad network: ${new URL(src).hostname}`,
    };
  }

  // 2. Check for tracking pixels
  const size = classifyImageSize(img);
  if (config.skipTrackingPixels && size === ImageSize.SKIP) {
    return {
      skip: true,
      reason: 'tracking pixel (≤5x5)',
      size,
    };
  }

  return { skip: false, size };
}

/**
 * Filter tracking pixel images from a container.
 *
 * @param container - Element containing images
 * @param config - Filter configuration
 * @returns Number of images removed
 */
export function filterTrackingPixels(container: Element, config: FilterConfig): number {
  if (!config.skipTrackingPixels) return 0;

  let removed = 0;
  const images = container.querySelectorAll('img');

  images.forEach((img) => {
    const size = classifyImageSize(img as HTMLImageElement);
    if (size === ImageSize.SKIP) {
      if (config.debug) {
        const src = img.getAttribute('src') || '[no src]';
        console.log('[ImageFilter] Removing tracking pixel:', src);
      }
      img.remove();
      removed++;
    }
  });

  return removed;
}
