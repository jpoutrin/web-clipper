/**
 * Dialog Component - Visual Regression Tests
 *
 * Tests visual appearance of dialog variants, with/without actions,
 * and different color schemes (default, success, warning, error).
 */

import { test, expect } from '@playwright/test';

test.describe('Dialog visual regression - light mode', () => {
  test('default variant', async ({ page }) => {
    await page.goto('/?component=dialog&variant=default');
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    // Capture full page including backdrop
    await expect(page).toHaveScreenshot('dialog-default.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
      fullPage: true,
    });
  });

  test('success variant', async ({ page }) => {
    await page.goto('/?component=dialog&variant=success');
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    await expect(page).toHaveScreenshot('dialog-success.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
      fullPage: true,
    });
  });

  test('warning variant', async ({ page }) => {
    await page.goto('/?component=dialog&variant=warning');
    await page.waitForSelector('[role="alertdialog"]', { state: 'visible' });

    await expect(page).toHaveScreenshot('dialog-warning.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
      fullPage: true,
    });
  });

  test('error variant', async ({ page }) => {
    await page.goto('/?component=dialog&variant=error');
    await page.waitForSelector('[role="alertdialog"]', { state: 'visible' });

    await expect(page).toHaveScreenshot('dialog-error.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
      fullPage: true,
    });
  });

  test('with icon', async ({ page }) => {
    await page.goto('/?component=dialog&variant=default&icon=true');
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toHaveScreenshot('dialog-with-icon.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('with description', async ({ page }) => {
    await page.goto('/?component=dialog&variant=default&description=true');
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toHaveScreenshot('dialog-with-description.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('with single action', async ({ page }) => {
    await page.goto('/?component=dialog&variant=default&actions=single');
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toHaveScreenshot('dialog-single-action.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('with two actions', async ({ page }) => {
    await page.goto('/?component=dialog&variant=default&actions=two');
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toHaveScreenshot('dialog-two-actions.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('with danger action', async ({ page }) => {
    await page.goto('/?component=dialog&variant=warning&actions=danger');
    await page.waitForSelector('[role="alertdialog"]', { state: 'visible' });

    const dialog = page.locator('[role="alertdialog"]');
    await expect(dialog).toHaveScreenshot('dialog-danger-action.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('dismissible with close button', async ({ page }) => {
    await page.goto('/?component=dialog&variant=default&dismissible=true');
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toHaveScreenshot('dialog-dismissible.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('non-dismissible', async ({ page }) => {
    await page.goto('/?component=dialog&variant=default&dismissible=false');
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toHaveScreenshot('dialog-non-dismissible.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('long content scrolling', async ({ page }) => {
    await page.goto('/?component=dialog&variant=default&content=long');
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toHaveScreenshot('dialog-long-content.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('all variants showcase', async ({ page }) => {
    await page.goto('/?component=dialog&showcase=variants');
    await page.waitForSelector('[data-testid="dialog-showcase"]');

    const showcase = page.locator('[data-testid="dialog-showcase"]');
    await expect(showcase).toHaveScreenshot('dialog-all-variants.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('focus state on action button', async ({ page }) => {
    await page.goto('/?component=dialog&variant=default&actions=two');
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    // Focus the primary action button
    const primaryButton = page.locator('[data-action="primary"]');
    await primaryButton.focus();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toHaveScreenshot('dialog-focus-action.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('hover state on close button', async ({ page }) => {
    await page.goto('/?component=dialog&variant=default&dismissible=true');
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    // Hover the close button
    const closeButton = page.locator('.wc-dialog-close');
    await closeButton.hover();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toHaveScreenshot('dialog-hover-close.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });
});

test.describe('Dialog visual regression - dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('default variant dark', async ({ page }) => {
    await page.goto('/?component=dialog&variant=default');
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    await expect(page).toHaveScreenshot('dialog-default-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
      fullPage: true,
    });
  });

  test('success variant dark', async ({ page }) => {
    await page.goto('/?component=dialog&variant=success');
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    await expect(page).toHaveScreenshot('dialog-success-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
      fullPage: true,
    });
  });

  test('warning variant dark', async ({ page }) => {
    await page.goto('/?component=dialog&variant=warning');
    await page.waitForSelector('[role="alertdialog"]', { state: 'visible' });

    await expect(page).toHaveScreenshot('dialog-warning-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
      fullPage: true,
    });
  });

  test('error variant dark', async ({ page }) => {
    await page.goto('/?component=dialog&variant=error');
    await page.waitForSelector('[role="alertdialog"]', { state: 'visible' });

    await expect(page).toHaveScreenshot('dialog-error-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
      fullPage: true,
    });
  });

  test('with actions dark', async ({ page }) => {
    await page.goto('/?component=dialog&variant=default&actions=two');
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toHaveScreenshot('dialog-actions-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('dismissible dark', async ({ page }) => {
    await page.goto('/?component=dialog&variant=default&dismissible=true');
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toHaveScreenshot('dialog-dismissible-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });
});
