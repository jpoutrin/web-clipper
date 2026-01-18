# TS-0011: Enhanced Content Filtering

## Metadata

| Field | Value |
|-------|-------|
| Tech Spec ID | TS-0011 |
| Title | Enhanced Content Filtering |
| Status | IN PROGRESS |
| Author | |
| Created | 2026-01-18 |
| Last Updated | 2026-01-18 |
| Related RFC | - |
| Phase | 3 - Content Quality |
| Reviews | CTO Architecture |
| Depends On | TS-0001, TS-0003 |
| Location | tech-specs/draft/TS-0011-enhanced-content-filtering.md |
| Research | docs/research/evernote-clearly-algorithm.md |
| Task List | tasks/TS-0011-enhanced-content-filtering-tasks.md |

## Implementation Tracking

| Feature | Priority | Status | Files |
|---------|----------|--------|-------|
| Link Density Analysis | P0 | ✅ IMPLEMENTED | `filters/link-density.ts`, `filters/metrics.ts` |
| Image Ad Domain Filtering | P0 | ✅ IMPLEMENTED | `filters/ad-domains.ts` |
| Image Size Classification | P1 | ✅ IMPLEMENTED | `filters/image-classifier.ts` |
| Empty Element Cleanup | P1 | ✅ IMPLEMENTED | `filters/empty-elements.ts` |
| Link Ad Domain Filtering | P2 | ✅ IMPLEMENTED | `filters/ad-domains.ts` |
| Floating Element Detection | P2 | ✅ IMPLEMENTED | `filters/floating-elements.ts` |

---

## Executive Summary

This specification defines enhancements to the Web Clipper's content filtering system based on research into Evernote Clearly's proven content detection algorithm. The goal is to improve the quality and relevance of clipped content by implementing:

1. **Link Density Analysis** - Filter navigation-heavy sections ✅ IMPLEMENTED
2. **Image Ad Domain Filtering** - Block images from known ad networks
3. **Image Size Classification** - Filter tracking pixels, prioritize content images
4. **Empty Element Cleanup** - Remove elements with no meaningful content
5. **Link Ad Domain Filtering** - Enhanced ad link removal
6. **Floating Element Detection** - Filter sidebar/ad containers

These enhancements complement the existing Readability-based extraction with battle-tested heuristics from Evernote Clearly.

---

## Gap Analysis: Current vs. Evernote Clearly

### Implementation Status Matrix

| Feature | Priority | Current Status | Evernote Clearly | Implementation |
|---------|----------|----------------|------------------|----------------|
| Link Density Analysis | P0 | ✅ Implemented | Core metric | `filters/link-density.ts` |
| Image Ad Domain Filtering | P0 | ❌ Not implemented | Domain blocklist | Section 4.1 |
| Image Size Classification | P1 | ❌ Not implemented | Skip/Small/Medium/Large | Section 4.2 |
| Empty Element Cleanup | P1 | ❌ Not implemented | Aggressive removal | Section 4.3 |
| Link Ad Domain Filtering | P2 | Partial (CSS only) | Domain blocklist | Section 4.4 |
| Floating Element Detection | P2 | ❌ Not implemented | CSS float detection | Section 4.5 |

---

## Scope

| Component | Included | Status | Notes |
|-----------|----------|--------|-------|
| Link Density Analyzer | Yes | ✅ Done | Filter high-link-density sections |
| Ad Domain Blocklist | Yes | 📋 Spec | Configurable domain lists for links/images |
| Image Size Classifier | Yes | 📋 Spec | Skip/Small/Medium/Large categories |
| Empty Element Cleaner | Yes | 📋 Spec | Remove elements with no meaningful content |
| Floating Element Filter | Yes | 📋 Spec | Detect and filter floated sidebars |
| Content Metrics Collector | Yes | ✅ Done | Shared metrics for all filters |
| Configuration Interface | Yes | ✅ Done | Allow tuning thresholds |
| CJK Language Detection | No | - | Phase 4 |
| RTL Support | No | - | Phase 4 |

---

## 1. Architecture Overview

### 1.1 System Flow

