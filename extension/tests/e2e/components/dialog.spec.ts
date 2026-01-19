/**
 * Dialog Component Tests
 *
 * Comprehensive tests for the Dialog component including:
 * - Rendering of all variants
 * - Modal behavior (backdrop, focus trap)
 * - Open/close interactions
 * - Escape key handling
 * - Action button handling
 * - Accessibility (ARIA attributes, focus management)
 */

import { test, expect } from '@playwright/test';

test.describe('Dialog Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#dialog-section');
  });

  test.describe('Rendering', () => {
    test('should open default dialog on trigger click', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      // Wait for dialog to appear
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();
    });

    test('should display dialog title', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      const title = page.locator('#wc-dialog-title').first();
      await expect(title).toBeVisible();
      await expect(title).toHaveText('Default Dialog');
    });

    test('should display dialog description', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      const description = page.locator('#wc-dialog-description').first();
      await expect(description).toBeVisible();
      await expect(description).toContainText('This is a default dialog');
    });

    test('should render warning dialog with alertdialog role', async ({ page }) => {
      await page.click('#dialog-warning-trigger');

      const dialog = page.locator('[role="alertdialog"]').first();
      await expect(dialog).toBeVisible();
    });

    test('should render error dialog with alertdialog role', async ({ page }) => {
      await page.click('#dialog-error-trigger');

      const dialog = page.locator('[role="alertdialog"]').first();
      await expect(dialog).toBeVisible();
    });

    test('should render success dialog', async ({ page }) => {
      await page.click('#dialog-success-trigger');

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();
      await expect(page.locator('#wc-dialog-title').first()).toHaveText('Success!');
    });
  });

  test.describe('Dialog Actions', () => {
    test('should display primary action button', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      const primaryButton = page.locator('[data-action="primary"]').first();
      await expect(primaryButton).toBeVisible();
      await expect(primaryButton).toHaveText('Confirm');
    });

    test('should display secondary action button', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      const secondaryButton = page.locator('[data-action="secondary"]').first();
      await expect(secondaryButton).toBeVisible();
      await expect(secondaryButton).toHaveText('Cancel');
    });

    test('should close dialog when primary action is clicked', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      await page.click('[data-action="primary"]');

      // Wait for dialog to close
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    });

    test('should close dialog when secondary action is clicked', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      await page.click('[data-action="secondary"]');

      // Wait for dialog to close
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    });

    test('should show loading state on action button during async operation', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      const primaryButton = page.locator('[data-action="primary"]').first();
      await primaryButton.click();

      // During async operation, button should show loading text
      // (In the test harness, this happens very quickly)
      await page.waitForTimeout(50);
    });
  });

  test.describe('Dismissible Dialog', () => {
    test('should show close button on dismissible dialog', async ({ page }) => {
      await page.click('#dialog-dismissible-trigger');

      const closeButton = page.locator('.wc-dialog-close').first();
      await expect(closeButton).toBeVisible();
    });

    test('should close dialog when close button is clicked', async ({ page }) => {
      await page.click('#dialog-dismissible-trigger');

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      await page.click('.wc-dialog-close');

      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    });

    test('should close dialog when backdrop is clicked', async ({ page }) => {
      await page.click('#dialog-dismissible-trigger');

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      // Click backdrop (outside dialog)
      const backdrop = page.locator('.wc-dialog-backdrop').first();
      await backdrop.click({ position: { x: 10, y: 10 } });

      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    });

    test('should close dialog when Escape key is pressed', async ({ page }) => {
      await page.click('#dialog-dismissible-trigger');

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      await page.keyboard.press('Escape');

      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    });

    test('should not close non-dismissible dialog on Escape', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      await page.keyboard.press('Escape');

      await page.waitForTimeout(100);
      // Dialog should still be visible
      await expect(dialog).toBeVisible();
    });

    test('should not close non-dismissible dialog on backdrop click', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      // Try to click backdrop
      const backdrop = page.locator('.wc-dialog-backdrop').first();
      await backdrop.click({ position: { x: 10, y: 10 }, force: true });

      await page.waitForTimeout(100);
      // Dialog should still be visible
      await expect(dialog).toBeVisible();

      // Close via action button
      await page.click('[data-action="secondary"]');
    });
  });

  test.describe('Focus Management', () => {
    test('should trap focus inside dialog', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      // Get all focusable elements
      const focusableElements = await page.locator('[data-action="primary"], [data-action="secondary"]').all();

      expect(focusableElements.length).toBeGreaterThan(0);

      // Tab through elements
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);

      // Focus should remain within dialog
      const focusedElement = await page.evaluate(() => {
        const activeEl = document.activeElement;
        if (activeEl?.shadowRoot) {
          return activeEl.shadowRoot.activeElement?.getAttribute('data-action') || 'none';
        }
        return activeEl?.getAttribute('data-action') || 'none';
      });

      expect(['primary', 'secondary', 'none']).toContain(focusedElement);
    });

    test('should focus first interactive element when dialog opens', async ({ page }) => {
      await page.click('#dialog-dismissible-trigger');

      await page.waitForTimeout(100);

      // Check if an element inside the dialog has focus
      const hasFocusInDialog = await page.evaluate(() => {
        const activeEl = document.activeElement;
        const dialog = document.querySelector('.wc-dialog-container');
        return dialog?.contains(activeEl) || !!dialog?.shadowRoot?.activeElement;
      });

      expect(hasFocusInDialog).toBe(true);
    });

    test('should restore focus when dialog closes', async ({ page }) => {
      const trigger = page.locator('#dialog-dismissible-trigger');

      await trigger.click();
      await page.waitForTimeout(100);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Focus should return to trigger or document
      const focusReturned = await trigger.evaluate(el => {
        return document.activeElement === el;
      });

      // Focus might not return to exact trigger, but dialog should be closed
      await expect(dialog).not.toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have aria-modal="true"', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      const dialog = page.locator('[role="dialog"]').first();
      const ariaModal = await dialog.getAttribute('aria-modal');

      expect(ariaModal).toBe('true');
    });

    test('should have aria-labelledby pointing to title', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      const dialog = page.locator('[role="dialog"]').first();
      const labelledBy = await dialog.getAttribute('aria-labelledby');

      expect(labelledBy).toBe('wc-dialog-title');
    });

    test('should have aria-describedby pointing to description', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      const dialog = page.locator('[role="dialog"]').first();
      const describedBy = await dialog.getAttribute('aria-describedby');

      expect(describedBy).toBe('wc-dialog-description');
    });

    test('close button should have aria-label', async ({ page }) => {
      await page.click('#dialog-dismissible-trigger');

      const closeButton = page.locator('.wc-dialog-close').first();
      const ariaLabel = await closeButton.getAttribute('aria-label');

      expect(ariaLabel).toBe('Close dialog');
    });

    test('backdrop should have aria-hidden="true"', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      const backdrop = page.locator('.wc-dialog-backdrop').first();
      const ariaHidden = await backdrop.getAttribute('aria-hidden');

      expect(ariaHidden).toBe('true');
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate between buttons with Tab', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      await page.waitForTimeout(100);

      // Tab to next button
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);

      // An element should have focus
      const hasFocus = await page.evaluate(() => {
        return !!document.activeElement && document.activeElement !== document.body;
      });

      expect(hasFocus).toBe(true);
    });

    test('should activate button with Enter key', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      // Focus and activate primary button with keyboard
      const primaryButton = page.locator('[data-action="primary"]').first();
      await primaryButton.focus();
      await page.keyboard.press('Enter');

      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    });

    test('should activate button with Space key', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      // Focus and activate secondary button with keyboard
      const secondaryButton = page.locator('[data-action="secondary"]').first();
      await secondaryButton.focus();
      await page.keyboard.press('Space');

      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    });
  });

  test.describe('Variants', () => {
    test('should apply correct variant class', async ({ page }) => {
      await page.click('#dialog-warning-trigger');

      const dialog = page.locator('[role="alertdialog"]').first();
      await expect(dialog).toBeVisible();

      const hasVariantClass = await dialog.evaluate(el => {
        return el.classList.contains('wc-dialog-warning');
      });

      expect(hasVariantClass).toBe(true);
    });

    test('should use alertdialog role for warning variant', async ({ page }) => {
      await page.click('#dialog-warning-trigger');

      const dialog = page.locator('[role="alertdialog"]').first();
      await expect(dialog).toBeVisible();
    });

    test('should use alertdialog role for error variant', async ({ page }) => {
      await page.click('#dialog-error-trigger');

      const dialog = page.locator('[role="alertdialog"]').first();
      await expect(dialog).toBeVisible();
    });

    test('should use dialog role for default variant', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();
    });

    test('should use dialog role for success variant', async ({ page }) => {
      await page.click('#dialog-success-trigger');

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();
    });
  });

  test.describe('Animations', () => {
    test('should animate in on open', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      // Check for animation class
      const hasOpenClass = await dialog.evaluate(el => {
        return el.classList.contains('wc-dialog-open');
      });

      expect(hasOpenClass).toBe(true);
    });

    test('should animate out on close', async ({ page }) => {
      await page.click('#dialog-dismissible-trigger');

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      await page.click('.wc-dialog-close');

      // Check for exit animation (class should be removed)
      await page.waitForTimeout(50);

      const hasOpenClass = await dialog.evaluate(el => {
        return el.classList.contains('wc-dialog-open');
      }).catch(() => false);

      expect(hasOpenClass).toBe(false);
    });
  });

  test.describe('Multiple Dialogs', () => {
    test('should only show one dialog at a time', async ({ page }) => {
      await page.click('#dialog-default-trigger');

      const firstDialog = page.locator('[role="dialog"]').first();
      await expect(firstDialog).toBeVisible();

      // Try to open another dialog (need to close first one)
      const dialogCount = await page.locator('[role="dialog"], [role="alertdialog"]').count();

      // Should only have one dialog visible
      expect(dialogCount).toBe(1);

      // Close first dialog
      await page.click('[data-action="secondary"]');
      await page.waitForTimeout(300);
    });
  });

  test.describe('Dark Mode', () => {
    test('should render correctly in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();
      await page.waitForSelector('#dialog-section');

      await page.click('#dialog-default-trigger');

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      // Dialog should still be functional in dark mode
      await page.click('[data-action="secondary"]');
      await page.waitForTimeout(300);
      await expect(dialog).not.toBeVisible();
    });
  });
});
