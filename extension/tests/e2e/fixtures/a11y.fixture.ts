/**
 * Accessibility Testing Fixtures
 *
 * Provides reusable fixtures for axe-core integration and accessibility testing utilities.
 */

import { test as base, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility test context with axe-core integration
 */
type A11yFixtures = {
  /**
   * Creates a configured AxeBuilder instance for the current page
   * Pre-configured with WCAG 2.1 Level A and AA tags
   */
  makeAxeBuilder: () => AxeBuilder;

  /**
   * Runs a comprehensive accessibility scan on the current page or element
   * @param selector - Optional CSS selector to scan specific element
   * @returns Promise resolving to axe results
   */
  runA11yScan: (selector?: string) => Promise<AxeResults>;

  /**
   * Tests keyboard navigation between focusable elements
   * @returns Promise resolving to array of focused element information
   */
  testKeyboardNav: () => Promise<FocusedElement[]>;

  /**
   * Tests that focus is visible on all interactive elements
   */
  testFocusVisible: () => Promise<void>;

  /**
   * Announces text content to test screen reader announcements
   */
  getAriaLiveAnnouncements: () => Promise<string[]>;
};

/**
 * AxeBuilder results type
 */
type AxeResults = {
  violations: Array<{
    id: string;
    impact: string;
    description: string;
    help: string;
    helpUrl: string;
    nodes: Array<{
      html: string;
      target: string[];
    }>;
  }>;
  incomplete: Array<unknown>;
  passes: Array<unknown>;
};

/**
 * Focused element information
 */
type FocusedElement = {
  tagName: string;
  id: string;
  ariaLabel: string | null;
  role: string | null;
};

/**
 * Extended test with accessibility fixtures
 */
export const test = base.extend<A11yFixtures>({
  /**
   * Creates a configured AxeBuilder with WCAG 2.1 AA standards
   */
  makeAxeBuilder: async ({ page }, use) => {
    const makeAxeBuilder = () =>
      new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('#webpack-dev-server-client-overlay'); // Exclude dev tools

    await use(makeAxeBuilder);
  },

  /**
   * Runs accessibility scan with optional element targeting
   */
  runA11yScan: async ({ page, makeAxeBuilder }, use) => {
    const runA11yScan = async (selector?: string) => {
      const builder = makeAxeBuilder();

      if (selector) {
        builder.include(selector);
      }

      const results = await builder.analyze();
      return results as AxeResults;
    };

    await use(runA11yScan);
  },

  /**
   * Tests keyboard navigation through focusable elements
   */
  testKeyboardNav: async ({ page }, use) => {
    const testKeyboardNav = async (): Promise<FocusedElement[]> => {
      const focusedElements: FocusedElement[] = [];

      // Find all focusable elements
      const focusableCount = await page.evaluate(() => {
        const focusable = document.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        return focusable.length;
      });

      // Tab through all elements
      for (let i = 0; i < focusableCount; i++) {
        await page.keyboard.press('Tab');

        const focused = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return null;

          return {
            tagName: el.tagName,
            id: el.id || '',
            ariaLabel: el.getAttribute('aria-label'),
            role: el.getAttribute('role'),
          };
        });

        if (focused) {
          focusedElements.push(focused);
        }
      }

      return focusedElements;
    };

    await use(testKeyboardNav);
  },

  /**
   * Tests that focus indicators are visible
   */
  testFocusVisible: async ({ page }, use) => {
    const testFocusVisible = async () => {
      // Get all interactive elements
      const elements = await page.locator(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const count = await elements.count();

      for (let i = 0; i < count; i++) {
        const element = elements.nth(i);

        // Focus the element
        await element.focus();

        // Check if focus is visible via outline or box-shadow
        const hasFocusIndicator = await element.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          const outline = styles.getPropertyValue('outline');
          const boxShadow = styles.getPropertyValue('box-shadow');

          // Check if outline is not 'none' or box-shadow exists
          return (
            (outline && outline !== 'none' && outline !== '0px none rgb(0, 0, 0)') ||
            (boxShadow && boxShadow !== 'none')
          );
        });

        if (!hasFocusIndicator) {
          const info = await element.evaluate((el) => ({
            tag: el.tagName,
            id: el.id,
            class: el.className,
          }));
          throw new Error(
            `Element without visible focus indicator: ${info.tag}${info.id ? '#' + info.id : ''}${
              info.class ? '.' + info.class : ''
            }`
          );
        }
      }
    };

    await use(testFocusVisible);
  },

  /**
   * Captures ARIA live region announcements
   */
  getAriaLiveAnnouncements: async ({ page }, use) => {
    const getAriaLiveAnnouncements = async (): Promise<string[]> => {
      const announcements = await page.evaluate(() => {
        const liveRegions = document.querySelectorAll('[aria-live], [role="status"], [role="alert"]');
        return Array.from(liveRegions).map((region) => region.textContent?.trim() || '');
      });

      return announcements.filter((text) => text.length > 0);
    };

    await use(getAriaLiveAnnouncements);
  },
});

export { expect } from '@playwright/test';