```
                              ┌─────────────────────────────────┐
                              │     Mozilla Readability         │
                              │   (Primary Content Detection)   │
                              └─────────────┬───────────────────┘
                                            │
                                            ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                     Enhanced Content Filter Pipeline                       │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. Metrics Collection ✅                                                  │
│     └─► Count text, links, images per element                            │
│                                                                           │
│  2. Pre-Extraction Filters (on Readability output)                       │
│     ├─► Link Density Filter ✅ (remove navigation-heavy sections)        │
│     ├─► Floating Element Filter (remove floated sidebars)                │
│     └─► Ad Domain Filter (remove links from ad networks)                 │
│                                                                           │
│  3. Image Filtering                                                       │
│     ├─► Domain Filter (skip images from ad networks)                     │
│     ├─► Size Classification (skip tracking pixels)                       │
│     └─► Lazy-load Resolution (existing)                                  │
│                                                                           │
│  4. Post-Extraction Cleanup                                              │
│     ├─► Empty Element Removal                                            │
│     ├─► Excessive Whitespace Cleanup                                     │
│     └─► Related Articles Removal (existing)                              │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
                              ┌─────────────────────────────────┐
                              │      Turndown Markdown          │
                              │         Conversion              │
                              └─────────────────────────────────┘
```

### 1.2 Module Structure

```
extension/src/filters/
├── index.ts              ✅ Filter pipeline orchestrator
├── types.ts              ✅ Shared types (FilterConfig, ElementMetrics, etc.)
├── metrics.ts            ✅ Content metrics collection
├── link-density.ts       ✅ Link density filter (IMPLEMENTED)
├── ad-domains.ts         📋 Ad domain blocklists (TO IMPLEMENT)
├── image-classifier.ts   📋 Image size classification (TO IMPLEMENT)
├── empty-elements.ts     📋 Empty element cleanup (TO IMPLEMENT)
└── floating-elements.ts  📋 Floating element detection (TO IMPLEMENT)
```

---

## 2. Type Definitions (✅ IMPLEMENTED)

**File: `extension/src/filters/types.ts`**

```typescript
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
```

---

## 3. Link Density Filter (✅ IMPLEMENTED)

**File: `extension/src/filters/link-density.ts`**

This filter is already implemented and integrated into `content.ts`.

### Algorithm

1. Calculate `linkDensity = linkTextLength / totalTextLength`
2. If `linkDensity > 0.5` (50%), mark for removal
3. Exceptions that prevent removal:
   - `plainTextLength > 200` (substantial content)
   - Has large or medium images
   - Element is protected type (`article`, `main`, `p`, headings)

### Integration Point

```typescript
// In content.ts, after Readability extraction:
const filterStats = applyContentFilters(tempDiv, { debug: false });
console.log('[WebClipper] Content filter stats:', filterStats);
```

---

## 4. Remaining Feature Specifications

### 4.1 Image Ad Domain Filtering (P0)

**File: `extension/src/filters/ad-domains.ts`**

#### Purpose
Block images from known advertising and tracking networks. This prevents:
- Tracking pixels (1x1 images from analytics services)
- Ad banner images
- Third-party ad network assets

#### Implementation

