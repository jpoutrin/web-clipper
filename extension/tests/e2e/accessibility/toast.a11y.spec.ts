/**
 * Toast Component Accessibility Tests
 *
 * Tests WCAG 2.1 AA compliance for toast notifications including:
 * - role="alert" for error/warning toasts
 * - role="status" for success/info toasts
 * - aria-live regions (assertive vs polite)
 * - aria-atomic="true" for complete announcements
 * - Keyboard dismissibility
 * - Focus management and pause on interaction
 */

import { test, expect } from '../fixtures/a11y.fixture';

test.describe('Toast Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components/toast.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Automated Accessibility Scan', () => {
    test('should have no violations - success toast', async ({ page, runA11yScan }) => {
      await page.click('[data-testid="show-success-toast"]');
      await page.waitForSelector('.wc-toast--success', { state: 'visible' });

      const results = await runA11yScan('.wc-toast--success');
      expect(results.violations).toEqual([]);
    });

    test('should have no violations - error toast', async ({ page, runA11yScan }) => {
      await page.click('[data-testid="show-error-toast"]');
      await page.waitForSelector('.wc-toast--error', { state: 'visible' });

      const results = await runA11yScan('.wc-toast--error');
      expect(results.violations).toEqual([]);
    });

    test('should have no violations - warning toast', async ({ page, runA11yScan }) => {
      await page.click('[data-testid="show-warning-toast"]');
      await page.waitForSelector('.wc-toast--warning', { state: 'visible' });

      const results = await runA11yScan('.wc-toast--warning');
      expect(results.violations).toEqual([]);
    });

    test('should have no violations - info toast', async ({ page, runA11yScan }) => {
      await page.click('[data-testid="show-info-toast"]');
      await page.waitForSelector('.wc-toast--info', { state: 'visible' });

      const results = await runA11yScan('.wc-toast--info');
      expect(results.violations).toEqual([]);
    });
  });

  test.describe('ARIA Roles and Live Regions', () => {
    test('error toast should have role="alert"', async ({ page }) => {
      await page.click('[data-testid="show-error-toast"]');

      const toast = page.locator('.wc-toast--error[role="alert"]');
      await expect(toast).toBeVisible();
    });

    test('warning toast should have role="alert"', async ({ page }) => {
      await page.click('[data-testid="show-warning-toast"]');

      const toast = page.locator('.wc-toast--warning[role="alert"]');
      await expect(toast).toBeVisible();
    });

    test('success toast should have role="status"', async ({ page }) => {
      await page.click('[data-testid="show-success-toast"]');

      const toast = page.locator('.wc-toast--success[role="status"]');
      await expect(toast).toBeVisible();
    });

    test('info toast should have role="status"', async ({ page }) => {
      await page.click('[data-testid="show-info-toast"]');

      const toast = page.locator('.wc-toast--info[role="status"]');
      await expect(toast).toBeVisible();
    });

    test('error toast should have aria-live="assertive"', async ({ page }) => {
      await page.click('[data-testid="show-error-toast"]');

      const toast = page.locator('.wc-toast--error');
      const ariaLive = await toast.getAttribute('aria-live');

      expect(ariaLive).toBe('assertive');
    });

    test('warning toast should have aria-live="assertive"', async ({ page }) => {
      await page.click('[data-testid="show-warning-toast"]');

      const toast = page.locator('.wc-toast--warning');
      const ariaLive = await toast.getAttribute('aria-live');

      expect(ariaLive).toBe('assertive');
    });

    test('success toast should have aria-live="polite"', async ({ page }) => {
      await page.click('[data-testid="show-success-toast"]');

      const toast = page.locator('.wc-toast--success');
      const ariaLive = await toast.getAttribute('aria-live');

      expect(ariaLive).toBe('polite');
    });

    test('info toast should have aria-live="polite"', async ({ page }) => {
      await page.click('[data-testid="show-info-toast"]');

      const toast = page.locator('.wc-toast--info');
      const ariaLive = await toast.getAttribute('aria-live');

      expect(ariaLive).toBe('polite');
    });

    test('toast should have aria-atomic="true"', async ({ page }) => {
      await page.click('[data-testid="show-success-toast"]');

      const toast = page.locator('.wc-toast');
      const ariaAtomic = await toast.getAttribute('aria-atomic');

      expect(ariaAtomic).toBe('true');
    });
  });

  test.describe('Screen Reader Announcements', () => {
    test('toast should announce title and description together', async ({
      page,
      getAriaLiveAnnouncements,
    }) => {
      await page.click('[data-testid="show-toast-with-description"]');
      await page.waitForTimeout(200);

      const announcements = await getAriaLiveAnnouncements();

      // Should include both title and description in announcement
      const hasCompleteAnnouncement = announcements.some((text) => {
        return text.length > 10; // Should be a complete message
      });

      expect(hasCompleteAnnouncement).toBe(true);
    });

    test('error toast should interrupt screen reader', async ({ page }) => {
      await page.click('[data-testid="show-error-toast"]');

      const toast = page.locator('.wc-toast--error');

      // Check for assertive announcement
      const ariaLive = await toast.getAttribute('aria-live');
      expect(ariaLive).toBe('assertive');

      // Check role
      const role = await toast.getAttribute('role');
      expect(role).toBe('alert');
    });

    test('success toast should not interrupt screen reader', async ({ page }) => {
      await page.click('[data-testid="show-success-toast"]');

      const toast = page.locator('.wc-toast--success');

      // Should use polite announcement
      const ariaLive = await toast.getAttribute('aria-live');
      expect(ariaLive).toBe('polite');
    });

    test('icon should be hidden from screen readers', async ({ page }) => {
      await page.click('[data-testid="show-success-toast"]');

      const icon = page.locator('.wc-toast__icon');
      const ariaHidden = await icon.getAttribute('aria-hidden');

      expect(ariaHidden).toBe('true');
    });
  });

  test.describe('Keyboard Interaction', () => {
    test('dismiss button should be keyboard accessible', async ({ page }) => {
      await page.click('[data-testid="show-success-toast"]');
      await page.waitForSelector('.wc-toast', { state: 'visible' });

      const dismissButton = page.locator('.wc-toast__dismiss');

      // Should be focusable
      await dismissButton.focus();
      await expect(dismissButton).toBeFocused();
    });

    test('dismiss button should have aria-label', async ({ page }) => {
      await page.click('[data-testid="show-success-toast"]');

      const dismissButton = page.locator('.wc-toast__dismiss');
      const ariaLabel = await dismissButton.getAttribute('aria-label');

      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toMatch(/dismiss|close/i);
    });

    test('Enter key should dismiss toast', async ({ page }) => {
      await page.click('[data-testid="show-success-toast"]');
      await page.waitForSelector('.wc-toast', { state: 'visible' });

      const dismissButton = page.locator('.wc-toast__dismiss');
      await dismissButton.focus();

      await page.keyboard.press('Enter');

      // Toast should be dismissed
      const toast = page.locator('.wc-toast');
      await expect(toast).not.toBeVisible({ timeout: 1000 });
    });

    test('Space key should dismiss toast', async ({ page }) => {
      await page.click('[data-testid="show-success-toast"]');
      await page.waitForSelector('.wc-toast', { state: 'visible' });

      const dismissButton = page.locator('.wc-toast__dismiss');
      await dismissButton.focus();

      await page.keyboard.press('Space');

      const toast = page.locator('.wc-toast');
      await expect(toast).not.toBeVisible({ timeout: 1000 });
    });

    test('action button should be keyboard accessible', async ({ page }) => {
      await page.click('[data-testid="show-toast-with-action"]');
      await page.waitForSelector('.wc-toast', { state: 'visible' });

      const actionButton = page.locator('.wc-toast__action');

      await actionButton.focus();
      await expect(actionButton).toBeFocused();
    });

    test('Tab should navigate between toast buttons', async ({ page }) => {
      await page.click('[data-testid="show-toast-with-action"]');
      await page.waitForSelector('.wc-toast', { state: 'visible' });

      // Tab to action button
      await page.keyboard.press('Tab');

      const actionButton = page.locator('.wc-toast__action');
      await expect(actionButton).toBeFocused();

      // Tab to dismiss button
      await page.keyboard.press('Tab');

      const dismissButton = page.locator('.wc-toast__dismiss');
      await expect(dismissButton).toBeFocused();
    });

    test('should support focus visible indicators', async ({ page, testFocusVisible }) => {
      await page.click('[data-testid="show-toast-with-action"]');
      await page.waitForSelector('.wc-toast', { state: 'visible' });

      await testFocusVisible();
    });
  });

  test.describe('Auto-dismiss and Timer Pause', () => {
    test('hovering toast should pause auto-dismiss timer', async ({ page }) => {
      await page.click('[data-testid="show-timed-toast"]');
      await page.waitForSelector('.wc-toast', { state: 'visible' });

      const toast = page.locator('.wc-toast');

      // Hover over toast
      await toast.hover();

      // Wait longer than dismiss time
      await page.waitForTimeout(6000);

      // Toast should still be visible
      await expect(toast).toBeVisible();
    });

    test('focusing toast elements should pause timer', async ({ page }) => {
      await page.click('[data-testid="show-timed-toast-with-action"]');
      await page.waitForSelector('.wc-toast', { state: 'visible' });

      const toast = page.locator('.wc-toast');
      const actionButton = page.locator('.wc-toast__action');

      // Focus action button
      await actionButton.focus();

      // Wait longer than dismiss time
      await page.waitForTimeout(6000);

      // Toast should still be visible due to focus
      await expect(toast).toBeVisible();
    });

    test('removing hover should resume timer', async ({ page }) => {
      await page.click('[data-testid="show-short-toast"]'); // 2 second toast
      await page.waitForSelector('.wc-toast', { state: 'visible' });

      const toast = page.locator('.wc-toast');

      // Hover to pause
      await toast.hover();
      await page.waitForTimeout(1000);

      // Move away to resume
      await page.mouse.move(0, 0);

      // Should dismiss after remaining time
      await expect(toast).not.toBeVisible({ timeout: 3000 });
    });

    test('progress bar should update during timer', async ({ page }) => {
      await page.click('[data-testid="show-timed-toast"]');
      await page.waitForSelector('.wc-toast', { state: 'visible' });

      const progress = page.locator('.wc-toast__progress-fill');

      // Initial width should be 0 or small
      const initialWidth = await progress.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).width);
      });

      // Wait a bit
      await page.waitForTimeout(1000);

      // Width should have increased
      const laterWidth = await progress.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).width);
      });

      expect(laterWidth).toBeGreaterThan(initialWidth);
    });
  });

  test.describe('Toast Stacking', () => {
    test('multiple toasts should all be accessible', async ({ page, runA11yScan }) => {
      // Show multiple toasts
      await page.click('[data-testid="show-success-toast"]');
      await page.click('[data-testid="show-info-toast"]');
      await page.click('[data-testid="show-warning-toast"]');

      await page.waitForTimeout(500);

      const results = await runA11yScan();
      expect(results.violations).toEqual([]);
    });

    test('should announce each toast separately', async ({
      page,
      getAriaLiveAnnouncements,
    }) => {
      await page.click('[data-testid="show-success-toast"]');
      await page.waitForTimeout(200);

      await page.click('[data-testid="show-info-toast"]');
      await page.waitForTimeout(200);

      const announcements = await getAriaLiveAnnouncements();

      // Should have at least 2 different announcements
      expect(announcements.length).toBeGreaterThanOrEqual(2);
    });

    test('each toast should have unique ID', async ({ page }) => {
      await page.click('[data-testid="show-success-toast"]');
      await page.click('[data-testid="show-info-toast"]');

      const toasts = page.locator('.wc-toast');
      const count = await toasts.count();

      const ids: string[] = [];
      for (let i = 0; i < count; i++) {
        const id = await toasts.nth(i).getAttribute('id');
        if (id) ids.push(id);
      }

      // All IDs should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  test.describe('Content Structure', () => {
    test('title should be prominent and readable', async ({ page }) => {
      await page.click('[data-testid="show-success-toast"]');

      const title = page.locator('.wc-toast__title');

      await expect(title).toBeVisible();

      const text = await title.textContent();
      expect(text).toBeTruthy();
      expect(text?.length).toBeGreaterThan(0);
    });

    test('description should be readable when present', async ({ page }) => {
      await page.click('[data-testid="show-toast-with-description"]');

      const description = page.locator('.wc-toast__description');

      await expect(description).toBeVisible();

      const text = await description.textContent();
      expect(text).toBeTruthy();
      expect(text?.length).toBeGreaterThan(0);
    });

    test('action button should have clear label', async ({ page }) => {
      await page.click('[data-testid="show-toast-with-action"]');

      const actionButton = page.locator('.wc-toast__action');

      const text = await actionButton.textContent();
      expect(text).toBeTruthy();
      expect(text?.length).toBeGreaterThan(2);
    });

    test('semantic HTML structure should be correct', async ({ page }) => {
      await page.click('[data-testid="show-success-toast"]');

      const toast = page.locator('.wc-toast');

      // Should contain proper elements
      await expect(toast.locator('.wc-toast__title')).toBeVisible();
      await expect(toast.locator('.wc-toast__icon')).toBeVisible();
      await expect(toast.locator('.wc-toast__dismiss')).toBeVisible();
    });
  });

  test.describe('Color Contrast', () => {
    test('success toast should have sufficient contrast', async ({ page }) => {
      await page.click('[data-testid="show-success-toast"]');

      const toast = page.locator('.wc-toast--success');

      const colors = await toast.evaluate((el) => ({
        bg: window.getComputedStyle(el).backgroundColor,
        color: window.getComputedStyle(el).color,
      }));

      expect(colors.bg).not.toBe('transparent');
      expect(colors.color).not.toBe('transparent');
      expect(colors.bg).not.toBe(colors.color);
    });

    test('error toast should have sufficient contrast', async ({ page }) => {
      await page.click('[data-testid="show-error-toast"]');

      const toast = page.locator('.wc-toast--error');

      const colors = await toast.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          bg: styles.backgroundColor,
          color: styles.color,
          borderColor: styles.borderColor,
        };
      });

      expect(colors.bg).not.toBe('transparent');
      expect(colors.color).not.toBe('transparent');
    });

    test('action button should have adequate contrast', async ({ page }) => {
      await page.click('[data-testid="show-toast-with-action"]');

      const actionButton = page.locator('.wc-toast__action');

      const hasContrast = await actionButton.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.color !== 'transparent' && styles.color !== styles.backgroundColor;
      });

      expect(hasContrast).toBe(true);
    });
  });

  test.describe('Variant Visual Distinction', () => {
    test('each variant should have distinct styling', async ({ page }) => {
      const variants = ['success', 'error', 'warning', 'info'];

      const styles: Record<string, string> = {};

      for (const variant of variants) {
        await page.click(`[data-testid="show-${variant}-toast"]`);
        await page.waitForTimeout(200);

        const toast = page.locator(`.wc-toast--${variant}`);
        const bgColor = await toast.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        styles[variant] = bgColor;

        // Dismiss toast
        await page.click('.wc-toast__dismiss');
        await page.waitForTimeout(300);
      }

      // All variants should have different background colors
      const uniqueColors = new Set(Object.values(styles));
      expect(uniqueColors.size).toBe(variants.length);
    });

    test('icon should match variant type', async ({ page }) => {
      await page.click('[data-testid="show-success-toast"]');

      const icon = page.locator('.wc-toast--success .wc-toast__icon svg');

      await expect(icon).toBeVisible();
      // Success icon should be present
      await expect(icon).toBeAttached();
    });
  });

  test.describe('Reduced Motion', () => {
    test('should respect prefers-reduced-motion for entrance', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });

      await page.click('[data-testid="show-success-toast"]');

      const toast = page.locator('.wc-toast');

      const transition = await toast.evaluate((el) => {
        return window.getComputedStyle(el).transition;
      });

      expect(transition).toBe('none');
    });

    test('should respect reduced motion for exit animation', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });

      await page.click('[data-testid="show-success-toast"]');
      await page.waitForSelector('.wc-toast', { state: 'visible' });

      // Dismiss
      await page.click('.wc-toast__dismiss');

      const toast = page.locator('.wc-toast');

      const animation = await toast.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.animation === 'none' || styles.animationDuration === '0s';
      });

      expect(animation).toBe(true);
    });

    test('progress bar animation should respect reduced motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });

      await page.click('[data-testid="show-timed-toast"]');

      const progress = page.locator('.wc-toast__progress-fill');

      const transition = await progress.evaluate((el) => {
        return window.getComputedStyle(el).transition;
      });

      expect(transition).toBe('none');
    });
  });

  test.describe('Dark Mode', () => {
    test('should maintain accessibility in dark mode', async ({ page, runA11yScan }) => {
      await page.emulateMedia({ colorScheme: 'dark' });

      await page.click('[data-testid="show-success-toast"]');
      await page.waitForSelector('.wc-toast', { state: 'visible' });

      const results = await runA11yScan();
      expect(results.violations).toEqual([]);
    });

    test('should maintain contrast in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });

      await page.click('[data-testid="show-success-toast"]');

      const toast = page.locator('.wc-toast');

      const colors = await toast.evaluate((el) => ({
        bg: window.getComputedStyle(el).backgroundColor,
        color: window.getComputedStyle(el).color,
      }));

      expect(colors.bg).not.toBe('transparent');
      expect(colors.color).not.toBe('transparent');
      expect(colors.bg).not.toBe(colors.color);
    });
  });

  test.describe('Non-dismissible Toasts', () => {
    test('non-dismissible toast should not have dismiss button', async ({ page }) => {
      await page.click('[data-testid="show-non-dismissible-toast"]');

      const toast = page.locator('.wc-toast');
      await expect(toast).toBeVisible();

      const dismissButton = toast.locator('.wc-toast__dismiss');
      await expect(dismissButton).not.toBeAttached();
    });

    test('non-dismissible toast should still be announced', async ({ page }) => {
      await page.click('[data-testid="show-non-dismissible-toast"]');

      const toast = page.locator('.wc-toast');

      const role = await toast.getAttribute('role');
      const ariaLive = await toast.getAttribute('aria-live');

      expect(role).toBeTruthy();
      expect(ariaLive).toBeTruthy();
    });
  });
});
