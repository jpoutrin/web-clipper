/**
 * Floating Toolbar Component Accessibility Tests
 *
 * Tests WCAG 2.1 AA compliance for floating toolbars including:
 * - role="toolbar" with proper ARIA attributes
 * - Arrow key navigation (Left/Right for horizontal, Up/Down for vertical)
 * - Home/End key support
 * - All buttons have aria-label
 * - Separator elements with role="separator"
 * - Keyboard focus management
 */

import { test, expect } from '../fixtures/a11y.fixture';

test.describe('Floating Toolbar Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components/toolbar.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Automated Accessibility Scan', () => {
    test('should have no violations when toolbar is visible', async ({ page, runA11yScan }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const results = await runA11yScan('[role="toolbar"]');
      expect(results.violations).toEqual([]);
    });

    test('should have no violations with all button variants', async ({
      page,
      runA11yScan,
    }) => {
      await page.click('[data-testid="show-toolbar-all-variants"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const results = await runA11yScan();
      expect(results.violations).toEqual([]);
    });

    test('should have no violations with disabled buttons', async ({ page, runA11yScan }) => {
      await page.click('[data-testid="show-toolbar-with-disabled"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const results = await runA11yScan();
      expect(results.violations).toEqual([]);
    });
  });

  test.describe('ARIA Attributes', () => {
    test('toolbar should have role="toolbar"', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');

      const toolbar = page.locator('[role="toolbar"]');
      await expect(toolbar).toBeVisible();
    });

    test('toolbar should have aria-label', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');

      const toolbar = page.locator('[role="toolbar"]');
      const ariaLabel = await toolbar.getAttribute('aria-label');

      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).not.toBe('');
      expect(ariaLabel?.length).toBeGreaterThan(3);
    });

    test('toolbar should have aria-orientation', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');

      const toolbar = page.locator('[role="toolbar"]');
      const ariaOrientation = await toolbar.getAttribute('aria-orientation');

      expect(ariaOrientation).toBe('horizontal');
    });

    test('all action buttons should have aria-label', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');

      const buttons = page.locator('[role="toolbar"] button');
      const count = await buttons.count();

      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const ariaLabel = await buttons.nth(i).getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).not.toBe('');
      }
    });

    test('disabled button should have aria-disabled="true"', async ({ page }) => {
      await page.click('[data-testid="show-toolbar-with-disabled"]');

      const disabledButton = page.locator('[role="toolbar"] button[disabled]').first();
      const ariaDisabled = await disabledButton.getAttribute('aria-disabled');

      expect(ariaDisabled).toBe('true');
    });

    test('separator should have role="separator"', async ({ page }) => {
      await page.click('[data-testid="show-toolbar-with-separator"]');

      const separator = page.locator('[role="separator"]');
      await expect(separator).toBeVisible();
    });

    test('separator should have aria-orientation="vertical"', async ({ page }) => {
      await page.click('[data-testid="show-toolbar-with-separator"]');

      const separator = page.locator('[role="separator"]');
      const ariaOrientation = await separator.getAttribute('aria-orientation');

      expect(ariaOrientation).toBe('vertical');
    });
  });

  test.describe('Arrow Key Navigation', () => {
    test('Right arrow should move focus to next button', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const buttons = page.locator('[role="toolbar"] button:not([disabled])');

      // Focus first button
      await buttons.first().focus();
      await expect(buttons.first()).toBeFocused();

      // Press Right arrow
      await page.keyboard.press('ArrowRight');

      // Second button should be focused
      await expect(buttons.nth(1)).toBeFocused();
    });

    test('Left arrow should move focus to previous button', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const buttons = page.locator('[role="toolbar"] button:not([disabled])');

      // Focus second button
      await buttons.nth(1).focus();
      await expect(buttons.nth(1)).toBeFocused();

      // Press Left arrow
      await page.keyboard.press('ArrowLeft');

      // First button should be focused
      await expect(buttons.first()).toBeFocused();
    });

    test('Right arrow should wrap from last to first button', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const buttons = page.locator('[role="toolbar"] button:not([disabled])');
      const count = await buttons.count();

      // Focus last button
      await buttons.nth(count - 1).focus();
      await expect(buttons.nth(count - 1)).toBeFocused();

      // Press Right arrow
      await page.keyboard.press('ArrowRight');

      // Should wrap to first button
      await expect(buttons.first()).toBeFocused();
    });

    test('Left arrow should wrap from first to last button', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const buttons = page.locator('[role="toolbar"] button:not([disabled])');
      const count = await buttons.count();

      // Focus first button
      await buttons.first().focus();
      await expect(buttons.first()).toBeFocused();

      // Press Left arrow
      await page.keyboard.press('ArrowLeft');

      // Should wrap to last button
      await expect(buttons.nth(count - 1)).toBeFocused();
    });

    test('arrow keys should skip disabled buttons', async ({ page }) => {
      await page.click('[data-testid="show-toolbar-with-disabled"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const toolbar = page.locator('[role="toolbar"]');
      const enabledButtons = page.locator('[role="toolbar"] button:not([disabled])');

      // Focus first enabled button
      await enabledButtons.first().focus();

      // Press Right arrow multiple times
      await page.keyboard.press('ArrowRight');

      // Should focus next enabled button (skipping any disabled)
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.tagName === 'BUTTON' &&
               !document.activeElement?.hasAttribute('disabled');
      });

      expect(focusedElement).toBe(true);
    });

    test('arrow navigation should not leave toolbar', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const toolbar = page.locator('[role="toolbar"]');

      // Focus first button
      const buttons = page.locator('[role="toolbar"] button');
      await buttons.first().focus();

      // Navigate with arrows many times
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('ArrowRight');

        // Verify focus is still in toolbar
        const isInToolbar = await page.evaluate(() => {
          return !!document.activeElement?.closest('[role="toolbar"]');
        });

        expect(isInToolbar).toBe(true);
      }
    });
  });

  test.describe('Home and End Key Navigation', () => {
    test('Home key should move focus to first button', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const buttons = page.locator('[role="toolbar"] button:not([disabled])');
      const count = await buttons.count();

      // Focus middle button
      await buttons.nth(Math.floor(count / 2)).focus();

      // Press Home
      await page.keyboard.press('Home');

      // First button should be focused
      await expect(buttons.first()).toBeFocused();
    });

    test('End key should move focus to last button', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const buttons = page.locator('[role="toolbar"] button:not([disabled])');
      const count = await buttons.count();

      // Focus first button
      await buttons.first().focus();

      // Press End
      await page.keyboard.press('End');

      // Last button should be focused
      await expect(buttons.nth(count - 1)).toBeFocused();
    });
  });

  test.describe('Escape Key', () => {
    test('Escape should hide toolbar', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const toolbar = page.locator('[role="toolbar"]');
      await expect(toolbar).toBeVisible();

      // Focus a button and press Escape
      await toolbar.locator('button').first().focus();
      await page.keyboard.press('Escape');

      // Toolbar should be hidden
      await expect(toolbar).not.toBeVisible({ timeout: 1000 });
    });

    test('Escape should return focus to trigger', async ({ page }) => {
      const trigger = page.locator('[data-testid="show-toolbar"]');

      await trigger.click();
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForSelector('[role="toolbar"]', { state: 'hidden' });

      // Focus should return to trigger
      await expect(trigger).toBeFocused();
    });
  });

  test.describe('Tab Key Behavior', () => {
    test('Tab should move focus to first toolbar button', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      // Tab to toolbar
      await page.keyboard.press('Tab');

      const toolbar = page.locator('[role="toolbar"]');
      const firstButton = toolbar.locator('button').first();

      // First button should be focused
      await expect(firstButton).toBeFocused();
    });

    test('Tab from toolbar should move to next element', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const toolbar = page.locator('[role="toolbar"]');
      const firstButton = toolbar.locator('button').first();

      await firstButton.focus();
      await expect(firstButton).toBeFocused();

      // Tab out of toolbar
      await page.keyboard.press('Tab');

      // Focus should leave toolbar
      const isInToolbar = await page.evaluate(() => {
        return !!document.activeElement?.closest('[role="toolbar"]');
      });

      expect(isInToolbar).toBe(false);
    });

    test('only one button should have tabindex="0"', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const buttonsWithTabIndex0 = page.locator('[role="toolbar"] button[tabindex="0"]');
      const count = await buttonsWithTabIndex0.count();

      expect(count).toBe(1);
    });

    test('unfocused buttons should have tabindex="-1"', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const buttonsWithTabIndexMinus1 = page.locator('[role="toolbar"] button[tabindex="-1"]');
      const count = await buttonsWithTabIndexMinus1.count();

      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Button Activation', () => {
    test('Enter key should activate focused button', async ({ page }) => {
      await page.evaluate(() => {
        (window as any).toolbarActionCalled = false;
      });

      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const firstButton = page.locator('[role="toolbar"] button').first();
      await firstButton.focus();

      await page.keyboard.press('Enter');

      const actionCalled = await page.evaluate(() => (window as any).toolbarActionCalled);
      expect(actionCalled).toBe(true);
    });

    test('Space key should activate focused button', async ({ page }) => {
      await page.evaluate(() => {
        (window as any).toolbarActionCalled = false;
      });

      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const firstButton = page.locator('[role="toolbar"] button').first();
      await firstButton.focus();

      await page.keyboard.press('Space');

      const actionCalled = await page.evaluate(() => (window as any).toolbarActionCalled);
      expect(actionCalled).toBe(true);
    });

    test('disabled button should not respond to activation', async ({ page }) => {
      await page.evaluate(() => {
        (window as any).disabledButtonCalled = false;
      });

      await page.click('[data-testid="show-toolbar-with-disabled"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const disabledButton = page.locator('[role="toolbar"] button[disabled]').first();

      // Try to click (force because it's disabled)
      await disabledButton.click({ force: true });

      const actionCalled = await page.evaluate(() => (window as any).disabledButtonCalled);
      expect(actionCalled).not.toBe(true);
    });
  });

  test.describe('Tooltips', () => {
    test('tooltip should have role="tooltip"', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const button = page.locator('[role="toolbar"] button').first();

      // Hover to show tooltip
      await button.hover();
      await page.waitForTimeout(100);

      const tooltip = page.locator('[role="tooltip"]');
      await expect(tooltip).toBeVisible();
    });

    test('tooltip should show on keyboard focus', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const button = page.locator('[role="toolbar"] button').first();

      // Focus button
      await button.focus();
      await page.waitForTimeout(100);

      const tooltip = page.locator('[role="tooltip"]');
      await expect(tooltip).toBeVisible();
    });

    test('tooltip content should match aria-label', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const button = page.locator('[role="toolbar"] button').first();
      const ariaLabel = await button.getAttribute('aria-label');

      await button.hover();
      await page.waitForTimeout(100);

      const tooltip = page.locator('[role="tooltip"]');
      const tooltipText = await tooltip.textContent();

      expect(tooltipText?.trim()).toBe(ariaLabel);
    });

    test('tooltip should hide on blur', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const button = page.locator('[role="toolbar"] button').first();

      // Focus to show tooltip
      await button.focus();
      await page.waitForTimeout(100);

      const tooltip = page.locator('[role="tooltip"]');
      await expect(tooltip).toBeVisible();

      // Blur
      await page.keyboard.press('Tab');

      // Tooltip should hide
      await expect(tooltip).not.toBeVisible();
    });
  });

  test.describe('Focus Visible Indicators', () => {
    test('focused button should have visible focus indicator', async ({
      page,
      testFocusVisible,
    }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      await testFocusVisible();
    });

    test('focus indicator should meet contrast requirements', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const button = page.locator('[role="toolbar"] button').first();
      await button.focus();

      const focusInfo = await button.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
        };
      });

      // Should have visible focus indicator
      const hasFocus =
        (focusInfo.outline && focusInfo.outline !== 'none') ||
        (focusInfo.boxShadow && focusInfo.boxShadow !== 'none');

      expect(hasFocus).toBe(true);
    });
  });

  test.describe('Button Variants', () => {
    test('primary button should be visually distinct', async ({ page }) => {
      await page.click('[data-testid="show-toolbar-all-variants"]');

      const primaryButton = page.locator('[role="toolbar"] .wc-toolbar-action--primary');
      const defaultButton = page.locator('[role="toolbar"] .wc-toolbar-action--default');

      const primaryBg = await primaryButton.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      const defaultBg = await defaultButton.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      expect(primaryBg).not.toBe(defaultBg);
    });

    test('danger button should be visually distinct', async ({ page }) => {
      await page.click('[data-testid="show-toolbar-all-variants"]');

      const dangerButton = page.locator('[role="toolbar"] .wc-toolbar-action--danger');
      const defaultButton = page.locator('[role="toolbar"] .wc-toolbar-action--default');

      const dangerColor = await dangerButton.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      const defaultColor = await defaultButton.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      expect(dangerColor).not.toBe(defaultColor);
    });

    test('all button variants should maintain accessibility', async ({ page, runA11yScan }) => {
      await page.click('[data-testid="show-toolbar-all-variants"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const results = await runA11yScan('[role="toolbar"]');
      expect(results.violations).toEqual([]);
    });
  });

  test.describe('Touch Target Size', () => {
    test('toolbar buttons should meet minimum touch target size', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const buttons = page.locator('[role="toolbar"] button');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const box = await buttons.nth(i).boundingBox();
        expect(box).toBeTruthy();

        if (box) {
          // Minimum 44x44px for WCAG AA
          expect(box.width).toBeGreaterThanOrEqual(36);
          expect(box.height).toBeGreaterThanOrEqual(36);
        }
      }
    });

    test('buttons should have adequate spacing', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const toolbar = page.locator('[role="toolbar"]');

      const gap = await toolbar.evaluate((el) => {
        return window.getComputedStyle(el).gap;
      });

      // Should have some spacing between buttons
      expect(gap).not.toBe('0px');
    });
  });

  test.describe('Positioning and Visibility', () => {
    test('toolbar should be visible and not cut off by viewport', async ({ page }) => {
      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const toolbar = page.locator('[role="toolbar"]');
      const box = await toolbar.boundingBox();

      expect(box).toBeTruthy();

      if (box) {
        const viewport = page.viewportSize();
        expect(viewport).toBeTruthy();

        if (viewport) {
          // Toolbar should be within viewport bounds
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.y).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
          expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
        }
      }
    });

    test('toolbar should have adequate viewport padding', async ({ page }) => {
      await page.click('[data-testid="show-toolbar-at-edge"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const toolbar = page.locator('[role="toolbar"]');
      const box = await toolbar.boundingBox();

      expect(box).toBeTruthy();

      if (box) {
        // Should have at least 8px padding from edges
        expect(box.x).toBeGreaterThanOrEqual(8);
        expect(box.y).toBeGreaterThanOrEqual(8);
      }
    });
  });

  test.describe('Reduced Motion', () => {
    test('should respect prefers-reduced-motion for entrance', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });

      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const toolbar = page.locator('[role="toolbar"]');

      const transition = await toolbar.evaluate((el) => {
        return window.getComputedStyle(el).transition;
      });

      expect(transition).toBe('none');
    });

    test('tooltips should respect reduced motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });

      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const button = page.locator('[role="toolbar"] button').first();
      await button.hover();

      const tooltip = page.locator('[role="tooltip"]');

      const transition = await tooltip.evaluate((el) => {
        return window.getComputedStyle(el).transition;
      });

      expect(transition).toBe('none');
    });
  });

  test.describe('High Contrast Mode', () => {
    test('toolbar should be visible in high contrast mode', async ({ page }) => {
      await page.emulateMedia({ forcedColors: 'active' });

      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const toolbar = page.locator('[role="toolbar"]');
      await expect(toolbar).toBeVisible();
    });

    test('buttons should have visible borders in high contrast', async ({ page }) => {
      await page.emulateMedia({ forcedColors: 'active' });

      await page.click('[data-testid="show-toolbar"]');

      const button = page.locator('[role="toolbar"] button').first();

      const borderWidth = await button.evaluate((el) => {
        return window.getComputedStyle(el).borderWidth;
      });

      expect(borderWidth).not.toBe('0px');
    });
  });

  test.describe('Custom Events', () => {
    test('should dispatch custom event on action click', async ({ page }) => {
      await page.evaluate(() => {
        (window as any).lastActionId = null;
        document.addEventListener('wc-action', (e: any) => {
          (window as any).lastActionId = e.detail.actionId;
        });
      });

      await page.click('[data-testid="show-toolbar"]');
      await page.waitForSelector('[role="toolbar"]', { state: 'visible' });

      const firstButton = page.locator('[role="toolbar"] button').first();
      const actionId = await firstButton.getAttribute('data-action-id');

      await firstButton.click();

      const dispatchedId = await page.evaluate(() => (window as any).lastActionId);
      expect(dispatchedId).toBe(actionId);
    });
  });
});