```typescript
/**
 * Known advertising and tracking image domains.
 * Images from these domains should be filtered from clips.
 *
 * Based on Evernote Clearly's blocklist with modern additions.
 */
export const AD_IMAGE_DOMAINS: string[] = [
  // Google Ad Network
  'googlesyndication.com',
  'googleadservices.com',
  'pagead2.googlesyndication.com',
  'tpc.googlesyndication.com',

  // DoubleClick (Google)
  'doubleclick.net',
  'doubleclick.com',
  '2mdn.net',

  // Major Ad Networks
  'fastclick.net',
  'serving-sys.com',
  'adnxs.com',
  'advertising.com',
  'atdmt.com',
  'criteo.com',
  'criteo.net',
  'taboola.com',
  'outbrain.com',
  'mgid.com',
  'revcontent.com',

  // Tracking Pixels
  'pixel.quantserve.com',
  'pixel.facebook.com',
  'pixel.tapad.com',
  'bat.bing.com',
  'analytics.twitter.com',
  'px.ads.linkedin.com',
  'pixel.wp.com',
  'www.facebook.com/tr',

  // Analytics (image beacons)
  'www.google-analytics.com',
  'stats.g.doubleclick.net',
  'sb.scorecardresearch.com',
  'b.scorecardresearch.com',

  // Ad Exchanges
  'buysellads.com',
  'bannersxchange.com',
  'adbrite.com',
  'adbureau.net',
  'admob.com',

  // Regional (Japan)
  'impact-ad.jp',
  'itmedia.jp',
  'microad.jp',
  'adplan-ds.com',

  // Misc tracking
  'de17a.com',
  'content.aimatch.com',
  'zergnet.com',
];

/**
 * Check if an image URL is from an ad/tracking domain.
 *
 * @param src - Image source URL (absolute)
 * @returns true if image should be blocked
 */
export function isAdImage(src: string): boolean {
  try {
    const url = new URL(src);
    const hostname = url.hostname.toLowerCase();

    return AD_IMAGE_DOMAINS.some(domain =>
      hostname === domain ||
      hostname.endsWith('.' + domain)
    );
  } catch {
    // Invalid URL - don't block
    return false;
  }
}

/**
 * Filter images from ad domains in a container.
 *
 * @param container - Element containing images to filter
 * @param config - Filter configuration
 * @returns Number of images removed
 */
export function filterAdImages(container: Element, config: FilterConfig): number {
  if (!config.filterAdImages) return 0;

  let removed = 0;
  const images = container.querySelectorAll('img[src]');

  images.forEach((img) => {
    const src = img.getAttribute('src');
    if (src && isAdImage(src)) {
      if (config.debug) {
        console.log('[Filter] Removing ad image:', src);
      }
      img.remove();
      removed++;
    }
  });

  return removed;
}
```

#### Integration in Image Extraction

```typescript
// In content.ts, during image extraction:
imgElements.forEach((img) => {
  let src = resolveImageSrc(img);

  if (src && !src.startsWith('data:')) {
    // Check if image is from ad domain
    if (isAdImage(src)) {
      console.log(`[WebClipper] Skipping ad image: ${src}`);
      return; // Skip this image
    }

    // ... rest of image processing
  }
});
```

---

### 4.2 Image Size Classification (P1)

**File: `extension/src/filters/image-classifier.ts`**

#### Purpose
Classify images by size to:
- **Skip** tracking pixels (≤5x5)
- **Identify** content images (large/medium) for preservation
- **Allow** but not prioritize small images (icons, thumbnails)

#### Implementation

