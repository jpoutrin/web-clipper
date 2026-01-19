/**
 * Badge Component - Visual Regression Tests
 *
 * Tests visual appearance of badge variants (default, success, warning, error, info),
 * sizes (sm, md), with/without icons, and removable functionality.
 */

import { test, expect } from '@playwright/test';

test.describe('Badge visual regression - light mode', () => {
  test('default variant', async ({ page }) => {
    await page.goto('/?component=badge&variant=default');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-default.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('success variant', async ({ page }) => {
    await page.goto('/?component=badge&variant=success');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-success.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('warning variant', async ({ page }) => {
    await page.goto('/?component=badge&variant=warning');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-warning.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('error variant', async ({ page }) => {
    await page.goto('/?component=badge&variant=error');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-error.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('info variant', async ({ page }) => {
    await page.goto('/?component=badge&variant=info');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-info.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('all variants showcase', async ({ page }) => {
    await page.goto('/?component=badge&showcase=variants');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-all-variants.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('small size', async ({ page }) => {
    await page.goto('/?component=badge&size=sm');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-size-sm.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('medium size', async ({ page }) => {
    await page.goto('/?component=badge&size=md');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-size-md.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('all sizes showcase', async ({ page }) => {
    await page.goto('/?component=badge&showcase=sizes');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-all-sizes.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('with icon', async ({ page }) => {
    await page.goto('/?component=badge&variant=success&icon=true');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-with-icon.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('with icon - all variants', async ({ page }) => {
    await page.goto('/?component=badge&showcase=icons');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-icons-all-variants.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('removable badge', async ({ page }) => {
    await page.goto('/?component=badge&variant=default&removable=true');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-removable.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('removable badges - all variants', async ({ page }) => {
    await page.goto('/?component=badge&showcase=removable');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-removable-all.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('hover state on remove button', async ({ page }) => {
    await page.goto('/?component=badge&variant=default&removable=true');
    await page.waitForSelector('[data-wc-component="badge"]');

    // Hover the remove button
    const removeButton = page.locator('.wc-badge__remove').first();
    await removeButton.hover();

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-hover-remove.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('focus state on remove button', async ({ page }) => {
    await page.goto('/?component=badge&variant=default&removable=true');
    await page.waitForSelector('[data-wc-component="badge"]');

    // Focus the remove button
    const removeButton = page.locator('.wc-badge__remove').first();
    await removeButton.focus();

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-focus-remove.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('long text labels', async ({ page }) => {
    await page.goto('/?component=badge&content=long');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-long-text.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('short text labels', async ({ page }) => {
    await page.goto('/?component=badge&content=short');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-short-text.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('numeric labels', async ({ page }) => {
    await page.goto('/?component=badge&content=numeric');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-numeric.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });
});

test.describe('Badge visual regression - dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('default variant dark', async ({ page }) => {
    await page.goto('/?component=badge&variant=default');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-default-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('success variant dark', async ({ page }) => {
    await page.goto('/?component=badge&variant=success');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-success-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('warning variant dark', async ({ page }) => {
    await page.goto('/?component=badge&variant=warning');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-warning-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('error variant dark', async ({ page }) => {
    await page.goto('/?component=badge&variant=error');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-error-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('info variant dark', async ({ page }) => {
    await page.goto('/?component=badge&variant=info');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-info-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('all variants dark', async ({ page }) => {
    await page.goto('/?component=badge&showcase=variants');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-all-variants-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('all sizes dark', async ({ page }) => {
    await page.goto('/?component=badge&showcase=sizes');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-all-sizes-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('with icons dark', async ({ page }) => {
    await page.goto('/?component=badge&showcase=icons');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-icons-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('removable dark', async ({ page }) => {
    await page.goto('/?component=badge&showcase=removable');
    await page.waitForSelector('[data-wc-component="badge"]');

    const showcase = page.locator('[data-testid="badge-showcase"]');
    await expect(showcase).toHaveScreenshot('badge-removable-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });
});
