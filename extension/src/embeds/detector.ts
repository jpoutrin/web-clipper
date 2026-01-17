/**
 * Embed Detection
 * TS-0004: Detect embeds on the page using registered providers
 */

import { providerRegistry } from './providers';
import { DetectedEmbed, EmbedCaptureConfig, DEFAULT_EMBED_CONFIG } from './types';

/**
 * Detect all embeds on the page using registered providers.
 *
 * @param config - Capture configuration with limits
 * @param scope - Optional element to scope detection within (e.g., article element)
 * @returns Array of detected embeds, sorted by document position
 */
export function detectEmbeds(
  config: EmbedCaptureConfig = DEFAULT_EMBED_CONFIG,
  scope?: HTMLElement | Document
): DetectedEmbed[] {
  const detected: DetectedEmbed[] = [];
  const processedElements = new Set<HTMLElement>();
  let embedIndex = 0;

  // Use provided scope or default to document
  const root = scope || document;

  // Get all providers in priority order
  const providers = providerRegistry.getAll();

  for (const provider of providers) {
    // Check if we've hit the limit
    if (detected.length >= config.maxEmbeds) {
      break;
    }

    // Query all selectors for this provider
    for (const selector of provider.selectors) {
      try {
        const elements = root.querySelectorAll<HTMLElement>(selector);

        for (const element of elements) {
          // Skip if already processed by a higher-priority provider
          if (processedElements.has(element)) {
            continue;
          }

          // Skip if already at limit
          if (detected.length >= config.maxEmbeds) {
            break;
          }

          // Skip advertisements
          if (isAdvertisement(element)) {
            processedElements.add(element);
            continue;
          }

          // Check if element is visible and meets size requirements
          const bounds = element.getBoundingClientRect();
          if (!isValidEmbedBounds(bounds, config)) {
            continue;
          }

          // Mark as processed to prevent duplicate captures
          processedElements.add(element);

          // Also mark parent/child elements to avoid nested captures
          markRelatedElements(element, processedElements);

          // Extract metadata using provider's extractor
          const metadata = provider.extractMetadata?.(element) || {
            title: 'Embedded Content',
            sourceName: provider.name,
          };

          detected.push({
            provider,
            element,
            bounds,
            metadata,
            index: ++embedIndex,
          });
        }
      } catch (err) {
        console.warn(`[WebClipper] Error querying selector "${selector}":`, err);
      }
    }
  }

  // Also check iframes by src pattern
  const iframes = root.querySelectorAll<HTMLIFrameElement>('iframe[src]');
  const patterns = providerRegistry.getAllIframePatterns();

  for (const iframe of iframes) {
    if (detected.length >= config.maxEmbeds) {
      break;
    }

    if (processedElements.has(iframe)) {
      continue;
    }

    // Skip advertisements
    if (isAdvertisement(iframe)) {
      processedElements.add(iframe);
      continue;
    }

    const src = iframe.getAttribute('src') || '';

    for (const { provider, pattern } of patterns) {
      if (pattern.test(src)) {
        const bounds = iframe.getBoundingClientRect();
        if (!isValidEmbedBounds(bounds, config)) {
          continue;
        }

        processedElements.add(iframe);

        const metadata = provider.extractMetadata?.(iframe) || {
          title: 'Embedded Content',
          sourceUrl: src,
          sourceName: provider.name,
        };

        detected.push({
          provider,
          element: iframe,
          bounds,
          metadata,
          index: ++embedIndex,
        });

        break; // Only match first provider
      }
    }
  }

  // Sort by document position (top to bottom, left to right)
  detected.sort((a, b) => {
    if (Math.abs(a.bounds.top - b.bounds.top) < 50) {
      return a.bounds.left - b.bounds.left;
    }
    return a.bounds.top - b.bounds.top;
  });

  return detected;
}

/**
 * Check if bounds meet minimum size requirements.
 */
function isValidEmbedBounds(bounds: DOMRect, config: EmbedCaptureConfig): boolean {
  return (
    bounds.width >= config.minWidth &&
    bounds.height >= config.minHeight &&
    bounds.width > 0 &&
    bounds.height > 0
  );
}

/**
 * Mark related elements (parents/children) as processed
 * to avoid capturing nested embeds.
 */
function markRelatedElements(
  element: HTMLElement,
  processedElements: Set<HTMLElement>
): void {
  // Mark all child iframes
  const childIframes = element.querySelectorAll<HTMLElement>('iframe');
  childIframes.forEach((iframe) => processedElements.add(iframe));

  // Mark immediate parent if it's a common embed wrapper
  const parent = element.parentElement;
  if (parent && isEmbedWrapper(parent)) {
    processedElements.add(parent);
  }
}

/**
 * Check if an element is a common embed wrapper.
 */
function isEmbedWrapper(element: HTMLElement): boolean {
  const wrapperClasses = [
    'embed-container',
    'embed-wrapper',
    'iframe-wrapper',
    'video-wrapper',
    'responsive-embed',
  ];

  return wrapperClasses.some((cls) => element.classList.contains(cls));
}

/**
 * Check if an element is an advertisement that should be skipped.
 */
function isAdvertisement(element: HTMLElement): boolean {
  const id = element.id || '';
  const className = element.className || '';
  const src = element.getAttribute('src') || '';

  // Check ID patterns
  if (
    id.startsWith('google_ads_iframe_') ||
    id.includes('google_ad') ||
    id.includes('doubleclick') ||
    id.includes('ad-') ||
    id.includes('pub-')
  ) {
    return true;
  }

  // Check class patterns
  if (
    className.includes('adsbygoogle') ||
    className.includes('google-ad') ||
    className.includes('ad-container') ||
    className.includes('ad-slot') ||
    className.includes('advertisement')
  ) {
    return true;
  }

  // Check src patterns for iframes
  if (
    src.includes('doubleclick.net') ||
    src.includes('googlesyndication.com') ||
    src.includes('googleadservices.com') ||
    src.includes('ad.') ||
    src.includes('/ads/') ||
    src.includes('pagead')
  ) {
    return true;
  }

  // Check parent container for ad indicators
  const parent = element.parentElement;
  if (parent) {
    const parentId = parent.id || '';
    const parentClass = parent.className || '';
    if (
      parentId.startsWith('google_ads_iframe_') ||
      parentId.includes('google_ad') ||
      parentClass.includes('adsbygoogle')
    ) {
      return true;
    }
  }

  return false;
}
