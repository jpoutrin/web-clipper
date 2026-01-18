/**
 * Tests for ad domain filtering functionality.
 */

import { isAdImage, isAdLink, filterAdImages, neutralizeAdLinks, AD_IMAGE_DOMAINS, AD_LINK_DOMAINS } from '../ad-domains';
import { FilterConfig } from '../types';
import { DEFAULT_FILTER_CONFIG } from '../index';

describe('Ad Domain Filter', () => {
  describe('isAdImage', () => {
    it('should block googlesyndication images', () => {
      expect(isAdImage('https://pagead2.googlesyndication.com/pagead/img.gif')).toBe(true);
      expect(isAdImage('https://tpc.googlesyndication.com/simgad/123')).toBe(true);
    });

    it('should block doubleclick images', () => {
      expect(isAdImage('https://ad.doubleclick.net/banner.jpg')).toBe(true);
      expect(isAdImage('https://stats.g.doubleclick.net/pixel.gif')).toBe(true);
    });

    it('should block 2mdn.net (Google ad network)', () => {
      expect(isAdImage('https://s0.2mdn.net/ads/img.gif')).toBe(true);
    });

    it('should allow normal images', () => {
      expect(isAdImage('https://example.com/photo.jpg')).toBe(false);
      expect(isAdImage('https://cdn.website.com/images/logo.png')).toBe(false);
    });

    it('should handle subdomains correctly', () => {
      expect(isAdImage('https://pixel.facebook.com/tr')).toBe(true);
      expect(isAdImage('https://sub.pixel.facebook.com/tr')).toBe(true);
      expect(isAdImage('https://notpixel.facebook.com/image.png')).toBe(false);
    });

    it('should handle invalid URLs gracefully', () => {
      expect(isAdImage('not-a-url')).toBe(false);
      expect(isAdImage('')).toBe(false);
    });

    it('should block tracking pixel domains', () => {
      expect(isAdImage('https://pixel.quantserve.com/pixel.gif')).toBe(true);
      expect(isAdImage('https://bat.bing.com/action/0')).toBe(true);
      expect(isAdImage('https://analytics.twitter.com/i/adsct')).toBe(true);
      expect(isAdImage('https://px.ads.linkedin.com/collect')).toBe(true);
    });

    it('should block content recommendation networks', () => {
      expect(isAdImage('https://cdn.taboola.com/libtrc/static/img.png')).toBe(true);
      expect(isAdImage('https://widgets.outbrain.com/images/bg.png')).toBe(true);
    });

    it('should block regional ad networks (Japan)', () => {
      expect(isAdImage('https://imp.impact-ad.jp/pixel.gif')).toBe(true);
      expect(isAdImage('https://ad.microad.jp/image.png')).toBe(true);
    });
  });

  describe('isAdLink', () => {
    it('should detect taboola links', () => {
      expect(isAdLink('https://www.taboola.com/feed')).toBe(true);
      expect(isAdLink('https://popup.taboola.com/click')).toBe(true);
    });

    it('should detect outbrain links', () => {
      expect(isAdLink('https://paid.outbrain.com/network/redir')).toBe(true);
    });

    it('should detect affiliate network links', () => {
      expect(isAdLink('https://click.linksynergy.com/deeplink')).toBe(true);
      expect(isAdLink('https://www.shareasale.com/r.cfm')).toBe(true);
      expect(isAdLink('https://www.awin1.com/cread.php')).toBe(true);
      expect(isAdLink('https://goto.target.com/c/123')).toBe(false); // Not in list
    });

    it('should detect URL shorteners used for tracking', () => {
      expect(isAdLink('https://bit.ly/abc123')).toBe(true);
      expect(isAdLink('https://t.co/xyz789')).toBe(true);
      expect(isAdLink('https://tinyurl.com/short')).toBe(true);
    });

    it('should allow normal links', () => {
      expect(isAdLink('https://example.com/article')).toBe(false);
      expect(isAdLink('https://www.nytimes.com/news')).toBe(false);
      expect(isAdLink('https://github.com/repo')).toBe(false);
    });

    it('should handle invalid URLs gracefully', () => {
      expect(isAdLink('not-a-url')).toBe(false);
      expect(isAdLink('')).toBe(false);
    });

    it('should detect ad network links', () => {
      expect(isAdLink('https://adclick.g.doubleclick.net/pcs/click')).toBe(true);
      expect(isAdLink('https://www.googleadservices.com/pagead/aclk')).toBe(true);
    });
  });

  describe('filterAdImages', () => {
    let container: HTMLDivElement;
    let config: FilterConfig;

    beforeEach(() => {
      container = document.createElement('div');
      config = { ...DEFAULT_FILTER_CONFIG, debug: false };
    });

    it('should remove ad network images', () => {
      container.innerHTML = `
        <img src="https://example.com/photo.jpg" alt="Content">
        <img src="https://pagead2.googlesyndication.com/tracking.gif" alt="Ad">
        <img src="https://ad.doubleclick.net/banner.jpg" alt="Ad">
      `;

      const removed = filterAdImages(container, config);

      expect(removed).toBe(2);
      expect(container.querySelectorAll('img').length).toBe(1);
      expect(container.querySelector('img')?.getAttribute('alt')).toBe('Content');
    });

    it('should preserve content images', () => {
      container.innerHTML = `
        <img src="https://cdn.example.com/article-image.jpg" alt="Article">
        <img src="https://images.website.com/photo.png" alt="Photo">
      `;

      const removed = filterAdImages(container, config);

      expect(removed).toBe(0);
      expect(container.querySelectorAll('img').length).toBe(2);
    });

    it('should do nothing when filtering is disabled', () => {
      container.innerHTML = `
        <img src="https://pagead2.googlesyndication.com/tracking.gif">
      `;

      const disabledConfig: FilterConfig = { ...config, filterAdImages: false };
      const removed = filterAdImages(container, disabledConfig);

      expect(removed).toBe(0);
      expect(container.querySelectorAll('img').length).toBe(1);
    });

    it('should handle images without src', () => {
      container.innerHTML = `
        <img alt="No src">
        <img src="https://example.com/photo.jpg">
      `;

      const removed = filterAdImages(container, config);

      expect(removed).toBe(0);
      expect(container.querySelectorAll('img').length).toBe(2);
    });
  });

  describe('neutralizeAdLinks', () => {
    let container: HTMLDivElement;
    let config: FilterConfig;

    beforeEach(() => {
      container = document.createElement('div');
      config = { ...DEFAULT_FILTER_CONFIG, debug: false };
    });

    it('should convert ad links to plain text', () => {
      container.innerHTML = `
        <p>Check out <a href="https://www.taboola.com/click">this sponsored content</a></p>
      `;

      const neutralized = neutralizeAdLinks(container, config);

      expect(neutralized).toBe(1);
      expect(container.querySelectorAll('a').length).toBe(0);
      expect(container.textContent).toContain('this sponsored content');
    });

    it('should preserve normal links', () => {
      container.innerHTML = `
        <p>Read <a href="https://example.com/article">this article</a></p>
      `;

      const neutralized = neutralizeAdLinks(container, config);

      expect(neutralized).toBe(0);
      expect(container.querySelectorAll('a').length).toBe(1);
    });

    it('should handle multiple links', () => {
      container.innerHTML = `
        <nav>
          <a href="https://example.com">Home</a>
          <a href="https://bit.ly/track123">Tracked</a>
          <a href="https://github.com">GitHub</a>
          <a href="https://t.co/short">Twitter</a>
        </nav>
      `;

      const neutralized = neutralizeAdLinks(container, config);

      expect(neutralized).toBe(2);
      expect(container.querySelectorAll('a').length).toBe(2);
    });

    it('should do nothing when filtering is disabled', () => {
      container.innerHTML = `
        <a href="https://www.taboola.com/click">Sponsored</a>
      `;

      const disabledConfig: FilterConfig = { ...config, filterAdLinks: false };
      const neutralized = neutralizeAdLinks(container, disabledConfig);

      expect(neutralized).toBe(0);
      expect(container.querySelectorAll('a').length).toBe(1);
    });

    it('should handle links without href', () => {
      container.innerHTML = `
        <a>No href link</a>
        <a href="">Empty href</a>
      `;

      const neutralized = neutralizeAdLinks(container, config);

      expect(neutralized).toBe(0);
    });
  });

  describe('Domain Lists', () => {
    it('should have a comprehensive image domain list', () => {
      expect(AD_IMAGE_DOMAINS.length).toBeGreaterThan(30);
      expect(AD_IMAGE_DOMAINS).toContain('googlesyndication.com');
      expect(AD_IMAGE_DOMAINS).toContain('doubleclick.net');
      expect(AD_IMAGE_DOMAINS).toContain('pixel.facebook.com');
    });

    it('should have a comprehensive link domain list', () => {
      expect(AD_LINK_DOMAINS.length).toBeGreaterThan(20);
      expect(AD_LINK_DOMAINS).toContain('taboola.com');
      expect(AD_LINK_DOMAINS).toContain('outbrain.com');
      expect(AD_LINK_DOMAINS).toContain('linksynergy.com');
    });
  });
});
