/**
 * Content filtering types for enhanced article extraction.
 *
 * Based on research from Evernote Clearly's content detection algorithm.
 * See: docs/research/evernote-clearly-algorithm.md
 */

/**
 * Metrics collected for an element to inform filtering decisions.
 */
export interface ElementMetrics {
  /** Total character count of text outside links */
  plainTextLength: number;

  /** Word count of text outside links */
  plainWordCount: number;

  /** Total character count of text inside links */
  linkTextLength: number;

  /** Word count of text inside links */
  linkWordCount: number;

  /** Number of anchor elements */
  linkCount: number;

  /** Total text length (plain + links) */
  totalTextLength: number;

  /** Number of images by category */
  images: {
    large: number;
    medium: number;
    small: number;
    skip: number;
  };

  /** Whether element is floated left or right */
  isFloating: boolean;

  /** Computed link density ratio (0-1) */
  linkDensity: number;
}

/**
 * Image classification based on dimensions.
 */
export enum ImageSize {
  /** Tracking pixels (<=5x5) - should be removed */
  SKIP = 'skip',

  /** Small images (<20000px² or <150x150) - icons, thumbnails */
  SMALL = 'small',

  /** Medium images (>=20000px² or >=150x150) - secondary content */
  MEDIUM = 'medium',

  /** Large images (>=50000px² or >=350x75) - primary content */
  LARGE = 'large',
}

/**
 * Result of filtering operation.
 */
export interface FilterResult {
  /** Whether the element should be removed */
  shouldRemove: boolean;

  /** Reason for removal (for debugging) */
  reason?: string;

  /** Category of filter that triggered removal */
  filter?: 'link-density' | 'ad-domain' | 'floating' | 'empty' | 'image-size';
}

/**
 * Configuration for the content filter pipeline.
 */
export interface FilterConfig {
  /** Link density threshold (0-1). Elements above this are removed. Default: 0.5 */
  linkDensityThreshold: number;

  /** Minimum plain text length to apply link density filter. Default: 25 */
  linkDensityMinText: number;

  /** Minimum plain text length to keep element regardless of link density. Default: 200 */
  linkDensityKeepAbove: number;

  /** Minimum plain text for floating elements to keep. Default: 200 */
  floatingMinText: number;

  /** Enable ad domain filtering for images. Default: true */
  filterAdImages: boolean;

  /** Enable ad domain filtering for links. Default: true */
  filterAdLinks: boolean;

  /** Skip tracking pixel images (<=5x5). Default: true */
  skipTrackingPixels: boolean;

  /** Minimum content length for non-empty element. Default: 5 */
  emptyElementThreshold: number;

  /** Enable debug logging. Default: false */
  debug: boolean;
}

/**
 * Statistics from filter pipeline.
 */
export interface FilterStats {
  /** Elements removed due to high link density */
  linkDensityRemoved: number;

  /** Floating elements removed */
  floatingRemoved: number;

  /** Ad links neutralized */
  adLinksRemoved: number;

  /** Empty elements removed */
  emptyRemoved: number;

  /** Images skipped due to size or domain */
  imagesSkipped: number;

  /** Total elements processed */
  totalProcessed: number;
}
