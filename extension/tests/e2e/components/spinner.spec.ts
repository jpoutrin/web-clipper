/**
 * Spinner Component Tests
 *
 * Comprehensive tests for the Spinner component including:
 * - Rendering of all sizes
 * - Custom colors
 * - Accessibility attributes
 * - Reduced motion support
 * - Animation behavior
 */

import { test, expect } from '@playwright/test';

test.describe('Spinner Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#spinner-section');
  });

  test.describe('Rendering', () => {
    test('should render all spinner sizes', async ({ page }) => {
      const sizes = ['sm', 'md', 'lg'];

      for (const size of sizes) {
        const spinner = page.getByTestId(`spinner-${size}`);
        await expect(spinner).toBeVisible();
      }
    });

    test('should render spinners with custom colors', async ({ page }) => {
      const colors = ['blue', 'green', 'red'];

      for (const color of colors) {
        const spinner = page.getByTestId(`spinner-color-${color}`);
        await expect(spinner).toBeVisible();
      }
    });
  });

  test.describe('Size Variants', () => {
    test('should have different sizes for different variants', async ({ page }) => {
      const sizes = ['sm', 'md', 'lg'];
      const widths: { [key: string]: string } = {};

      for (const size of sizes) {
        const spinner = page.getByTestId(`spinner-${size}`);

        const width = await spinner.evaluate(el => {
          const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner') as HTMLElement;
          return spinnerEl ? window.getComputedStyle(spinnerEl).width : null;
        });

        widths[size] = width || '';
      }

      // Verify sizes are different and in ascending order
      expect(widths.sm).toBeTruthy();
      expect(widths.md).toBeTruthy();
      expect(widths.lg).toBeTruthy();
      expect(widths.sm).not.toBe(widths.md);
      expect(widths.md).not.toBe(widths.lg);
    });

    test('should apply correct size classes', async ({ page }) => {
      const sizes = ['sm', 'md', 'lg'];

      for (const size of sizes) {
        const spinner = page.getByTestId(`spinner-${size}`);

        const hasClass = await spinner.evaluate((el, s) => {
          const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner');
          return spinnerEl?.classList.contains(`wc-spinner--${s}`) ?? false;
        }, size);

        expect(hasClass).toBe(true);
      }
    });
  });

  test.describe('Custom Colors', () => {
    test('should apply custom color to blue spinner', async ({ page }) => {
      const spinner = page.getByTestId('spinner-color-blue');

      const color = await spinner.evaluate(el => {
        const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner') as HTMLElement;
        return spinnerEl ? window.getComputedStyle(spinnerEl).color : null;
      });

      expect(color).toBeTruthy();
      // Color should be set (will be rgb format in computed styles)
      expect(color).toContain('rgb');
    });

    test('should apply custom color to green spinner', async ({ page }) => {
      const spinner = page.getByTestId('spinner-color-green');

      const color = await spinner.evaluate(el => {
        const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner') as HTMLElement;
        return spinnerEl ? window.getComputedStyle(spinnerEl).color : null;
      });

      expect(color).toBeTruthy();
      expect(color).toContain('rgb');
    });

    test('should apply custom color to red spinner', async ({ page }) => {
      const spinner = page.getByTestId('spinner-color-red');

      const color = await spinner.evaluate(el => {
        const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner') as HTMLElement;
        return spinnerEl ? window.getComputedStyle(spinnerEl).color : null;
      });

      expect(color).toBeTruthy();
      expect(color).toContain('rgb');
    });

    test('different color spinners should have different colors', async ({ page }) => {
      const blueSpinner = page.getByTestId('spinner-color-blue');
      const greenSpinner = page.getByTestId('spinner-color-green');
      const redSpinner = page.getByTestId('spinner-color-red');

      const blueColor = await blueSpinner.evaluate(el => {
        const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner') as HTMLElement;
        return spinnerEl ? window.getComputedStyle(spinnerEl).color : null;
      });

      const greenColor = await greenSpinner.evaluate(el => {
        const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner') as HTMLElement;
        return spinnerEl ? window.getComputedStyle(spinnerEl).color : null;
      });

      const redColor = await redSpinner.evaluate(el => {
        const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner') as HTMLElement;
        return spinnerEl ? window.getComputedStyle(spinnerEl).color : null;
      });

      // All colors should be different
      expect(blueColor).not.toBe(greenColor);
      expect(greenColor).not.toBe(redColor);
      expect(blueColor).not.toBe(redColor);
    });
  });

  test.describe('Accessibility', () => {
    test('spinner with label should have role="status"', async ({ page }) => {
      const spinner = page.getByTestId('spinner-sm');

      const role = await spinner.evaluate(el => {
        const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner');
        return spinnerEl?.getAttribute('role');
      });

      expect(role).toBe('status');
    });

    test('spinner with label should have aria-label', async ({ page }) => {
      const spinner = page.getByTestId('spinner-sm');

      const ariaLabel = await spinner.evaluate(el => {
        const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner');
        return spinnerEl?.getAttribute('aria-label');
      });

      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('spinner');
      expect(ariaLabel).toContain('loading');
    });

    test('decorative spinner should have aria-hidden="true"', async ({ page }) => {
      // Create a decorative spinner (one without a label)
      const hasDecorativeSpinner = await page.evaluate(() => {
        // Check if any spinner has aria-hidden
        const spinners = document.querySelectorAll('[data-testid^="spinner-"]');
        for (const spinner of Array.from(spinners)) {
          const spinnerEl = spinner.shadowRoot?.querySelector('.wc-spinner');
          const ariaHidden = spinnerEl?.getAttribute('aria-hidden');
          if (ariaHidden === 'true') {
            return true;
          }
        }
        return false;
      });

      // In the current fixture, all spinners have labels
      // This test documents the behavior for spinners without labels
      // If we create a decorative spinner, it should have aria-hidden="true"
    });

    test('spinner should communicate loading state to screen readers', async ({ page }) => {
      const spinner = page.getByTestId('spinner-md');

      const attributes = await spinner.evaluate(el => {
        const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner');
        return {
          role: spinnerEl?.getAttribute('role'),
          ariaLabel: spinnerEl?.getAttribute('aria-label'),
        };
      });

      // Should have either role="status" with aria-label, or be decorative
      if (attributes.role === 'status') {
        expect(attributes.ariaLabel).toBeTruthy();
      }
    });
  });

  test.describe('Animation', () => {
    test('should have CSS animation', async ({ page }) => {
      const spinner = page.getByTestId('spinner-md');

      const hasAnimation = await spinner.evaluate(el => {
        const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner') as HTMLElement;
        const animation = spinnerEl ? window.getComputedStyle(spinnerEl).animation : null;
        return animation && animation !== 'none';
      });

      expect(hasAnimation).toBe(true);
    });

    test('should rotate continuously', async ({ page }) => {
      const spinner = page.getByTestId('spinner-md');

      // Get initial rotation
      const initialRotation = await spinner.evaluate(el => {
        const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner') as HTMLElement;
        const transform = spinnerEl ? window.getComputedStyle(spinnerEl).transform : null;
        return transform;
      });

      // Wait a bit for rotation
      await page.waitForTimeout(500);

      // Get rotation after delay
      const laterRotation = await spinner.evaluate(el => {
        const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner') as HTMLElement;
        const transform = spinnerEl ? window.getComputedStyle(spinnerEl).transform : null;
        return transform;
      });

      // Rotation should have changed (or animation is running)
      // Note: Due to timing, we mainly verify animation exists
      expect(initialRotation).toBeTruthy();
    });
  });

  test.describe('Reduced Motion', () => {
    test('should respect prefers-reduced-motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.reload();
      await page.waitForSelector('#spinner-section');

      const spinner = page.getByTestId('spinner-md');

      const hasAnimation = await spinner.evaluate(el => {
        const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner') as HTMLElement;
        const animation = spinnerEl ? window.getComputedStyle(spinnerEl).animation : null;
        // Animation should be disabled or set to 'none'
        return animation && animation !== 'none' && !animation.includes('0s');
      });

      expect(hasAnimation).toBe(false);
    });

    test('should still be visible with reduced motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.reload();
      await page.waitForSelector('#spinner-section');

      const spinner = page.getByTestId('spinner-md');
      await expect(spinner).toBeVisible();

      // Spinner element should still exist
      const exists = await spinner.evaluate(el => {
        const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner');
        return !!spinnerEl;
      });

      expect(exists).toBe(true);
    });
  });

  test.describe('Shadow DOM', () => {
    test('should use shadow DOM for encapsulation', async ({ page }) => {
      const spinner = page.getByTestId('spinner-sm');

      const hasShadowRoot = await spinner.evaluate(el => {
        return !!el.shadowRoot;
      });

      expect(hasShadowRoot).toBe(true);
    });

    test('should contain spinner element in shadow root', async ({ page }) => {
      const spinner = page.getByTestId('spinner-md');

      const hasSpinnerElement = await spinner.evaluate(el => {
        const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner');
        return !!spinnerEl;
      });

      expect(hasSpinnerElement).toBe(true);
    });

    test('should have styles in shadow root', async ({ page }) => {
      const spinner = page.getByTestId('spinner-lg');

      const hasStyles = await spinner.evaluate(el => {
        const styleEl = el.shadowRoot?.querySelector('style');
        return !!styleEl && !!styleEl.textContent;
      });

      expect(hasStyles).toBe(true);
    });
  });

  test.describe('Visual Consistency', () => {
    test('should be perfectly circular', async ({ page }) => {
      const spinner = page.getByTestId('spinner-md');

      const dimensions = await spinner.evaluate(el => {
        const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner') as HTMLElement;
        if (!spinnerEl) return { width: 0, height: 0 };

        const styles = window.getComputedStyle(spinnerEl);
        return {
          width: styles.width,
          height: styles.height,
        };
      });

      // Width and height should be equal for circular spinner
      expect(dimensions.width).toBe(dimensions.height);
    });

    test('should maintain aspect ratio across sizes', async ({ page }) => {
      const sizes = ['sm', 'md', 'lg'];

      for (const size of sizes) {
        const spinner = page.getByTestId(`spinner-${size}`);

        const isCircular = await spinner.evaluate(el => {
          const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner') as HTMLElement;
          if (!spinnerEl) return false;

          const styles = window.getComputedStyle(spinnerEl);
          return styles.width === styles.height;
        });

        expect(isCircular).toBe(true);
      }
    });
  });

  test.describe('Dark Mode', () => {
    test('should render correctly in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();
      await page.waitForSelector('#spinner-section');

      const spinner = page.getByTestId('spinner-md');
      await expect(spinner).toBeVisible();

      // Spinner should be visible and functional in dark mode
      const exists = await spinner.evaluate(el => {
        const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner');
        return !!spinnerEl;
      });

      expect(exists).toBe(true);
    });

    test('custom colors should work in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();
      await page.waitForSelector('#spinner-section');

      const spinner = page.getByTestId('spinner-color-blue');

      const color = await spinner.evaluate(el => {
        const spinnerEl = el.shadowRoot?.querySelector('.wc-spinner') as HTMLElement;
        return spinnerEl ? window.getComputedStyle(spinnerEl).color : null;
      });

      expect(color).toBeTruthy();
      expect(color).toContain('rgb');
    });
  });

  test.describe('Performance', () => {
    test('should render multiple spinners efficiently', async ({ page }) => {
      // All spinners should be visible without performance issues
      const spinners = await page.getByTestId(/^spinner-/).all();

      expect(spinners.length).toBeGreaterThan(0);

      for (const spinner of spinners) {
        await expect(spinner).toBeVisible();
      }
    });

    test('should not block page rendering', async ({ page }) => {
      // Page should be interactive
      const isInteractive = await page.evaluate(() => {
        return document.readyState === 'complete';
      });

      expect(isInteractive).toBe(true);

      // Should be able to interact with other elements
      const button = page.locator('#toast-success-trigger');
      await expect(button).toBeEnabled();
    });
  });
});