```typescript
import { ImageSize } from './types';

/**
 * Image size thresholds based on Evernote Clearly's heuristics.
 * These values have been proven effective across millions of pages.
 */
const THRESHOLDS = {
  // Tracking pixels - tiny images used for analytics
  SKIP_MAX_DIM: 5,        // 5x5 or smaller

  // Large images - primary article content
  LARGE_AREA: 50000,      // 50,000 px² (e.g., 250x200)
  LARGE_WIDTH: 350,       // Wide images
  LARGE_MIN_HEIGHT: 75,   // With minimum height

  // Medium images - secondary content
  MEDIUM_AREA: 20000,     // 20,000 px² (e.g., 150x133)
  MEDIUM_MIN_DIM: 150,    // Square-ish images
};

/**
 * Classify an image by its dimensions.
 *
 * @param img - Image element to classify
 * @returns Image size category
 */
export function classifyImageSize(img: HTMLImageElement): ImageSize {
  // Get dimensions from multiple sources
  const width = img.offsetWidth || img.naturalWidth ||
                parseInt(img.getAttribute('width') || '0', 10);
  const height = img.offsetHeight || img.naturalHeight ||
                 parseInt(img.getAttribute('height') || '0', 10);

  // Can't classify without dimensions
  if (width === 0 && height === 0) {
    return ImageSize.SMALL; // Default to small, don't skip
  }

  const area = width * height;

  // SKIP: Tracking pixels (1x1, 2x2, etc.)
  if (width <= THRESHOLDS.SKIP_MAX_DIM && height <= THRESHOLDS.SKIP_MAX_DIM) {
    return ImageSize.SKIP;
  }

  // LARGE: Primary content images
  if (area >= THRESHOLDS.LARGE_AREA) {
    return ImageSize.LARGE;
  }
  if (width >= THRESHOLDS.LARGE_WIDTH && height >= THRESHOLDS.LARGE_MIN_HEIGHT) {
    return ImageSize.LARGE;
  }

  // MEDIUM: Secondary content
  if (area >= THRESHOLDS.MEDIUM_AREA) {
    return ImageSize.MEDIUM;
  }
  if (width >= THRESHOLDS.MEDIUM_MIN_DIM && height >= THRESHOLDS.MEDIUM_MIN_DIM) {
    return ImageSize.MEDIUM;
  }

  // SMALL: Icons, thumbnails, avatars
  return ImageSize.SMALL;
}

/**
 * Check if an image should be skipped based on size and domain.
 *
 * @param img - Image element
 * @param src - Resolved absolute URL
 * @param config - Filter configuration
 * @returns Skip decision with reason
 */
export function shouldSkipImage(
  img: HTMLImageElement,
  src: string,
  config: FilterConfig
): { skip: boolean; reason?: string; size?: ImageSize } {

  // 1. Check for tracking pixels
  if (config.skipTrackingPixels) {
    const size = classifyImageSize(img);
    if (size === ImageSize.SKIP) {
      return {
        skip: true,
        reason: 'tracking pixel (≤5x5)',
        size
      };
    }
  }

  // 2. Check for ad network images
  if (config.filterAdImages) {
    if (isAdImage(src)) {
      return {
        skip: true,
        reason: `ad network: ${new URL(src).hostname}`
      };
    }
  }

  return { skip: false, size: classifyImageSize(img) };
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
        console.log('[Filter] Removing tracking pixel:', src);
      }
      img.remove();
      removed++;
    }
  });

  return removed;
}
```

#### Integration

```typescript
// In content.ts image extraction loop:
const { skip, reason, size } = shouldSkipImage(img, src, filterConfig);
if (skip) {
  console.log(`[WebClipper] Skipping image (${reason}):`, src);
  return;
}

// Optionally log size for debugging
if (filterConfig.debug) {
  console.log(`[WebClipper] Image classified as ${size}:`, src);
}
```

---

### 4.3 Empty Element Cleanup (P1)

**File: `extension/src/filters/empty-elements.ts`**

#### Purpose
Remove elements that have no meaningful content after other filters have run.
This cleans up:
- Wrapper divs that contained only ads (now removed)
- Sections where all content was filtered out
- Nested empty containers

#### Implementation

