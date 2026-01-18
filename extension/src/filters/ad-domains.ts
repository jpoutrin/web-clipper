/**
 * Ad Domain Filter
 *
 * Filters images and links from known advertising, tracking, and affiliate networks.
 * Based on Evernote Clearly's domain blocklists with modern additions.
 */

import { FilterConfig } from './types';

/**
 * Known advertising and tracking image domains.
 * Images from these domains should be filtered from clips.
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
  't.co',

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
 * Check if a URL hostname matches a domain in the blocklist.
 *
 * @param hostname - The hostname to check (lowercase)
 * @param domains - List of domains to check against
 * @returns true if hostname matches any domain
 */
function matchesDomain(hostname: string, domains: string[]): boolean {
  return domains.some((domain) => hostname === domain || hostname.endsWith('.' + domain));
}

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
    return matchesDomain(hostname, AD_IMAGE_DOMAINS);
  } catch {
    // Invalid URL - don't block
    return false;
  }
}

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
    return matchesDomain(hostname, AD_LINK_DOMAINS);
  } catch {
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
        console.log('[AdFilter] Removing ad image:', src);
      }
      img.remove();
      removed++;
    }
  });

  return removed;
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
  const links = Array.from(container.querySelectorAll('a[href]'));

  for (const link of links) {
    const href = link.getAttribute('href');
    if (!href) continue;

    // Resolve relative URLs
    let absoluteHref = href;
    try {
      // Use a base URL for relative paths
      absoluteHref = new URL(href, 'https://example.com').href;
    } catch {
      // Invalid URL, skip
      continue;
    }

    if (isAdLink(absoluteHref)) {
      // Replace link with its text content
      const text = document.createTextNode(link.textContent || '');
      link.parentNode?.replaceChild(text, link);
      neutralized++;

      if (config.debug) {
        console.log('[AdFilter] Neutralized ad link:', absoluteHref);
      }
    }
  }

  return neutralized;
}
