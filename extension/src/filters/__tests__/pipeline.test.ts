/**
 * Tests for the complete content filter pipeline.
 */

import { applyContentFilters, DEFAULT_FILTER_CONFIG, createFilterConfig } from '../index';
import { FilterStats, FilterConfig } from '../types';

describe('Content Filter Pipeline', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('applyContentFilters', () => {
    it('should return stats object with all counters', () => {
      container.innerHTML = '<p>Simple content</p>';

      const stats = applyContentFilters(container);

      expect(stats).toHaveProperty('linkDensityRemoved');
      expect(stats).toHaveProperty('floatingRemoved');
      expect(stats).toHaveProperty('adLinksRemoved');
      expect(stats).toHaveProperty('emptyRemoved');
      expect(stats).toHaveProperty('imagesSkipped');
      expect(stats).toHaveProperty('totalProcessed');
    });

    it('should apply all filters in order', () => {
      container.innerHTML = `
        <nav><a href="#">Navigation Home Page</a><a href="#">Products and Services</a></nav>
        <div style="float: left;">Sidebar content</div>
        <a href="https://taboola.com/click">Sponsored Content Here</a>
        <img src="https://pagead2.googlesyndication.com/ad.gif">
        <img width="1" height="1" src="pixel.gif">
        <div></div>
        <p>Main content that should be preserved.</p>
      `;

      const stats = applyContentFilters(container);

      // Navigation should be removed by link density
      expect(container.querySelector('nav')).toBeNull();

      // Floated sidebar should be removed
      expect(container.querySelector('div[style*="float"]')).toBeNull();

      // Ad link should be neutralized (text preserved, link removed)
      expect(container.querySelector('a[href*="taboola"]')).toBeNull();

      // Ad image should be removed
      expect(container.querySelector('img[src*="googlesyndication"]')).toBeNull();

      // Tracking pixel should be removed
      expect(container.querySelector('img[width="1"]')).toBeNull();

      // Empty div should be removed
      expect(container.innerHTML).not.toContain('<div></div>');

      // Content should be preserved
      expect(container.textContent).toContain('Main content');
    });

    it('should respect custom configuration', () => {
      container.innerHTML = `
        <nav><a href="#">Navigation Home Page Link</a><a href="#">Another Navigation Link</a></nav>
        <img src="https://pagead2.googlesyndication.com/ad.gif">
      `;

      const customConfig: Partial<FilterConfig> = {
        filterAdImages: false,
      };

      applyContentFilters(container, customConfig);

      // Nav should still be removed
      expect(container.querySelector('nav')).toBeNull();

      // Ad image should be preserved (filtering disabled)
      expect(container.querySelector('img')).not.toBeNull();
    });

    it('should count total elements processed', () => {
      container.innerHTML = `
        <div>
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
          <span>Span</span>
        </div>
      `;

      const stats = applyContentFilters(container);

      expect(stats.totalProcessed).toBeGreaterThan(0);
    });

    it('should handle empty container', () => {
      container.innerHTML = '';

      const stats = applyContentFilters(container);

      expect(stats.linkDensityRemoved).toBe(0);
      expect(stats.floatingRemoved).toBe(0);
      expect(stats.adLinksRemoved).toBe(0);
      expect(stats.emptyRemoved).toBe(0);
      expect(stats.imagesSkipped).toBe(0);
    });

    it('should preserve legitimate content', () => {
      const articleContent = `
        <article>
          <h1>Article Title</h1>
          <p>This is a paragraph with substantial content that should definitely be preserved
             because it contains meaningful text for readers.</p>
          <img src="https://example.com/photo.jpg" width="600" height="400" alt="Photo">
          <p>Another paragraph with more <a href="https://example.com">legitimate links</a>
             that are part of the content.</p>
        </article>
      `;
      container.innerHTML = articleContent;

      applyContentFilters(container);

      // All content elements should be preserved
      expect(container.querySelector('article')).not.toBeNull();
      expect(container.querySelector('h1')).not.toBeNull();
      expect(container.querySelectorAll('p').length).toBe(2);
      expect(container.querySelector('img')).not.toBeNull();
      expect(container.querySelector('a[href*="example.com"]')).not.toBeNull();
    });
  });

  describe('DEFAULT_FILTER_CONFIG', () => {
    it('should have reasonable default values', () => {
      expect(DEFAULT_FILTER_CONFIG.linkDensityThreshold).toBe(0.5);
      expect(DEFAULT_FILTER_CONFIG.linkDensityMinText).toBe(25);
      expect(DEFAULT_FILTER_CONFIG.linkDensityKeepAbove).toBe(200);
      expect(DEFAULT_FILTER_CONFIG.floatingMinText).toBe(200);
      expect(DEFAULT_FILTER_CONFIG.filterAdImages).toBe(true);
      expect(DEFAULT_FILTER_CONFIG.filterAdLinks).toBe(true);
      expect(DEFAULT_FILTER_CONFIG.skipTrackingPixels).toBe(true);
      expect(DEFAULT_FILTER_CONFIG.emptyElementThreshold).toBe(5);
      expect(DEFAULT_FILTER_CONFIG.debug).toBe(false);
    });
  });

  describe('createFilterConfig', () => {
    it('should merge overrides with defaults', () => {
      const config = createFilterConfig({ debug: true, floatingMinText: 100 });

      expect(config.debug).toBe(true);
      expect(config.floatingMinText).toBe(100);
      expect(config.linkDensityThreshold).toBe(0.5); // Default preserved
    });

    it('should return defaults when no overrides', () => {
      const config = createFilterConfig();

      expect(config).toEqual(DEFAULT_FILTER_CONFIG);
    });
  });

  describe('Integration scenarios', () => {
    it('should clean up a typical news article page', () => {
      container.innerHTML = `
        <nav>
          <a href="#">Navigation Home Page</a>
          <a href="#">Politics Section</a>
          <a href="#">Sports News</a>
        </nav>
        <aside style="float: right;">
          <a href="https://taboola.com">Sponsored Content</a>
          <img src="https://ad.doubleclick.net/ad.gif">
        </aside>
        <article>
          <h1>Breaking News</h1>
          <p>This is the main article content with important news that readers want to see.</p>
          <img src="https://cdn.news.com/photo.jpg" width="800" height="600">
          <p>More content about the news story continues here with additional details.</p>
        </article>
        <footer>
          <a href="#">Privacy Policy Page</a>
          <a href="#">Terms of Service</a>
          <a href="#">Contact Information</a>
          <img width="1" height="1" src="https://pixel.example.com/track.gif">
        </footer>
      `;

      const stats = applyContentFilters(container);

      // Navigation removed
      expect(container.querySelector('nav')).toBeNull();

      // Sidebar removed (floated + ads)
      expect(container.querySelector('aside')).toBeNull();

      // Footer removed (high link density)
      expect(container.querySelector('footer')).toBeNull();

      // Article preserved
      expect(container.querySelector('article')).not.toBeNull();
      expect(container.querySelector('h1')?.textContent).toBe('Breaking News');
      expect(container.querySelectorAll('p').length).toBe(2);

      // Stats reflect removals
      expect(stats.linkDensityRemoved).toBeGreaterThan(0);
    });

    it('should handle a blog post with related articles', () => {
      container.innerHTML = `
        <article>
          <h1>My Blog Post</h1>
          <p>This is my blog post content with meaningful paragraphs.</p>
        </article>
        <section class="related">
          <h3>Related Posts</h3>
          <ul>
            <li><a href="#">Related Post Number One</a></li>
            <li><a href="#">Related Post Number Two</a></li>
            <li><a href="#">Related Post Number Three</a></li>
          </ul>
        </section>
      `;

      applyContentFilters(container);

      // Article preserved
      expect(container.querySelector('article')).not.toBeNull();

      // Related posts (high link density list) removed
      expect(container.querySelector('ul')).toBeNull();
    });
  });
});