```typescript
import { FilterConfig } from './types';

/**
 * Elements that can be removed if empty.
 * Structural elements (tr, td, th) are preserved for layout.
 */
const REMOVABLE_ELEMENTS = new Set([
  'div', 'section', 'article', 'aside', 'nav',
  'span', 'p', 'ul', 'ol', 'li', 'blockquote',
  'figure', 'figcaption', 'header', 'footer',
]);

/**
 * Elements that make a container "not empty" even without text.
 */
const CONTENT_ELEMENTS = new Set([
  'img', 'video', 'audio', 'iframe', 'embed', 'object',
  'canvas', 'svg', 'picture', 'source',
]);

/**
 * Remove empty elements from the content.
 * Processes bottom-up to handle nested empty containers.
 *
 * @param container - Container element to clean
 * @param config - Filter configuration
 * @returns Number of elements removed
 */
export function removeEmptyElements(
  container: Element,
  config: FilterConfig
): number {
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

      if (isEffectivelyEmpty(element, config)) {
        const tagName = element.tagName.toLowerCase();

        // Special case: empty <p> becomes <br><br>
        if (tagName === 'p') {
          const br = document.createElement('br');
          element.replaceWith(br, document.createElement('br'));
        } else {
          element.remove();
        }

        removedCount++;
        changed = true;

        if (config.debug) {
          console.log('[Filter] Removed empty element:', tagName);
        }
      }
    }
  }

  return removedCount;
}

/**
 * Check if an element is effectively empty.
 */
function isEffectivelyEmpty(element: Element, config: FilterConfig): boolean {
  // Check for content elements (images, video, etc.)
  for (const tag of CONTENT_ELEMENTS) {
    if (element.querySelector(tag)) {
      return false;
    }
  }

  // Check text content
  const text = (element.textContent || '')
    .replace(/[\s\n\r\t]+/g, ' ')
    .trim();

  return text.length < config.emptyElementThreshold;
}

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
 * Clean up excessive whitespace in HTML.
 * - Collapse multiple <br> tags
 * - Remove <br> at block boundaries
 */
export function cleanupWhitespace(container: Element): void {
  let html = container.innerHTML;

  // Collapse multiple consecutive <br> (3+ becomes 2)
  html = html.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');

  // Collapse multiple <hr>
  html = html.replace(/(<hr\s*\/?>\s*){2,}/gi, '<hr>');

  // Remove <br> at start of block elements
  html = html.replace(
    /<(div|p|li|td|blockquote|section|article)([^>]*)>(\s*<br\s*\/?>)+/gi,
    '<$1$2>'
  );

  // Remove <br> at end of block elements
  html = html.replace(
    /(<br\s*\/?>\s*)+<\/(div|p|li|td|blockquote|section|article)>/gi,
    '</$2>'
  );

  // Remove <br> immediately before block elements
  html = html.replace(
    /(<br\s*\/?>\s*)+<(div|p|h[1-6]|ul|ol|table|blockquote)/gi,
    '<$2'
  );

  // Remove <br> immediately after block elements
  html = html.replace(
    /<\/(div|p|h[1-6]|ul|ol|table|blockquote)>(\s*<br\s*\/?>)+/gi,
    '</$1>'
  );

  container.innerHTML = html;
}
```

---

### 4.4 Link Ad Domain Filtering (P2)

**File: `extension/src/filters/ad-domains.ts`** (addition)

#### Purpose
Remove or neutralize links that point to ad networks, affiliate trackers, or sponsored content redirectors.

#### Implementation

```typescript
/**
 * Known advertising and affiliate link domains.
 * Links to these domains are neutralized (converted to plain text).
 */
export const AD_LINK_DOMAINS: string[] = [
  // Ad Networks
  'doubleclick.net',
  'doubleclick.com',
  'googleadservices.com',
  'googlesyndication.com',

  // Click Trackers
  'fastclick.net',
  'serving-sys.com',
  'atdmt.com',
  'advertising.com',
  'adnxs.com',

  // Content Recommendation (often spammy)
  'taboola.com',
  'outbrain.com',
  'revcontent.com',
  'mgid.com',
  'zergnet.com',
  'content.ad',

  // Affiliate Networks
  'linksynergy.com',
  'shareasale.com',
  'cj.com',
  'awin1.com',
  'impact.com',
  'partnerize.com',
  'pepperjam.com',

  // URL Shorteners (often used for tracking)
  'bit.ly',
  'tinyurl.com',
  'ow.ly',
  't.co',  // Twitter's tracker

  // Regional
  'impact-ad.jp',
  'microad.jp',
  'adplan-ds.com',

  // Misc Ad Tech
  'bannersxchange.com',
  'buysellads.com',
  'adbrite.com',
  'adbureau.net',
  'admob.com',
  'criteo.com',
];

/**
 * Check if a link URL is an ad/affiliate link.
 *
 * @param href - Link URL
 * @returns true if link should be neutralized
 */
export function isAdLink(href: string): boolean {
  try {
    const url = new URL(href);
    const hostname = url.hostname.toLowerCase();

    return AD_LINK_DOMAINS.some(domain =>
      hostname === domain ||
      hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/**
 * Neutralize ad links in a container.
 * Links are replaced with their text content (not removed entirely).
 *
 * @param container - Element containing links
 * @param config - Filter configuration
 * @returns Number of links neutralized
 */
export function neutralizeAdLinks(container: Element, config: FilterConfig): number {
  if (!config.filterAdLinks) return 0;

  let neutralized = 0;
  const links = container.querySelectorAll('a[href]');

  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;

    // Resolve relative URLs
    let absoluteHref = href;
    try {
      absoluteHref = new URL(href, window.location.href).href;
    } catch {
      // Invalid URL, skip
      return;
    }

    if (isAdLink(absoluteHref)) {
      // Replace link with its text content
      const text = document.createTextNode(link.textContent || '');
      link.parentNode?.replaceChild(text, link);
      neutralized++;

      if (config.debug) {
        console.log('[Filter] Neutralized ad link:', absoluteHref);
      }
    }
  });

  return neutralized;
}
```

