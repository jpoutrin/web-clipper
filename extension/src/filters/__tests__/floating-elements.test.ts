/**
 * Tests for floating element detection functionality.
 */

import {
  filterFloatingElement,
  applyFloatingFilter,
  isFloated,
  isFloatableElement,
} from '../floating-elements';
import { FilterConfig, FilterResult } from '../types';
import { DEFAULT_FILTER_CONFIG } from '../index';

describe('Floating Element Filter', () => {
  let config: FilterConfig;

  beforeEach(() => {
    config = { ...DEFAULT_FILTER_CONFIG, floatingMinText: 200 };
  });

  describe('isFloatableElement', () => {
    it('should identify div as floatable', () => {
      const div = document.createElement('div');
      expect(isFloatableElement(div)).toBe(true);
    });

    it('should identify aside as floatable', () => {
      const aside = document.createElement('aside');
      expect(isFloatableElement(aside)).toBe(true);
    });

    it('should identify figure as floatable', () => {
      const figure = document.createElement('figure');
      expect(isFloatableElement(figure)).toBe(true);
    });

    it('should identify table as floatable', () => {
      const table = document.createElement('table');
      expect(isFloatableElement(table)).toBe(true);
    });

    it('should identify section as floatable', () => {
      const section = document.createElement('section');
      expect(isFloatableElement(section)).toBe(true);
    });

    it('should not identify p as floatable', () => {
      const p = document.createElement('p');
      expect(isFloatableElement(p)).toBe(false);
    });

    it('should not identify span as floatable', () => {
      const span = document.createElement('span');
      expect(isFloatableElement(span)).toBe(false);
    });

    it('should not identify article as floatable', () => {
      const article = document.createElement('article');
      expect(isFloatableElement(article)).toBe(false);
    });
  });

  describe('isFloated', () => {
    it('should detect float:left', () => {
      const div = document.createElement('div');
      div.style.cssFloat = 'left';
      document.body.appendChild(div);

      expect(isFloated(div)).toBe(true);

      document.body.removeChild(div);
    });

    it('should detect float:right', () => {
      const div = document.createElement('div');
      div.style.cssFloat = 'right';
      document.body.appendChild(div);

      expect(isFloated(div)).toBe(true);

      document.body.removeChild(div);
    });

    it('should return false for non-floated elements', () => {
      const div = document.createElement('div');
      document.body.appendChild(div);

      expect(isFloated(div)).toBe(false);

      document.body.removeChild(div);
    });

    it('should return false for float:none', () => {
      const div = document.createElement('div');
      div.style.cssFloat = 'none';
      document.body.appendChild(div);

      expect(isFloated(div)).toBe(false);

      document.body.removeChild(div);
    });
  });

  describe('filterFloatingElement', () => {
    it('should not remove non-floatable elements', () => {
      const p = document.createElement('p');
      p.style.cssFloat = 'left';
      document.body.appendChild(p);

      const result = filterFloatingElement(p, config);
      expect(result.shouldRemove).toBe(false);

      document.body.removeChild(p);
    });

    it('should not remove non-floated elements', () => {
      const div = document.createElement('div');
      div.textContent = 'Short text';
      document.body.appendChild(div);

      const result = filterFloatingElement(div, config);
      expect(result.shouldRemove).toBe(false);

      document.body.removeChild(div);
    });

    it('should remove floated div with little content', () => {
      const div = document.createElement('div');
      div.style.cssFloat = 'left';
      div.textContent = 'Short text'; // Less than 200 chars
      document.body.appendChild(div);

      const result = filterFloatingElement(div, config);
      expect(result.shouldRemove).toBe(true);
      expect(result.filter).toBe('floating');

      document.body.removeChild(div);
    });

    it('should keep floated div with substantial content', () => {
      const div = document.createElement('div');
      div.style.cssFloat = 'left';
      div.textContent = 'A'.repeat(250); // More than 200 chars
      document.body.appendChild(div);

      const result = filterFloatingElement(div, config);
      expect(result.shouldRemove).toBe(false);

      document.body.removeChild(div);
    });

    it('should keep floated element with large image', () => {
      const div = document.createElement('div');
      div.style.cssFloat = 'right';
      div.innerHTML = '<img width="400" height="300" src="photo.jpg">';
      document.body.appendChild(div);

      const result = filterFloatingElement(div, config);
      expect(result.shouldRemove).toBe(false);

      document.body.removeChild(div);
    });

    it('should keep floated element with medium image and no link text', () => {
      const div = document.createElement('div');
      div.style.cssFloat = 'left';
      div.innerHTML = '<img width="150" height="150" src="photo.jpg">';
      document.body.appendChild(div);

      const result = filterFloatingElement(div, config);
      expect(result.shouldRemove).toBe(false);

      document.body.removeChild(div);
    });

    it('should keep floated aside with heading and some text', () => {
      const aside = document.createElement('aside');
      aside.style.cssFloat = 'right';
      aside.innerHTML = '<h3>Related</h3><p>Some related content that is longer than fifty characters here</p>';
      document.body.appendChild(aside);

      const result = filterFloatingElement(aside, config);
      expect(result.shouldRemove).toBe(false);

      document.body.removeChild(aside);
    });
  });

  describe('applyFloatingFilter', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    it('should remove floated sidebar with little content', () => {
      container.innerHTML = `
        <div style="float: left;">Short sidebar</div>
        <div>Main content with substantial text that should be preserved.</div>
      `;

      const removed = applyFloatingFilter(container, config);

      expect(removed).toBe(1);
      expect(container.querySelectorAll('div').length).toBe(1);
    });

    it('should preserve all non-floated elements', () => {
      container.innerHTML = `
        <div>Content 1</div>
        <aside>Sidebar content</aside>
        <div>Content 2</div>
      `;

      const removed = applyFloatingFilter(container, config);

      expect(removed).toBe(0);
      expect(container.querySelectorAll('div').length).toBe(2);
      expect(container.querySelector('aside')).not.toBeNull();
    });

    it('should handle multiple floated elements', () => {
      container.innerHTML = `
        <div style="float: left;">Left sidebar</div>
        <div style="float: right;">Right sidebar</div>
        <div>Main content area</div>
      `;

      const removed = applyFloatingFilter(container, config);

      expect(removed).toBe(2);
      expect(container.querySelectorAll('div').length).toBe(1);
    });

    it('should preserve floated elements with substantial content', () => {
      const longText = 'This is substantial content. '.repeat(15);
      container.innerHTML = `
        <aside style="float: left;">${longText}</aside>
        <div>Main content</div>
      `;

      const removed = applyFloatingFilter(container, config);

      expect(removed).toBe(0);
      expect(container.querySelector('aside')).not.toBeNull();
    });
  });
});
