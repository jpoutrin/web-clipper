/**
 * Tests for empty element cleanup functionality.
 */

import {
  removeEmptyElements,
  cleanupWhitespace,
  isEffectivelyEmpty,
  isRemovableElement,
} from '../empty-elements';
import { FilterConfig } from '../types';
import { DEFAULT_FILTER_CONFIG } from '../index';

describe('Empty Element Filter', () => {
  let config: FilterConfig;

  beforeEach(() => {
    config = { ...DEFAULT_FILTER_CONFIG, emptyElementThreshold: 5 };
  });

  describe('isEffectivelyEmpty', () => {
    it('should consider element with no content as empty', () => {
      const div = document.createElement('div');
      expect(isEffectivelyEmpty(div, config)).toBe(true);
    });

    it('should consider element with only whitespace as empty', () => {
      const div = document.createElement('div');
      div.textContent = '   \n\t  ';
      expect(isEffectivelyEmpty(div, config)).toBe(true);
    });

    it('should consider element with text below threshold as empty', () => {
      const div = document.createElement('div');
      div.textContent = 'abc'; // 3 chars < 5 threshold
      expect(isEffectivelyEmpty(div, config)).toBe(true);
    });

    it('should not consider element with text above threshold as empty', () => {
      const div = document.createElement('div');
      div.textContent = 'Hello World'; // 11 chars > 5 threshold
      expect(isEffectivelyEmpty(div, config)).toBe(false);
    });

    it('should not consider element with images as empty', () => {
      const div = document.createElement('div');
      div.innerHTML = '<img src="photo.jpg">';
      expect(isEffectivelyEmpty(div, config)).toBe(false);
    });

    it('should not consider element with video as empty', () => {
      const div = document.createElement('div');
      div.innerHTML = '<video src="video.mp4"></video>';
      expect(isEffectivelyEmpty(div, config)).toBe(false);
    });

    it('should not consider element with iframe as empty', () => {
      const div = document.createElement('div');
      div.innerHTML = '<iframe src="https://example.com"></iframe>';
      expect(isEffectivelyEmpty(div, config)).toBe(false);
    });

    it('should not consider element with svg as empty', () => {
      const div = document.createElement('div');
      div.innerHTML = '<svg><circle r="10"/></svg>';
      expect(isEffectivelyEmpty(div, config)).toBe(false);
    });

    it('should not consider element with hr as empty', () => {
      const div = document.createElement('div');
      div.innerHTML = '<hr>';
      expect(isEffectivelyEmpty(div, config)).toBe(false);
    });
  });

  describe('isRemovableElement', () => {
    it('should allow removing div', () => {
      const div = document.createElement('div');
      expect(isRemovableElement(div)).toBe(true);
    });

    it('should allow removing section', () => {
      const section = document.createElement('section');
      expect(isRemovableElement(section)).toBe(true);
    });

    it('should allow removing aside', () => {
      const aside = document.createElement('aside');
      expect(isRemovableElement(aside)).toBe(true);
    });

    it('should allow removing p', () => {
      const p = document.createElement('p');
      expect(isRemovableElement(p)).toBe(true);
    });

    it('should allow removing ul/ol/li', () => {
      expect(isRemovableElement(document.createElement('ul'))).toBe(true);
      expect(isRemovableElement(document.createElement('ol'))).toBe(true);
      expect(isRemovableElement(document.createElement('li'))).toBe(true);
    });

    it('should not allow removing table structural elements', () => {
      expect(isRemovableElement(document.createElement('table'))).toBe(false);
      expect(isRemovableElement(document.createElement('tr'))).toBe(false);
      expect(isRemovableElement(document.createElement('td'))).toBe(false);
    });

    it('should not allow removing headings', () => {
      expect(isRemovableElement(document.createElement('h1'))).toBe(false);
      expect(isRemovableElement(document.createElement('h2'))).toBe(false);
      expect(isRemovableElement(document.createElement('h3'))).toBe(false);
    });
  });

  describe('removeEmptyElements', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
    });

    it('should remove empty div elements', () => {
      container.innerHTML = `
        <div></div>
        <div>Hello World</div>
        <div>   </div>
      `;

      const removed = removeEmptyElements(container, config);

      expect(removed).toBe(2);
      expect(container.querySelectorAll('div').length).toBe(1);
      expect(container.textContent?.trim()).toBe('Hello World');
    });

    it('should remove nested empty elements bottom-up', () => {
      container.innerHTML = `
        <div class="outer">
          <div class="inner">
            <div class="innermost"></div>
          </div>
        </div>
      `;

      const removed = removeEmptyElements(container, config);

      expect(removed).toBe(3);
      expect(container.querySelectorAll('div').length).toBe(0);
    });

    it('should preserve elements with content', () => {
      container.innerHTML = `
        <div>
          <p>This has content</p>
          <div></div>
        </div>
      `;

      const removed = removeEmptyElements(container, config);

      expect(removed).toBe(1); // Only the empty div
      expect(container.querySelector('p')).not.toBeNull();
      expect(container.textContent?.trim()).toBe('This has content');
    });

    it('should preserve elements with images', () => {
      container.innerHTML = `
        <div>
          <img src="photo.jpg">
        </div>
        <div></div>
      `;

      const removed = removeEmptyElements(container, config);

      expect(removed).toBe(1); // Only the empty div
      expect(container.querySelector('img')).not.toBeNull();
    });

    it('should handle empty lists', () => {
      container.innerHTML = `
        <ul>
          <li></li>
          <li>Item 1</li>
          <li></li>
        </ul>
      `;

      const removed = removeEmptyElements(container, config);

      expect(removed).toBe(2);
      expect(container.querySelectorAll('li').length).toBe(1);
    });

    it('should not remove the container itself', () => {
      container.innerHTML = '';

      const removed = removeEmptyElements(container, config);

      expect(removed).toBe(0);
      expect(container).toBeDefined();
    });

    it('should handle deeply nested structures', () => {
      container.innerHTML = `
        <section>
          <article>
            <div>Content here</div>
            <aside>
              <div>
                <span></span>
              </div>
            </aside>
          </article>
        </section>
      `;

      const removed = removeEmptyElements(container, config);

      // span, inner div, aside should all be removed
      expect(removed).toBe(3);
      expect(container.querySelector('aside')).toBeNull();
      expect(container.textContent?.trim()).toBe('Content here');
    });
  });

  describe('cleanupWhitespace', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
    });

    it('should collapse multiple consecutive <br> tags', () => {
      container.innerHTML = 'Line 1<br><br><br><br>Line 2';

      cleanupWhitespace(container);

      expect(container.innerHTML).toBe('Line 1<br><br>Line 2');
    });

    it('should collapse multiple <hr> tags', () => {
      container.innerHTML = 'Content<hr><hr><hr>More content';

      cleanupWhitespace(container);

      expect(container.innerHTML).toBe('Content<hr>More content');
    });

    it('should remove <br> at start of block elements', () => {
      container.innerHTML = '<div><br>Content</div>';

      cleanupWhitespace(container);

      expect(container.innerHTML).toBe('<div>Content</div>');
    });

    it('should remove <br> at end of block elements', () => {
      container.innerHTML = '<div>Content<br></div>';

      cleanupWhitespace(container);

      expect(container.innerHTML).toBe('<div>Content</div>');
    });

    it('should remove <br> before block elements', () => {
      container.innerHTML = 'Text<br><br><div>Block</div>';

      cleanupWhitespace(container);

      expect(container.innerHTML).toBe('Text<div>Block</div>');
    });

    it('should remove <br> after block elements', () => {
      container.innerHTML = '<div>Block</div><br><br>Text';

      cleanupWhitespace(container);

      expect(container.innerHTML).toBe('<div>Block</div>Text');
    });

    it('should preserve legitimate <br> tags', () => {
      container.innerHTML = 'Line 1<br>Line 2<br>Line 3';

      cleanupWhitespace(container);

      expect(container.innerHTML).toBe('Line 1<br>Line 2<br>Line 3');
    });

    it('should preserve two consecutive <br> tags', () => {
      container.innerHTML = 'Line 1<br><br>Line 2';

      cleanupWhitespace(container);

      expect(container.innerHTML).toBe('Line 1<br><br>Line 2');
    });

    it('should handle self-closing <br/> tags', () => {
      container.innerHTML = 'Line 1<br/><br/><br/><br/>Line 2';

      cleanupWhitespace(container);

      expect(container.innerHTML).toBe('Line 1<br><br>Line 2');
    });
  });
});