---

### 4.5 Floating Element Detection (P2)

**File: `extension/src/filters/floating-elements.ts`**

#### Purpose
Remove floated elements that are likely sidebars, ad containers, or social widgets.
Floating elements with little content are typically not main article content.

#### Implementation

```typescript
import { FilterConfig, FilterResult } from './types';
import { collectMetrics } from './metrics';

/**
 * Elements that commonly float for layout purposes.
 */
const FLOATABLE_ELEMENTS = new Set(['div', 'aside', 'figure', 'table', 'section']);

/**
 * Check if an element is floated via CSS.
 */
function isFloated(element: Element): boolean {
  try {
    const style = window.getComputedStyle(element as HTMLElement);
    const float = style.getPropertyValue('float');
    return float === 'left' || float === 'right';
  } catch {
    return false;
  }
}

/**
 * Filter floating elements that are likely not content.
 *
 * Floating elements are removed if:
 * - They have little plain text (<200 chars)
 * - They don't contain large/medium images
 * - They don't contain headings with substantial text
 *
 * @param element - Element to evaluate
 * @param config - Filter configuration
 * @returns Filter decision
 */
export function filterFloatingElement(
  element: Element,
  config: FilterConfig
): FilterResult {
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
  const elements = container.querySelectorAll(selector);

  elements.forEach((element) => {
    // Skip if already removed
    if (!element.parentElement) return;
    if (!container.contains(element)) return;

    const result = filterFloatingElement(element, config);
    if (result.shouldRemove) {
      element.remove();
      removed++;

      if (config.debug) {
        console.log('[Filter] Removed floating element:', result.reason);
      }
    }
  });

  return removed;
}
```

---

## 5. Updated Filter Pipeline

**File: `extension/src/filters/index.ts`** (updated)

```typescript
import { FilterConfig, FilterStats } from './types';
import { applyLinkDensityFilter } from './link-density';
import { applyFloatingFilter } from './floating-elements';
import { neutralizeAdLinks, filterAdImages } from './ad-domains';
import { filterTrackingPixels } from './image-classifier';
import { removeEmptyElements, cleanupWhitespace } from './empty-elements';

/**
 * Default filter configuration.
 */
export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  linkDensityThreshold: 0.5,
  linkDensityMinText: 25,
  linkDensityKeepAbove: 200,
  floatingMinText: 200,
  filterAdImages: true,
  filterAdLinks: true,
  skipTrackingPixels: true,
  emptyElementThreshold: 5,
  debug: false,
};

/**
 * Apply all content filters to extracted content.
 *
 * Filter order:
 * 1. Link density (navigation removal)
 * 2. Floating elements (sidebars)
 * 3. Ad domain links (affiliate/tracker links)
 * 4. Ad domain images (ad network images)
 * 5. Tracking pixels (tiny images)
 * 6. Empty elements (cleanup)
 * 7. Whitespace (final cleanup)
 */
export function applyContentFilters(
  container: Element,
  config: Partial<FilterConfig> = {}
): FilterStats {
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

// Re-exports
export * from './types';
export { classifyImageSize, shouldSkipImage, ImageSize } from './image-classifier';
export { isAdImage, isAdLink, AD_IMAGE_DOMAINS, AD_LINK_DOMAINS } from './ad-domains';
export { collectMetrics } from './metrics';
export { filterLinkDensity, applyLinkDensityFilter } from './link-density';
export { filterFloatingElement, applyFloatingFilter } from './floating-elements';
export { removeEmptyElements, cleanupWhitespace } from './empty-elements';
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

```typescript
// extension/src/filters/__tests__/ad-domains.test.ts

