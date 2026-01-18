/**
 * Tests for link density filter functionality.
 */

import { filterLinkDensity, applyLinkDensityFilter } from '../link-density';
import { FilterConfig } from '../types';
import { DEFAULT_FILTER_CONFIG } from '../index';

describe('Link Density Filter', () => {
  let config: FilterConfig;

  beforeEach(() => {
    config = { ...DEFAULT_FILTER_CONFIG };
  });

  describe('filterLinkDensity', () => {
    it('should not remove protected elements (article)', () => {
      const article = document.createElement('article');
      article.innerHTML = '<a href="#">All links</a>';

      const result = filterLinkDensity(article, config);
      expect(result.shouldRemove).toBe(false);
    });

    it('should not remove protected elements (main)', () => {
      const main = document.createElement('main');
      main.innerHTML = '<a href="#">All links</a>';

      const result = filterLinkDensity(main, config);
      expect(result.shouldRemove).toBe(false);
    });

    it('should not remove protected elements (p)', () => {
      const p = document.createElement('p');
      p.innerHTML = '<a href="#">All links</a>';

      const result = filterLinkDensity(p, config);
      expect(result.shouldRemove).toBe(false);
    });

    it('should not remove non-target elements (span)', () => {
      const span = document.createElement('span');
      span.innerHTML = '<a href="#">All links</a>';

      const result = filterLinkDensity(span, config);
      expect(result.shouldRemove).toBe(false);
    });

    it('should remove div with high link density (>50%)', () => {
      const div = document.createElement('div');
      // Link text is about 80% of total
      div.innerHTML = '<a href="#">Navigation Link One</a> <a href="#">Link Two</a> Text';

      const result = filterLinkDensity(div, config);
      expect(result.shouldRemove).toBe(true);
      expect(result.filter).toBe('link-density');
    });

    it('should keep div with low link density (<50%)', () => {
      const div = document.createElement('div');
      // Link text is about 20% of total
      div.innerHTML =
        'This is a paragraph with lots of content and only <a href="#">one link</a> in the middle of it all.';

      const result = filterLinkDensity(div, config);
      expect(result.shouldRemove).toBe(false);
    });

    it('should keep div with substantial plain text (>200 chars)', () => {
      const div = document.createElement('div');
      const longText = 'This is substantial content. '.repeat(15);
      div.innerHTML = `${longText}<a href="#">Link</a><a href="#">Link</a>`;

      const result = filterLinkDensity(div, config);
      expect(result.shouldRemove).toBe(false);
    });

    it('should keep div with large images', () => {
      const div = document.createElement('div');
      div.innerHTML = `
        <a href="#">Link</a>
        <img width="400" height="300" src="photo.jpg">
      `;

      const result = filterLinkDensity(div, config);
      expect(result.shouldRemove).toBe(false);
    });

    it('should keep div with medium images', () => {
      const div = document.createElement('div');
      div.innerHTML = `
        <a href="#">Link</a>
        <img width="150" height="150" src="photo.jpg">
      `;

      const result = filterLinkDensity(div, config);
      expect(result.shouldRemove).toBe(false);
    });

    it('should skip elements with very little content', () => {
      const div = document.createElement('div');
      div.innerHTML = '<a href="#">Hi</a>'; // Only 2 chars

      const result = filterLinkDensity(div, config);
      expect(result.shouldRemove).toBe(false);
    });

    it('should remove nav elements with high link density', () => {
      const nav = document.createElement('nav');
      // Need enough text (>25 chars) to trigger filter check
      nav.innerHTML = `
        <a href="#">Navigation Home Page</a>
        <a href="#">About Our Company</a>
        <a href="#">Contact Information</a>
      `;

      const result = filterLinkDensity(nav, config);
      expect(result.shouldRemove).toBe(true);
    });

    it('should remove footer with navigation links', () => {
      const footer = document.createElement('footer');
      // Need enough text (>25 chars) to trigger filter check
      footer.innerHTML = `
        <a href="#">Privacy Policy Page</a> |
        <a href="#">Terms of Service</a> |
        <a href="#">Contact Us Here</a>
      `;

      const result = filterLinkDensity(footer, config);
      expect(result.shouldRemove).toBe(true);
    });

    it('should remove ul with many links (high link-to-word ratio)', () => {
      const ul = document.createElement('ul');
      // Need enough text (>25 chars) to trigger filter check
      ul.innerHTML = `
        <li><a href="#">Navigation Item One</a></li>
        <li><a href="#">Navigation Item Two</a></li>
        <li><a href="#">Navigation Item Three</a></li>
      `;

      const result = filterLinkDensity(ul, config);
      expect(result.shouldRemove).toBe(true);
    });
  });

  describe('applyLinkDensityFilter', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
    });

    it('should remove navigation sections', () => {
      container.innerHTML = `
        <nav>
          <a href="#">Navigation Home Page</a>
          <a href="#">Products and Services</a>
          <a href="#">Contact Information</a>
        </nav>
        <article>
          <p>This is the main article content with lots of text.</p>
        </article>
      `;

      const removed = applyLinkDensityFilter(container, config);

      expect(removed).toBe(1);
      expect(container.querySelector('nav')).toBeNull();
      expect(container.querySelector('article')).not.toBeNull();
    });

    it('should remove footer link lists', () => {
      container.innerHTML = `
        <div>
          <p>Main content paragraph with substantial text content here.</p>
        </div>
        <footer>
          <a href="#">Privacy Policy Page</a> <a href="#">Terms of Service</a> <a href="#">Help Center</a>
        </footer>
      `;

      const removed = applyLinkDensityFilter(container, config);

      expect(removed).toBe(1);
      expect(container.querySelector('footer')).toBeNull();
    });

    it('should handle nested structures (deepest first)', () => {
      container.innerHTML = `
        <div class="outer">
          <div class="inner">
            <a href="#">Navigation Link One</a>
            <a href="#">Navigation Link Two</a>
          </div>
        </div>
      `;

      const removed = applyLinkDensityFilter(container, config);

      // Inner div should be removed first, then outer becomes empty or low-content
      expect(removed).toBeGreaterThanOrEqual(1);
    });

    it('should preserve content-heavy sections', () => {
      const longText =
        'This is a substantial paragraph with lots of meaningful content that provides value to readers.';
      container.innerHTML = `
        <div>
          <p>${longText}</p>
          <a href="#">Read more</a>
        </div>
      `;

      const removed = applyLinkDensityFilter(container, config);

      expect(removed).toBe(0);
    });

    it('should handle elements already removed by parent removal', () => {
      container.innerHTML = `
        <div class="sidebar">
          <ul>
            <li><a href="#">Navigation Link Item One</a></li>
            <li><a href="#">Navigation Link Item Two</a></li>
          </ul>
        </div>
      `;

      const removed = applyLinkDensityFilter(container, config);

      // Should remove elements without errors even if parents were removed
      expect(removed).toBeGreaterThanOrEqual(1);
    });
  });
});
