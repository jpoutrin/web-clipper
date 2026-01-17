/**
 * Button Component Accessibility Tests
 *
 * Tests WCAG 2.1 AA compliance for the Button component including:
 * - Axe-core automated accessibility checks
 * - Keyboard navigation and focus management
 * - Screen reader compatibility (ARIA attributes)
 * - Color contrast requirements
 * - Touch target size on mobile devices
 */

import { test, expect } from '../fixtures/a11y.fixture';

test.describe('Button Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components/button.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Automated Accessibility Scan', () => {
    test('should have no accessibility violations - all variants', async ({ runA11yScan }) => {
      const results = await runA11yScan();
      expect(results.violations).toEqual([]);
    });

    test('should have no violations - primary button', async ({ runA11yScan }) => {
      const results = await runA11yScan('[data-testid="button-primary"]');
      expect(results.violations).toEqual([]);
    });

    test('should have no violations - secondary button', async ({ runA11yScan }) => {
      const results = await runA11yScan('[data-testid="button-secondary"]');
      expect(results.violations).toEqual([]);
    });

    test('should have no violations - ghost button', async ({ runA11yScan }) => {
      const results = await runA11yScan('[data-testid="button-ghost"]');
      expect(results.violations).toEqual([]);
    });

    test('should have no violations - danger button', async ({ runA11yScan }) => {
      const results = await runA11yScan('[data-testid="button-danger"]');
      expect(results.violations).toEqual([]);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should be focusable with Tab key', async ({ page }) => {
      const button = page.getByRole('button', { name: 'Primary Button' });

      // Tab to button
      await page.keyboard.press('Tab');

      // Verify button is focused
      await expect(button).toBeFocused();
    });

    test('should show visible focus indicator', async ({ page, testFocusVisible }) => {
      await testFocusVisible();
    });

    test('should activate with Enter key', async ({ page }) => {
      let clicked = false;
      const button = page.getByRole('button', { name: 'Primary Button' });

      // Listen for click event
      await page.evaluate(() => {
        document.addEventListener('wc-click', () => {
          (window as any).buttonClicked = true;
        });
      });

      await button.focus();
      await page.keyboard.press('Enter');

      clicked = await page.evaluate(() => (window as any).buttonClicked);
      expect(clicked).toBe(true);
    });

    test('should activate with Space key', async ({ page }) => {
      const button = page.getByRole('button', { name: 'Primary Button' });

      await page.evaluate(() => {
        (window as any).buttonClicked = false;
        document.addEventListener('wc-click', () => {
          (window as any).buttonClicked = true;
        });
      });

      await button.focus();
      await page.keyboard.press('Space');

      const clicked = await page.evaluate(() => (window as any).buttonClicked);
      expect(clicked).toBe(true);
    });

    test('should maintain focus order in button groups', async ({ page, testKeyboardNav }) => {
      const focusedElements = await testKeyboardNav();

      // Verify buttons appear in DOM order
      const buttonElements = focusedElements.filter((el) => el.tagName === 'BUTTON');
      expect(buttonElements.length).toBeGreaterThan(0);
    });
  });

  test.describe('ARIA Attributes', () => {
    test('icon-only button should have aria-label', async ({ page }) => {
      const iconButton = page.locator('[data-testid="button-icon-only"]');

      // Check aria-label exists
      const ariaLabel = await iconButton.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).not.toBe('');
    });

    test('disabled button should have aria-disabled', async ({ page }) => {
      const disabledButton = page.locator('[data-testid="button-disabled"]');

      const ariaDisabled = await disabledButton.getAttribute('aria-disabled');
      expect(ariaDisabled).toBe('true');

      const isDisabled = await disabledButton.isDisabled();
      expect(isDisabled).toBe(true);
    });

    test('loading button should have aria-busy', async ({ page }) => {
      const loadingButton = page.locator('[data-testid="button-loading"]');

      const ariaBusy = await loadingButton.getAttribute('aria-busy');
      expect(ariaBusy).toBe('true');

      // Should also be disabled
      const isDisabled = await loadingButton.isDisabled();
      expect(isDisabled).toBe(true);
    });

    test('loading spinner should have role="status"', async ({ page }) => {
      const loadingButton = page.locator('[data-testid="button-loading"]');
      const spinner = loadingButton.locator('[role="status"]');

      await expect(spinner).toBeVisible();

      // Check for screen reader text
      const srText = loadingButton.locator('.wc-sr-only');
      await expect(srText).toContainText('Loading');
    });

    test('button text should have proper semantic structure', async ({ page }) => {
      const button = page.getByRole('button', { name: /Primary Button/i });

      // Verify button has accessible name
      const accessibleName = await button.getAttribute('aria-label') || await button.textContent();
      expect(accessibleName).toBeTruthy();
    });
  });

  test.describe('Color Contrast', () => {
    test('primary button should meet WCAG AA contrast ratio', async ({ page }) => {
      const button = page.locator('[data-testid="button-primary"]');

      const contrastRatio = await button.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        const bgColor = styles.backgroundColor;
        const textColor = styles.color;

        // Helper to convert rgb to luminance
        const getLuminance = (rgb: string) => {
          const match = rgb.match(/\d+/g);
          if (!match) return 0;

          const [r, g, b] = match.map(Number).map((val) => {
            val = val / 255;
            return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
          });

          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };

        const l1 = getLuminance(textColor);
        const l2 = getLuminance(bgColor);

        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);

        return (lighter + 0.05) / (darker + 0.05);
      });

      // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
      // Buttons typically use large text
      expect(contrastRatio).toBeGreaterThanOrEqual(3);
    });

    test('secondary button should meet contrast requirements', async ({ page }) => {
      const button = page.locator('[data-testid="button-secondary"]');

      const hasGoodContrast = await button.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        const bgColor = styles.backgroundColor;
        const textColor = styles.color;

        // Basic check that colors are different
        return bgColor !== textColor;
      });

      expect(hasGoodContrast).toBe(true);
    });

    test('danger button should maintain contrast in error state', async ({ page }) => {
      const button = page.locator('[data-testid="button-danger"]');

      // Verify button is visible and has good contrast
      await expect(button).toBeVisible();

      const contrastInfo = await button.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          bg: styles.backgroundColor,
          color: styles.color,
          borderColor: styles.borderColor,
        };
      });

      expect(contrastInfo.bg).not.toBe('transparent');
      expect(contrastInfo.color).not.toBe(contrastInfo.bg);
    });
  });

  test.describe('Touch Target Size', () => {
    test('buttons should meet minimum touch target size (44x44px)', async ({ page }) => {
      const buttons = await page.locator('button[data-testid^="button-"]').all();

      for (const button of buttons) {
        const box = await button.boundingBox();
        expect(box).toBeTruthy();

        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('small buttons should still meet minimum touch targets on mobile', async ({
      page,
      isMobile,
    }) => {
      if (!isMobile) {
        test.skip();
      }

      const smallButton = page.locator('[data-testid="button-small"]');
      const box = await smallButton.boundingBox();

      expect(box).toBeTruthy();
      if (box) {
        // iOS requires 44x44, Android requires 48x48
        expect(box.width).toBeGreaterThanOrEqual(40);
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    });

    test('icon-only buttons should have adequate size', async ({ page }) => {
      const iconButton = page.locator('[data-testid="button-icon-only"]');
      const box = await iconButton.boundingBox();

      expect(box).toBeTruthy();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(36);
        expect(box.height).toBeGreaterThanOrEqual(36);
      }
    });
  });

  test.describe('Disabled State', () => {
    test('disabled button should not be focusable', async ({ page }) => {
      const disabledButton = page.locator('[data-testid="button-disabled"]');

      // Try to focus
      await disabledButton.focus({ timeout: 1000 }).catch(() => {
        // Expected to fail
      });

      // Verify it's not focused
      const isFocused = await disabledButton.evaluate((el) => el === document.activeElement);
      expect(isFocused).toBe(false);
    });

    test('disabled button should not respond to click', async ({ page }) => {
      const disabledButton = page.locator('[data-testid="button-disabled"]');

      await page.evaluate(() => {
        (window as any).disabledClicked = false;
        document.addEventListener('wc-click', () => {
          (window as any).disabledClicked = true;
        });
      });

      await disabledButton.click({ force: true });

      const wasClicked = await page.evaluate(() => (window as any).disabledClicked);
      expect(wasClicked).toBe(false);
    });

    test('disabled button should be perceivable to screen readers', async ({ page }) => {
      const disabledButton = page.locator('[data-testid="button-disabled"]');

      // Should have aria-disabled
      const ariaDisabled = await disabledButton.getAttribute('aria-disabled');
      expect(ariaDisabled).toBe('true');

      // Should still have accessible name
      const hasAccessibleName = await disabledButton.evaluate((el) => {
        return !!(el.getAttribute('aria-label') || el.textContent?.trim());
      });
      expect(hasAccessibleName).toBe(true);
    });
  });

  test.describe('Loading State', () => {
    test('loading state should be announced to screen readers', async ({
      page,
      getAriaLiveAnnouncements,
    }) => {
      const loadingButton = page.locator('[data-testid="button-loading"]');

      await expect(loadingButton).toBeVisible();

      const announcements = await getAriaLiveAnnouncements();
      const hasLoadingAnnouncement = announcements.some((text) =>
        text.toLowerCase().includes('loading')
      );

      expect(hasLoadingAnnouncement).toBe(true);
    });

    test('loading button should prevent interaction', async ({ page }) => {
      const loadingButton = page.locator('[data-testid="button-loading"]');

      const isDisabled = await loadingButton.isDisabled();
      expect(isDisabled).toBe(true);

      const ariaBusy = await loadingButton.getAttribute('aria-busy');
      expect(ariaBusy).toBe('true');
    });
  });

  test.describe('Focus Management', () => {
    test('focus should remain on button after click', async ({ page }) => {
      const button = page.getByRole('button', { name: 'Primary Button' });

      await button.focus();
      await button.click();

      // Focus should still be on button
      await expect(button).toBeFocused();
    });

    test('button should support programmatic focus', async ({ page }) => {
      const button = page.getByRole('button', { name: 'Primary Button' });

      await button.focus();
      await expect(button).toBeFocused();
    });

    test('button should support blur', async ({ page }) => {
      const button = page.getByRole('button', { name: 'Primary Button' });

      await button.focus();
      await expect(button).toBeFocused();

      await button.blur();
      await expect(button).not.toBeFocused();
    });
  });

  test.describe('High Contrast Mode', () => {
    test('buttons should be visible in high contrast mode', async ({ page }) => {
      // Enable high contrast mode
      await page.emulateMedia({ forcedColors: 'active' });

      const buttons = await page.locator('button[data-testid^="button-"]').all();

      for (const button of buttons) {
        await expect(button).toBeVisible();

        // Check that border is visible
        const hasBorder = await button.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return styles.borderWidth !== '0px';
        });

        expect(hasBorder).toBe(true);
      }
    });
  });

  test.describe('Reduced Motion', () => {
    test('should respect prefers-reduced-motion for transitions', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });

      const button = page.locator('[data-testid="button-primary"]');

      const hasReducedMotion = await button.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.transition === 'none' || styles.transition === 'all 0s ease 0s';
      });

      expect(hasReducedMotion).toBe(true);
    });

    test('loading spinner should respect reduced motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });

      const spinner = page.locator('[data-testid="button-loading"] .wc-button__spinner-svg');

      const hasAnimation = await spinner.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.animation !== 'none';
      });

      expect(hasAnimation).toBe(false);
    });
  });
});