describe('Ad Domain Filter', () => {
  describe('isAdImage', () => {
    it('should block googlesyndication images', () => {
      expect(isAdImage('https://pagead2.googlesyndication.com/pagead/img.gif')).toBe(true);
    });

    it('should block doubleclick images', () => {
      expect(isAdImage('https://ad.doubleclick.net/banner.jpg')).toBe(true);
    });

    it('should allow normal images', () => {
      expect(isAdImage('https://example.com/photo.jpg')).toBe(false);
    });

    it('should handle subdomains', () => {
      expect(isAdImage('https://pixel.facebook.com/tr')).toBe(true);
    });
  });

  describe('isAdLink', () => {
    it('should detect taboola links', () => {
      expect(isAdLink('https://www.taboola.com/feed')).toBe(true);
    });

    it('should detect affiliate links', () => {
      expect(isAdLink('https://click.linksynergy.com/deeplink')).toBe(true);
    });
  });
});

// extension/src/filters/__tests__/image-classifier.test.ts

describe('Image Size Classifier', () => {
  it('should classify 1x1 as SKIP', () => {
    const img = createMockImage(1, 1);
    expect(classifyImageSize(img)).toBe(ImageSize.SKIP);
  });

  it('should classify 400x300 as LARGE', () => {
    const img = createMockImage(400, 300);
    expect(classifyImageSize(img)).toBe(ImageSize.LARGE);
  });

  it('should classify 150x150 as MEDIUM', () => {
    const img = createMockImage(150, 150);
    expect(classifyImageSize(img)).toBe(ImageSize.MEDIUM);
  });

  it('should classify 50x50 as SMALL', () => {
    const img = createMockImage(50, 50);
    expect(classifyImageSize(img)).toBe(ImageSize.SMALL);
  });
});
```

### 6.2 Integration Test Sites

| Site | Challenge | Expected Filter |
|------|-----------|-----------------|
| lefigaro.fr | Heavy "publicité" markers | Ad domain + link density |
| lemonde.fr | Related articles sections | Link density |
| nytimes.com | Taboola recommendations | Ad domain links |
| medium.com | Social share widgets | Floating elements |
| wikipedia.org | Edit links in headers | Clean (no false positives) |
| techcrunch.com | Heavy sidebar ads | Multiple filters |

---

## 7. Performance Considerations

| Filter | Est. Time | Notes |
|--------|-----------|-------|
| Link Density | 5-15ms | ✅ Implemented |
| Floating Elements | 2-5ms | CSS query + metrics |
| Ad Domain (images) | 1-3ms | URL parsing |
| Ad Domain (links) | 1-3ms | URL parsing |
| Image Classification | 2-5ms | DOM measurements |
| Empty Elements | 5-15ms | Bottom-up traversal |
| Whitespace Cleanup | 1-2ms | Regex on HTML |
| **Total** | **17-48ms** | Negligible |

---

## 8. Success Metrics

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| Ad images in clips | 5-10% | <1% | Domain audit |
| Tracking pixels | Unknown | 0 | Size audit |
| Navigation sections | 3-5% | <1% | Link density audit |
| Empty wrappers | 10-20% | <2% | Element audit |
| False positives | 0% | <0.1% | Content loss audit |
| Processing time | ~200ms | <250ms | Performance test |

---

## 9. Implementation Order

### Phase 1: P0 Features (Current Sprint)
1. ✅ Link Density Analysis - DONE
2. Image Ad Domain Filtering - files to create
3. Image Size Classification - files to create

### Phase 2: P1 Features
4. Empty Element Cleanup
5. Update filter pipeline

### Phase 3: P2 Features
6. Link Ad Domain Filtering
7. Floating Element Detection

---

## Appendix A: Complete Ad Domain Lists

See implementation in `extension/src/filters/ad-domains.ts` for the maintained lists.

## Appendix B: Research Reference

See `docs/research/evernote-clearly-algorithm.md` for the complete analysis of Evernote Clearly's approach that informed this specification.
