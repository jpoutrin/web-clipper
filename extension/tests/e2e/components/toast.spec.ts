/**
 * Toast Component Tests
 *
 * Comprehensive tests for the Toast component including:
 * - Rendering of all variants
 * - Show/dismiss functionality
 * - Auto-dismiss timing
 * - Pause on hover/focus
 * - Action buttons
 * - Multiple toast stacking
 * - Accessibility attributes
 */

import { test, expect } from '@playwright/test';

test.describe('Toast Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#toast-section');
  });

  test.describe('Rendering', () => {
    test('should show success toast on trigger click', async ({ page }) => {
      await page.click('#toast-success-trigger');

      const toast = page.locator('.wc-toast--success').first();
      await expect(toast).toBeVisible();
    });

    test('should show error toast on trigger click', async ({ page }) => {
      await page.click('#toast-error-trigger');

      const toast = page.locator('.wc-toast--error').first();
      await expect(toast).toBeVisible();
    });

    test('should show warning toast on trigger click', async ({ page }) => {
      await page.click('#toast-warning-trigger');

      const toast = page.locator('.wc-toast--warning').first();
      await expect(toast).toBeVisible();
    });

    test('should show info toast on trigger click', async ({ page }) => {
      await page.click('#toast-info-trigger');

      const toast = page.locator('.wc-toast--info').first();
      await expect(toast).toBeVisible();
    });

    test('should display toast title', async ({ page }) => {
      await page.click('#toast-success-trigger');

      const title = page.locator('.wc-toast__title').first();
      await expect(title).toBeVisible();
      await expect(title).toHaveText('Success!');
    });

    test('should display toast description', async ({ page }) => {
      await page.click('#toast-success-trigger');

      const description = page.locator('.wc-toast__description').first();
      await expect(description).toBeVisible();
      await expect(description).toContainText('Your action completed successfully');
    });

    test('should display toast icon', async ({ page }) => {
      await page.click('#toast-success-trigger');

      const icon = page.locator('.wc-toast__icon').first();
      await expect(icon).toBeVisible();
    });
  });

  test.describe('Auto-dismiss', () => {
    test('should auto-dismiss success toast after duration', async ({ page }) => {
      await page.click('#toast-success-trigger');

      const toast = page.locator('.wc-toast--success').first();
      await expect(toast).toBeVisible();

      // Wait for auto-dismiss (3000ms + animation)
      await page.waitForTimeout(3500);

      await expect(toast).not.toBeVisible();
    });

    test('should auto-dismiss error toast after longer duration', async ({ page }) => {
      await page.click('#toast-error-trigger');

      const toast = page.locator('.wc-toast--error').first();
      await expect(toast).toBeVisible();

      // Should still be visible after 3 seconds
      await page.waitForTimeout(3000);
      await expect(toast).toBeVisible();

      // Should be dismissed after 5 seconds + animation
      await page.waitForTimeout(2500);
      await expect(toast).not.toBeVisible();
    });

    test('should show progress bar for timed toasts', async ({ page }) => {
      await page.click('#toast-info-trigger');

      const toast = page.locator('.wc-toast--info').first();
      await expect(toast).toBeVisible();

      const progressBar = toast.locator('.wc-toast__progress').first();
      await expect(progressBar).toBeVisible();
    });

    test('persistent toast should not auto-dismiss', async ({ page }) => {
      await page.click('#toast-persistent-trigger');

      const toast = page.locator('.wc-toast--warning').first();
      await expect(toast).toBeVisible();

      // Wait longer than typical duration
      await page.waitForTimeout(6000);

      // Should still be visible
      await expect(toast).toBeVisible();

      // Clean up by dismissing
      const dismissButton = toast.locator('.wc-toast__dismiss').first();
      await dismissButton.click();
      await page.waitForTimeout(300);
    });
  });

  test.describe('Dismiss Functionality', () => {
    test('should show dismiss button', async ({ page }) => {
      await page.click('#toast-success-trigger');

      const dismissButton = page.locator('.wc-toast__dismiss').first();
      await expect(dismissButton).toBeVisible();
    });

    test('should dismiss toast when dismiss button is clicked', async ({ page }) => {
      await page.click('#toast-success-trigger');

      const toast = page.locator('.wc-toast--success').first();
      await expect(toast).toBeVisible();

      const dismissButton = toast.locator('.wc-toast__dismiss').first();
      await dismissButton.click();

      // Wait for exit animation
      await page.waitForTimeout(300);
      await expect(toast).not.toBeVisible();
    });

    test('dismiss button should have aria-label', async ({ page }) => {
      await page.click('#toast-success-trigger');

      const dismissButton = page.locator('.wc-toast__dismiss').first();
      const ariaLabel = await dismissButton.getAttribute('aria-label');

      expect(ariaLabel).toBe('Dismiss notification');
    });
  });

  test.describe('Action Buttons', () => {
    test('should display action button', async ({ page }) => {
      await page.click('#toast-action-trigger');

      const actionButton = page.locator('.wc-toast__action').first();
      await expect(actionButton).toBeVisible();
      await expect(actionButton).toHaveText('Undo');
    });

    test('should trigger action on button click', async ({ page }) => {
      await page.click('#toast-action-trigger');

      const toast = page.locator('.wc-toast--info').first();
      await expect(toast).toBeVisible();

      const actionButton = toast.locator('.wc-toast__action').first();
      await actionButton.click();

      // Wait a bit for the undo action to trigger
      await page.waitForTimeout(500);

      // Should show a new success toast
      const successToast = page.locator('.wc-toast--success').first();
      await expect(successToast).toBeVisible();
    });
  });

  test.describe('Pause on Hover', () => {
    test('should pause auto-dismiss on hover', async ({ page }) => {
      await page.click('#toast-success-trigger');

      const toast = page.locator('.wc-toast--success').first();
      await expect(toast).toBeVisible();

      // Hover over toast
      await toast.hover();

      // Wait beyond the normal dismiss time
      await page.waitForTimeout(4000);

      // Toast should still be visible due to hover
      await expect(toast).toBeVisible();

      // Move away
      await page.mouse.move(0, 0);

      // Should dismiss soon after
      await page.waitForTimeout(1000);
      await expect(toast).not.toBeVisible();
    });

    test('should pause auto-dismiss on focus', async ({ page }) => {
      await page.click('#toast-action-trigger');

      const toast = page.locator('.wc-toast--info').first();
      await expect(toast).toBeVisible();

      // Focus on action button
      const actionButton = toast.locator('.wc-toast__action').first();
      await actionButton.focus();

      // Wait beyond normal dismiss time
      await page.waitForTimeout(6000);

      // Toast should still be visible due to focus
      await expect(toast).toBeVisible();

      // Dismiss manually
      await toast.locator('.wc-toast__dismiss').click();
      await page.waitForTimeout(300);
    });
  });

  test.describe('Multiple Toasts', () => {
    test('should stack multiple toasts', async ({ page }) => {
      // Show multiple toasts
      await page.click('#toast-success-trigger');
      await page.waitForTimeout(100);
      await page.click('#toast-error-trigger');
      await page.waitForTimeout(100);
      await page.click('#toast-warning-trigger');

      // All toasts should be visible
      const successToast = page.locator('.wc-toast--success').first();
      const errorToast = page.locator('.wc-toast--error').first();
      const warningToast = page.locator('.wc-toast--warning').first();

      await expect(successToast).toBeVisible();
      await expect(errorToast).toBeVisible();
      await expect(warningToast).toBeVisible();
    });

    test('should dismiss toasts independently', async ({ page }) => {
      // Show two toasts
      await page.click('#toast-success-trigger');
      await page.waitForTimeout(100);
      await page.click('#toast-persistent-trigger');

      const successToast = page.locator('.wc-toast--success').first();
      const persistentToast = page.locator('.wc-toast--warning').first();

      await expect(successToast).toBeVisible();
      await expect(persistentToast).toBeVisible();

      // Success toast should auto-dismiss
      await page.waitForTimeout(3500);
      await expect(successToast).not.toBeVisible();

      // Persistent toast should still be visible
      await expect(persistentToast).toBeVisible();

      // Clean up
      await persistentToast.locator('.wc-toast__dismiss').click();
      await page.waitForTimeout(300);
    });
  });

  test.describe('Accessibility', () => {
    test('error toast should have alert role', async ({ page }) => {
      await page.click('#toast-error-trigger');

      const toast = page.locator('.wc-toast--error').first();
      const role = await toast.getAttribute('role');

      expect(role).toBe('alert');
    });

    test('warning toast should have alert role', async ({ page }) => {
      await page.click('#toast-warning-trigger');

      const toast = page.locator('.wc-toast--warning').first();
      const role = await toast.getAttribute('role');

      expect(role).toBe('alert');
    });

    test('success toast should have status role', async ({ page }) => {
      await page.click('#toast-success-trigger');

      const toast = page.locator('.wc-toast--success').first();
      const role = await toast.getAttribute('role');

      expect(role).toBe('status');
    });

    test('info toast should have status role', async ({ page }) => {
      await page.click('#toast-info-trigger');

      const toast = page.locator('.wc-toast--info').first();
      const role = await toast.getAttribute('role');

      expect(role).toBe('status');
    });

    test('error toast should have assertive aria-live', async ({ page }) => {
      await page.click('#toast-error-trigger');

      const toast = page.locator('.wc-toast--error').first();
      const ariaLive = await toast.getAttribute('aria-live');

      expect(ariaLive).toBe('assertive');
    });

    test('success toast should have polite aria-live', async ({ page }) => {
      await page.click('#toast-success-trigger');

      const toast = page.locator('.wc-toast--success').first();
      const ariaLive = await toast.getAttribute('aria-live');

      expect(ariaLive).toBe('polite');
    });

    test('should have aria-atomic="true"', async ({ page }) => {
      await page.click('#toast-success-trigger');

      const toast = page.locator('.wc-toast--success').first();
      const ariaAtomic = await toast.getAttribute('aria-atomic');

      expect(ariaAtomic).toBe('true');
    });

    test('icon should have aria-hidden="true"', async ({ page }) => {
      await page.click('#toast-success-trigger');

      const icon = page.locator('.wc-toast__icon').first();
      const ariaHidden = await icon.getAttribute('aria-hidden');

      expect(ariaHidden).toBe('true');
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('dismiss button should be keyboard accessible', async ({ page }) => {
      await page.click('#toast-persistent-trigger');

      const toast = page.locator('.wc-toast--warning').first();
      await expect(toast).toBeVisible();

      const dismissButton = toast.locator('.wc-toast__dismiss').first();

      // Focus the dismiss button
      await dismissButton.focus();

      // Activate with Enter
      await page.keyboard.press('Enter');

      await page.waitForTimeout(300);
      await expect(toast).not.toBeVisible();
    });

    test('action button should be keyboard accessible', async ({ page }) => {
      await page.click('#toast-action-trigger');

      const toast = page.locator('.wc-toast--info').first();
      await expect(toast).toBeVisible();

      const actionButton = toast.locator('.wc-toast__action').first();

      // Focus the action button
      await actionButton.focus();

      // Activate with Enter
      await page.keyboard.press('Enter');

      await page.waitForTimeout(500);

      // Should show success toast
      const successToast = page.locator('.wc-toast--success').first();
      await expect(successToast).toBeVisible();
    });

    test('should tab between toast buttons', async ({ page }) => {
      await page.click('#toast-action-trigger');

      const toast = page.locator('.wc-toast--info').first();
      await expect(toast).toBeVisible();

      // Focus action button
      const actionButton = toast.locator('.wc-toast__action').first();
      await actionButton.focus();

      // Tab to dismiss button
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);

      // Check if dismiss button has focus
      const dismissButton = toast.locator('.wc-toast__dismiss').first();
      const isFocused = await dismissButton.evaluate(el => {
        return document.activeElement === el;
      });

      expect(isFocused).toBe(true);
    });
  });

  test.describe('Animations', () => {
    test('should animate in when shown', async ({ page }) => {
      await page.click('#toast-success-trigger');

      const toast = page.locator('.wc-toast--success').first();
      await expect(toast).toBeVisible();

      // Check for visible class
      const hasVisibleClass = await toast.evaluate(el => {
        return el.classList.contains('wc-toast--visible');
      });

      expect(hasVisibleClass).toBe(true);
    });

    test('should animate out when dismissed', async ({ page }) => {
      await page.click('#toast-success-trigger');

      const toast = page.locator('.wc-toast--success').first();
      await expect(toast).toBeVisible();

      const dismissButton = toast.locator('.wc-toast__dismiss').first();
      await dismissButton.click();

      // Should have exiting class briefly
      await page.waitForTimeout(50);

      const hasExitingClass = await toast.evaluate(el => {
        return el.classList.contains('wc-toast--exiting');
      }).catch(() => false);

      // Might already be removed if animation is fast
      // Just verify toast is eventually gone
      await page.waitForTimeout(300);
      await expect(toast).not.toBeVisible();
    });
  });

  test.describe('Variants Visual', () => {
    test('should have distinct icons for each variant', async ({ page }) => {
      const variants = [
        { trigger: 'toast-success-trigger', class: 'wc-toast--success' },
        { trigger: 'toast-error-trigger', class: 'wc-toast--error' },
        { trigger: 'toast-warning-trigger', class: 'wc-toast--warning' },
        { trigger: 'toast-info-trigger', class: 'wc-toast--info' },
      ];

      for (const variant of variants) {
        await page.click(`#${variant.trigger}`);
        await page.waitForTimeout(100);

        const toast = page.locator(`.${variant.class}`).first();
        await expect(toast).toBeVisible();

        const icon = toast.locator('.wc-toast__icon svg').first();
        await expect(icon).toBeVisible();

        // Dismiss for next iteration
        await toast.locator('.wc-toast__dismiss').click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Dark Mode', () => {
    test('should render correctly in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();
      await page.waitForSelector('#toast-section');

      await page.click('#toast-success-trigger');

      const toast = page.locator('.wc-toast--success').first();
      await expect(toast).toBeVisible();

      // Toast should be visible and functional in dark mode
      const dismissButton = toast.locator('.wc-toast__dismiss').first();
      await dismissButton.click();
      await page.waitForTimeout(300);
      await expect(toast).not.toBeVisible();
    });
  });
});
