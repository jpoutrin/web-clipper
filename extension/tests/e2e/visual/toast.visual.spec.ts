/**
 * Toast Component - Visual Regression Tests
 *
 * Tests visual appearance of toast notifications across variants
 * (success, error, warning, info), with/without action buttons.
 */

import { test, expect } from '@playwright/test';

test.describe('Toast visual regression - light mode', () => {
  test('success variant', async ({ page }) => {
    await page.goto('/?component=toast&variant=success');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-success.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('error variant', async ({ page }) => {
    await page.goto('/?component=toast&variant=error');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-error.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('warning variant', async ({ page }) => {
    await page.goto('/?component=toast&variant=warning');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-warning.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('info variant', async ({ page }) => {
    await page.goto('/?component=toast&variant=info');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-info.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('all variants showcase', async ({ page }) => {
    await page.goto('/?component=toast&showcase=variants');
    await page.waitForSelector('[data-testid="toast-showcase"]');

    const showcase = page.locator('[data-testid="toast-showcase"]');
    await expect(showcase).toHaveScreenshot('toast-all-variants.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('with title only', async ({ page }) => {
    await page.goto('/?component=toast&variant=success&content=title-only');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-title-only.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('with title and description', async ({ page }) => {
    await page.goto('/?component=toast&variant=success&content=with-description');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-with-description.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('with action button', async ({ page }) => {
    await page.goto('/?component=toast&variant=success&action=true');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-with-action.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('with action button - all variants', async ({ page }) => {
    await page.goto('/?component=toast&showcase=actions');
    await page.waitForSelector('[data-testid="toast-showcase"]');

    const showcase = page.locator('[data-testid="toast-showcase"]');
    await expect(showcase).toHaveScreenshot('toast-actions-all.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('dismissible with close button', async ({ page }) => {
    await page.goto('/?component=toast&variant=info&dismissible=true');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-dismissible.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('non-dismissible', async ({ page }) => {
    await page.goto('/?component=toast&variant=info&dismissible=false');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-non-dismissible.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('with progress bar', async ({ page }) => {
    await page.goto('/?component=toast&variant=success&progress=true');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-with-progress.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('long title text', async ({ page }) => {
    await page.goto('/?component=toast&variant=info&content=long-title');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-long-title.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('long description text', async ({ page }) => {
    await page.goto('/?component=toast&variant=info&content=long-description');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-long-description.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('hover state on action button', async ({ page }) => {
    await page.goto('/?component=toast&variant=success&action=true');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    // Hover the action button
    const actionButton = page.locator('.wc-toast__action');
    await actionButton.hover();

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-hover-action.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('hover state on dismiss button', async ({ page }) => {
    await page.goto('/?component=toast&variant=success&dismissible=true');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    // Hover the dismiss button
    const dismissButton = page.locator('.wc-toast__dismiss');
    await dismissButton.hover();

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-hover-dismiss.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('focus state on action button', async ({ page }) => {
    await page.goto('/?component=toast&variant=success&action=true');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    // Focus the action button
    const actionButton = page.locator('.wc-toast__action');
    await actionButton.focus();

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-focus-action.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('focus state on dismiss button', async ({ page }) => {
    await page.goto('/?component=toast&variant=success&dismissible=true');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    // Focus the dismiss button
    const dismissButton = page.locator('.wc-toast__dismiss');
    await dismissButton.focus();

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-focus-dismiss.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('stacked toasts', async ({ page }) => {
    await page.goto('/?component=toast&showcase=stacked');
    await page.waitForSelector('[data-testid="toast-showcase"]');

    const showcase = page.locator('[data-testid="toast-showcase"]');
    await expect(showcase).toHaveScreenshot('toast-stacked.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });
});

test.describe('Toast visual regression - dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('success variant dark', async ({ page }) => {
    await page.goto('/?component=toast&variant=success');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-success-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('error variant dark', async ({ page }) => {
    await page.goto('/?component=toast&variant=error');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-error-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('warning variant dark', async ({ page }) => {
    await page.goto('/?component=toast&variant=warning');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-warning-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('info variant dark', async ({ page }) => {
    await page.goto('/?component=toast&variant=info');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-info-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('all variants dark', async ({ page }) => {
    await page.goto('/?component=toast&showcase=variants');
    await page.waitForSelector('[data-testid="toast-showcase"]');

    const showcase = page.locator('[data-testid="toast-showcase"]');
    await expect(showcase).toHaveScreenshot('toast-all-variants-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('with description dark', async ({ page }) => {
    await page.goto('/?component=toast&variant=success&content=with-description');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-with-description-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('with action dark', async ({ page }) => {
    await page.goto('/?component=toast&variant=success&action=true');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-with-action-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('dismissible dark', async ({ page }) => {
    await page.goto('/?component=toast&variant=info&dismissible=true');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-dismissible-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('with progress dark', async ({ page }) => {
    await page.goto('/?component=toast&variant=success&progress=true');
    await page.waitForSelector('.wc-toast', { state: 'visible' });

    const toast = page.locator('.wc-toast');
    await expect(toast).toHaveScreenshot('toast-with-progress-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('stacked toasts dark', async ({ page }) => {
    await page.goto('/?component=toast&showcase=stacked');
    await page.waitForSelector('[data-testid="toast-showcase"]');

    const showcase = page.locator('[data-testid="toast-showcase"]');
    await expect(showcase).toHaveScreenshot('toast-stacked-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });
});
