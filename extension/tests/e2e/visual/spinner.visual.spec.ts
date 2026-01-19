/**
 * Spinner Component - Visual Regression Tests
 *
 * Tests visual appearance of spinner across different sizes (sm, md, lg)
 * and color schemes.
 */

import { test, expect } from '@playwright/test';

test.describe('Spinner visual regression - light mode', () => {
  test('small size', async ({ page }) => {
    await page.goto('/?component=spinner&size=sm');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-sm.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('medium size', async ({ page }) => {
    await page.goto('/?component=spinner&size=md');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-md.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('large size', async ({ page }) => {
    await page.goto('/?component=spinner&size=lg');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-lg.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('all sizes showcase', async ({ page }) => {
    await page.goto('/?component=spinner&showcase=sizes');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-all-sizes.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('with custom color - primary', async ({ page }) => {
    await page.goto('/?component=spinner&size=md&color=primary');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-color-primary.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('with custom color - success', async ({ page }) => {
    await page.goto('/?component=spinner&size=md&color=success');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-color-success.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('with custom color - error', async ({ page }) => {
    await page.goto('/?component=spinner&size=md&color=error');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-color-error.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('with custom color - warning', async ({ page }) => {
    await page.goto('/?component=spinner&size=md&color=warning');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-color-warning.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('all colors showcase', async ({ page }) => {
    await page.goto('/?component=spinner&showcase=colors');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-all-colors.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('in button context', async ({ page }) => {
    await page.goto('/?component=spinner&context=button');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-in-button.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('on dark background', async ({ page }) => {
    await page.goto('/?component=spinner&background=dark');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-dark-bg.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('on light background', async ({ page }) => {
    await page.goto('/?component=spinner&background=light');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-light-bg.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('on colored backgrounds', async ({ page }) => {
    await page.goto('/?component=spinner&showcase=backgrounds');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-colored-backgrounds.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('centered in container', async ({ page }) => {
    await page.goto('/?component=spinner&layout=centered');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-centered.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('inline with text', async ({ page }) => {
    await page.goto('/?component=spinner&layout=inline');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-inline.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });
});

test.describe('Spinner visual regression - dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('small size dark', async ({ page }) => {
    await page.goto('/?component=spinner&size=sm');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-sm-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('medium size dark', async ({ page }) => {
    await page.goto('/?component=spinner&size=md');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-md-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('large size dark', async ({ page }) => {
    await page.goto('/?component=spinner&size=lg');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-lg-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('all sizes dark', async ({ page }) => {
    await page.goto('/?component=spinner&showcase=sizes');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-all-sizes-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('all colors dark', async ({ page }) => {
    await page.goto('/?component=spinner&showcase=colors');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-all-colors-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('in button context dark', async ({ page }) => {
    await page.goto('/?component=spinner&context=button');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-in-button-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('on colored backgrounds dark', async ({ page }) => {
    await page.goto('/?component=spinner&showcase=backgrounds');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-colored-backgrounds-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });
});

test.describe('Spinner visual regression - reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('with reduced motion', async ({ page }) => {
    await page.goto('/?component=spinner&size=md');
    await page.waitForSelector('[data-wc-component="spinner"]');

    const showcase = page.locator('[data-testid="spinner-showcase"]');
    await expect(showcase).toHaveScreenshot('spinner-reduced-motion.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });
});
