/**
 * Embed Provider Registry
 * TS-0004: Registry pattern for extensible embed detection
 */

import { EmbedProvider, EmbedMetadata } from '../types';

/**
 * Registry of embed providers.
 * Providers are sorted by priority (highest first) on registration.
 */
class ProviderRegistry {
  private providers: EmbedProvider[] = [];

  /**
   * Register a new provider.
   * Maintains sorted order by priority (descending).
   */
  register(provider: EmbedProvider): void {
    this.providers.push(provider);
    this.providers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get all registered providers in priority order.
   */
  getAll(): EmbedProvider[] {
    return [...this.providers];
  }

  /**
   * Find a provider by ID.
   */
  getById(id: string): EmbedProvider | undefined {
    return this.providers.find((p) => p.id === id);
  }

  /**
   * Get all CSS selectors from all providers.
   */
  getAllSelectors(): string[] {
    return this.providers.flatMap((p) => p.selectors);
  }

  /**
   * Get all iframe patterns from all providers.
   */
  getAllIframePatterns(): Array<{ provider: EmbedProvider; pattern: RegExp }> {
    return this.providers
      .filter((p) => p.iframePatterns?.length)
      .flatMap((p) => p.iframePatterns!.map((pattern) => ({ provider: p, pattern })));
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry();

// ============================================
// Built-in Providers
// ============================================

/**
 * Datawrapper - Data visualization platform
 * Used by many news organizations for charts and maps.
 */
export const datawrapperProvider: EmbedProvider = {
  id: 'datawrapper',
  name: 'Datawrapper',
  selectors: [
    '.datawrapper-embed',
    '[data-datawrapper-id]',
    'iframe[src*="datawrapper.dwcdn.net"]',
  ],
  iframePatterns: [/datawrapper\.dwcdn\.net/i, /datawrapper\.de/i],
  requiresScroll: true,
  waitForSelector: 'svg, canvas, .dw-chart',
  waitTimeout: 3000,
  priority: 100,
  extractMetadata: (element: HTMLElement): EmbedMetadata => {
    const iframe = element.querySelector('iframe');
    const title =
      element.getAttribute('data-title') ||
      iframe?.getAttribute('title') ||
      'Data Visualization';
    const src = iframe?.getAttribute('src') || '';

    return {
      title,
      sourceUrl: src,
      sourceName: 'Datawrapper',
      altText: `Chart: ${title}`,
    };
  },
};

/**
 * Flourish - Data storytelling platform
 * Popular for animated and interactive visualizations.
 */
export const flourishProvider: EmbedProvider = {
  id: 'flourish',
  name: 'Flourish',
  selectors: [
    '.flourish-embed',
    '[data-src*="flo.uri.sh"]',
    'iframe[src*="flo.uri.sh"]',
  ],
  iframePatterns: [/flo\.uri\.sh/i, /flourish\.studio/i],
  requiresScroll: true,
  waitForSelector: 'svg, canvas',
  waitTimeout: 3000,
  priority: 100,
  extractMetadata: (element: HTMLElement): EmbedMetadata => {
    const iframe = element.querySelector('iframe');
    const title =
      element.getAttribute('data-title') ||
      iframe?.getAttribute('title') ||
      'Interactive Visualization';

    return {
      title,
      sourceUrl: iframe?.getAttribute('src') || '',
      sourceName: 'Flourish',
      altText: `Visualization: ${title}`,
    };
  },
};

/**
 * Infogram - Infographic and chart platform
 */
export const infogramProvider: EmbedProvider = {
  id: 'infogram',
  name: 'Infogram',
  selectors: [
    '.infogram-embed',
    '[data-id*="infogram"]',
    'iframe[src*="infogram.com"]',
  ],
  iframePatterns: [/infogram\.com/i, /e\.infogram\.com/i],
  requiresScroll: true,
  waitForSelector: 'svg, canvas',
  waitTimeout: 3000,
  priority: 100,
  extractMetadata: (element: HTMLElement): EmbedMetadata => {
    const title = element.getAttribute('data-title') || 'Infographic';

    return {
      title,
      sourceName: 'Infogram',
      altText: `Infographic: ${title}`,
    };
  },
};

/**
 * Twitter/X - Social media embeds
 */
export const twitterProvider: EmbedProvider = {
  id: 'twitter',
  name: 'Twitter/X',
  selectors: [
    '.twitter-tweet',
    '.twitter-timeline',
    'blockquote.twitter-tweet',
    'iframe[src*="platform.twitter.com"]',
    'iframe[src*="platform.x.com"]',
  ],
  iframePatterns: [/platform\.twitter\.com/i, /platform\.x\.com/i],
  requiresScroll: true,
  waitForSelector: '.twitter-tweet-rendered, iframe',
  waitTimeout: 4000,
  priority: 90,
  extractMetadata: (element: HTMLElement): EmbedMetadata => {
    // Try to extract tweet text and author
    const blockquote = element.closest('blockquote') || element.querySelector('blockquote');
    const link = blockquote?.querySelector('a[href*="twitter.com"], a[href*="x.com"]');
    const href = link?.getAttribute('href') || '';

    return {
      title: 'Tweet',
      sourceUrl: href,
      sourceName: 'Twitter/X',
      altText: 'Twitter post',
    };
  },
};

/**
 * YouTube - Video thumbnails
 * Captures the video thumbnail rather than a blank player.
 */
export const youtubeProvider: EmbedProvider = {
  id: 'youtube',
  name: 'YouTube',
  selectors: [
    'iframe[src*="youtube.com/embed"]',
    'iframe[src*="youtube-nocookie.com/embed"]',
    '.youtube-player',
    'lite-youtube',
  ],
  iframePatterns: [/youtube\.com\/embed/i, /youtube-nocookie\.com\/embed/i],
  requiresScroll: true,
  waitTimeout: 2000,
  priority: 80,
  extractMetadata: (element: HTMLElement): EmbedMetadata => {
    const iframe =
      element.tagName === 'IFRAME'
        ? (element as HTMLIFrameElement)
        : element.querySelector('iframe');
    const src = iframe?.getAttribute('src') || '';
    const videoIdMatch = src.match(/embed\/([a-zA-Z0-9_-]+)/);
    const videoId = videoIdMatch?.[1] || '';
    const title = iframe?.getAttribute('title') || 'YouTube Video';

    return {
      title,
      sourceUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : src,
      sourceName: 'YouTube',
      altText: `Video: ${title}`,
    };
  },
};

/**
 * Generic iframe fallback - lowest priority catch-all
 * Captures any iframe that wasn't matched by a specific provider.
 */
export const genericIframeProvider: EmbedProvider = {
  id: 'generic-iframe',
  name: 'Embedded Content',
  selectors: ['iframe[src]:not([src=""])'],
  requiresScroll: true,
  waitTimeout: 2000,
  priority: 0, // Lowest priority - only matches if nothing else does
  extractMetadata: (element: HTMLElement): EmbedMetadata => {
    const iframe = element as HTMLIFrameElement;
    const src = iframe.getAttribute('src') || '';
    let sourceName = 'Embedded Content';

    try {
      const url = new URL(src, window.location.href);
      sourceName = url.hostname.replace(/^www\./, '');
    } catch {
      // Invalid URL, use default
    }

    return {
      title: iframe.getAttribute('title') || 'Embedded Content',
      sourceUrl: src,
      sourceName,
      altText: `Embedded content from ${sourceName}`,
    };
  },
};

// Register all built-in providers
providerRegistry.register(datawrapperProvider);
providerRegistry.register(flourishProvider);
providerRegistry.register(infogramProvider);
providerRegistry.register(twitterProvider);
providerRegistry.register(youtubeProvider);
providerRegistry.register(genericIframeProvider);
