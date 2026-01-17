/**
 * Dialog Component Accessibility Tests
 *
 * Tests WCAG 2.1 AA compliance for modal dialogs including:
 * - Focus trap functionality
 * - Keyboard navigation (Escape, Tab cycling)
 * - ARIA attributes (role, aria-modal, aria-labelledby, aria-describedby)
 * - Focus return to trigger element on close
 * - Screen reader announcements
 */

import { test, expect } from '../fixtures/a11y.fixture';

test.describe('Dialog Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components/dialog.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Automated Accessibility Scan', () => {
    test('should have no violations when dialog is open', async ({ page, runA11yScan }) => {
      // Open dialog
      await page.click('[data-testid="open-dialog"]');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      const results = await runA11yScan();
      expect(results.violations).toEqual([]);
    });

    test('should have no violations for alertdialog variant', async ({ page, runA11yScan }) => {
      await page.click('[data-testid="open-warning-dialog"]');
      await page.waitForSelector('[role="alertdialog"]', { state: 'visible' });

      const results = await runA11yScan();
      expect(results.violations).toEqual([]);
    });

    test('should have no violations for error dialog', async ({ page, runA11yScan }) => {
      await page.click('[data-testid="open-error-dialog"]');
      await page.waitForSelector('[role="alertdialog"]', { state: 'visible' });

      const results = await runA11yScan();
      expect(results.violations).toEqual([]);
    });
  });

  test.describe('ARIA Attributes', () => {
    test('default dialog should have role="dialog"', async ({ page }) => {
      await page.click('[data-testid="open-dialog"]');

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
    });

    test('warning dialog should have role="alertdialog"', async ({ page }) => {
      await page.click('[data-testid="open-warning-dialog"]');

      const dialog = page.locator('[role="alertdialog"]');
      await expect(dialog).toBeVisible();
    });

    test('error dialog should have role="alertdialog"', async ({ page }) => {
      await page.click('[data-testid="open-error-dialog"]');

      const dialog = page.locator('[role="alertdialog"]');
      await expect(dialog).toBeVisible();
    });

    test('dialog should have aria-modal="true"', async ({ page }) => {
      await page.click('[data-testid="open-dialog"]');

      const dialog = page.locator('[role="dialog"]');
      const ariaModal = await dialog.getAttribute('aria-modal');

      expect(ariaModal).toBe('true');
    });

    test('dialog should have aria-labelledby pointing to title', async ({ page }) => {
      await page.click('[data-testid="open-dialog"]');

      const dialog = page.locator('[role="dialog"]');
      const ariaLabelledBy = await dialog.getAttribute('aria-labelledby');

      expect(ariaLabelledBy).toBeTruthy();

      // Verify the ID points to actual title element
      const title = page.locator(`#${ariaLabelledBy}`);
      await expect(title).toBeVisible();
      await expect(title).toHaveText(/./); // Has text content
    });

    test('dialog with description should have aria-describedby', async ({ page }) => {
      await page.click('[data-testid="open-dialog-with-description"]');

      const dialog = page.locator('[role="dialog"]');
      const ariaDescribedBy = await dialog.getAttribute('aria-describedby');

      expect(ariaDescribedBy).toBeTruthy();

      // Verify the ID points to description element
      const description = page.locator(`#${ariaDescribedBy}`);
      await expect(description).toBeVisible();
      await expect(description).toHaveText(/./);
    });

    test('backdrop should have aria-hidden="true"', async ({ page }) => {
      await page.click('[data-testid="open-dialog"]');

      const backdrop = page.locator('.wc-dialog-backdrop');
      const ariaHidden = await backdrop.getAttribute('aria-hidden');

      expect(ariaHidden).toBe('true');
    });

    test('close button should have aria-label', async ({ page }) => {
      await page.click('[data-testid="open-dialog"]');

      const closeButton = page.locator('.wc-dialog-close');
      const ariaLabel = await closeButton.getAttribute('aria-label');

      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toMatch(/close/i);
    });
  });

  test.describe('Focus Trap', () => {
    test('focus should move into dialog when opened', async ({ page }) => {
      const trigger = page.locator('[data-testid="open-dialog"]');

      await trigger.click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      // Focus should be on first focusable element in dialog
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          isInDialog: !!el?.closest('[role="dialog"]'),
          tagName: el?.tagName,
        };
      });

      expect(focusedElement.isInDialog).toBe(true);
    });

    test('Tab should cycle through dialog elements only', async ({ page }) => {
      await page.click('[data-testid="open-dialog"]');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      const dialog = page.locator('[role="dialog"]');

      // Get all focusable elements in dialog
      const focusableCount = await dialog.evaluate((el) => {
        const focusable = el.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        return focusable.length;
      });

      // Tab through all elements
      for (let i = 0; i < focusableCount + 1; i++) {
        await page.keyboard.press('Tab');

        // Verify focus stays in dialog
        const isInDialog = await page.evaluate(() => {
          return !!document.activeElement?.closest('[role="dialog"]');
        });

        expect(isInDialog).toBe(true);
      }
    });

    test('Shift+Tab should cycle backwards through dialog', async ({ page }) => {
      await page.click('[data-testid="open-dialog"]');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      // Tab forward once
      await page.keyboard.press('Tab');

      // Tab backward
      await page.keyboard.press('Shift+Tab');

      // Should still be in dialog
      const isInDialog = await page.evaluate(() => {
        return !!document.activeElement?.closest('[role="dialog"]');
      });

      expect(isInDialog).toBe(true);
    });

    test('focus should not escape dialog with Tab', async ({ page }) => {
      await page.click('[data-testid="open-dialog"]');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      // Tab many times
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
      }

      // Verify focus is still in dialog
      const focusInfo = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          isInDialog: !!el?.closest('[role="dialog"]'),
          isInBody: !!el?.closest('body'),
        };
      });

      expect(focusInfo.isInDialog).toBe(true);
    });

    test('focus should trap at dialog boundaries', async ({ page }) => {
      await page.click('[data-testid="open-dialog"]');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      const dialog = page.locator('[role="dialog"]');

      // Get first and last focusable elements
      const { firstId, lastId } = await dialog.evaluate((el) => {
        const focusable = Array.from(
          el.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        );
        return {
          firstId: focusable[0]?.getAttribute('data-testid') || '',
          lastId: focusable[focusable.length - 1]?.getAttribute('data-testid') || '',
        };
      });

      // Tab to last element
      await page.locator(`[data-testid="${lastId}"]`).focus();

      // Tab forward should go to first
      await page.keyboard.press('Tab');

      const focusedAfterWrap = await page.locator(`[data-testid="${firstId}"]`).evaluate(
        (el) => el === document.activeElement
      );

      expect(focusedAfterWrap).toBe(true);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('Escape key should close dismissible dialog', async ({ page }) => {
      await page.click('[data-testid="open-dismissible-dialog"]');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      await page.keyboard.press('Escape');

      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    });

    test('Escape key should not close non-dismissible dialog', async ({ page }) => {
      await page.click('[data-testid="open-non-dismissible-dialog"]');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      const dialog = page.locator('[role="dialog"]');

      await page.keyboard.press('Escape');

      // Dialog should still be visible
      await expect(dialog).toBeVisible();
    });

    test('close button should be keyboard accessible', async ({ page }) => {
      await page.click('[data-testid="open-dialog"]');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      const closeButton = page.locator('.wc-dialog-close');

      // Focus close button
      await closeButton.focus();
      await expect(closeButton).toBeFocused();

      // Press Enter
      await page.keyboard.press('Enter');

      // Dialog should close
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    });

    test('action buttons should be keyboard accessible', async ({ page }) => {
      await page.click('[data-testid="open-dialog"]');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      const primaryButton = page.locator('[data-action="primary"]');

      await primaryButton.focus();
      await expect(primaryButton).toBeFocused();

      // Can activate with Enter
      await page.keyboard.press('Enter');

      // Dialog should close
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    });

    test('Enter on primary action should execute and close', async ({ page }) => {
      await page.evaluate(() => {
        (window as any).primaryActionCalled = false;
      });

      await page.click('[data-testid="open-dialog-with-callback"]');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      const primaryButton = page.locator('[data-action="primary"]');
      await primaryButton.focus();
      await page.keyboard.press('Enter');

      // Give time for action to execute
      await page.waitForTimeout(100);

      const actionCalled = await page.evaluate(() => (window as any).primaryActionCalled);
      expect(actionCalled).toBe(true);
    });
  });

  test.describe('Focus Return', () => {
    test('focus should return to trigger element on close', async ({ page }) => {
      const trigger = page.locator('[data-testid="open-dialog"]');

      // Open dialog
      await trigger.click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      // Close dialog with Escape
      await page.keyboard.press('Escape');
      await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

      // Focus should be back on trigger
      await expect(trigger).toBeFocused();
    });

    test('focus should return to trigger after closing with button', async ({ page }) => {
      const trigger = page.locator('[data-testid="open-dialog"]');

      await trigger.click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      // Close with close button
      await page.click('.wc-dialog-close');
      await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

      // Focus should be back on trigger
      await expect(trigger).toBeFocused();
    });

    test('focus should return to trigger after primary action', async ({ page }) => {
      const trigger = page.locator('[data-testid="open-dialog"]');

      await trigger.click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      // Click primary action
      await page.click('[data-action="primary"]');
      await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

      // Focus should be back on trigger
      await expect(trigger).toBeFocused();
    });
  });

  test.describe('Backdrop Interaction', () => {
    test('clicking backdrop should close dismissible dialog', async ({ page }) => {
      await page.click('[data-testid="open-dismissible-dialog"]');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      // Click backdrop
      await page.click('.wc-dialog-backdrop', { position: { x: 5, y: 5 } });

      // Dialog should close
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    });

    test('clicking backdrop should not close non-dismissible dialog', async ({ page }) => {
      await page.click('[data-testid="open-non-dismissible-dialog"]');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      // Try to click backdrop
      await page.click('.wc-dialog-backdrop', { position: { x: 5, y: 5 } });

      // Dialog should still be visible
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
    });

    test('backdrop should prevent interaction with page content', async ({ page }) => {
      const backgroundButton = page.locator('[data-testid="background-button"]');

      await page.click('[data-testid="open-dialog"]');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      // Try to click background button
      await backgroundButton.click({ force: true });

      // Button should not have been clicked (event blocked by modal)
      const wasClicked = await page.evaluate(() => (window as any).backgroundButtonClicked);
      expect(wasClicked).not.toBe(true);
    });
  });

  test.describe('Screen Reader Announcements', () => {
    test('dialog opening should be announced', async ({ page }) => {
      await page.click('[data-testid="open-dialog"]');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      // Dialog with role should be announced
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Title should be associated via aria-labelledby
      const ariaLabelledBy = await dialog.getAttribute('aria-labelledby');
      expect(ariaLabelledBy).toBeTruthy();
    });

    test('alertdialog should use assertive announcement', async ({ page }) => {
      await page.click('[data-testid="open-error-dialog"]');

      const alertDialog = page.locator('[role="alertdialog"]');
      await expect(alertDialog).toBeVisible();

      // alertdialog role implies assertive announcement
      const role = await alertDialog.getAttribute('role');
      expect(role).toBe('alertdialog');
    });

    test('dialog content should be accessible to screen readers', async ({ page }) => {
      await page.click('[data-testid="open-dialog"]');

      const dialog = page.locator('[role="dialog"]');

      // Title should be readable
      const titleId = await dialog.getAttribute('aria-labelledby');
      const title = page.locator(`#${titleId}`);
      await expect(title).toHaveText(/./);

      // Description should be readable
      const descId = await dialog.getAttribute('aria-describedby');
      if (descId) {
        const description = page.locator(`#${descId}`);
        await expect(description).toHaveText(/./);
      }
    });
  });

  test.describe('Loading/Processing State', () => {
    test('button should show loading state during async action', async ({ page }) => {
      await page.click('[data-testid="open-dialog-with-async-action"]');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      const primaryButton = page.locator('[data-action="primary"]');

      await primaryButton.click();

      // Button should be disabled and show loading text
      await expect(primaryButton).toBeDisabled();
      await expect(primaryButton).toContainText(/processing/i);
    });

    test('loading button should be announced to screen readers', async ({ page }) => {
      await page.click('[data-testid="open-dialog-with-async-action"]');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      const primaryButton = page.locator('[data-action="primary"]');

      await primaryButton.click();

      // Button should have aria-disabled
      const ariaDisabled = await primaryButton.getAttribute('aria-disabled');
      expect(ariaDisabled).toBe('true');
    });
  });

  test.describe('Multiple Dialogs', () => {
    test('should handle stacked dialogs correctly', async ({ page }) => {
      // Open first dialog
      await page.click('[data-testid="open-dialog"]');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      const firstDialog = page.locator('[role="dialog"]').first();

      // Open second dialog from first
      await page.click('[data-testid="open-second-dialog"]');

      const dialogs = page.locator('[role="dialog"]');
      const count = await dialogs.count();

      expect(count).toBe(2);

      // Focus should be in second dialog
      const focusInSecond = await page.evaluate(() => {
        const allDialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
        const lastDialog = allDialogs[allDialogs.length - 1];
        return !!document.activeElement?.closest(`[role="dialog"]`)?.isSameNode(lastDialog);
      });

      expect(focusInSecond).toBe(true);
    });
  });

  test.describe('Reduced Motion', () => {
    test('should respect prefers-reduced-motion for animations', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });

      await page.click('[data-testid="open-dialog"]');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      const dialog = page.locator('[role="dialog"]');

      // Check for reduced/no transition
      const hasReducedMotion = await dialog.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return (
          styles.transition === 'none' ||
          styles.animationDuration === '0s' ||
          styles.transitionDuration === '0s'
        );
      });

      expect(hasReducedMotion).toBe(true);
    });
  });
});
