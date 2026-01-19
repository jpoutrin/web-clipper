/**
 * Progress Bar Component - Visual Regression Tests
 *
 * Tests visual appearance of linear and phased progress bars
 * across different sizes, states, and animations.
 */

import { test, expect } from '@playwright/test';

test.describe('Progress Bar visual regression - linear variant', () => {
  test('linear progress - all sizes', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=linear&showcase=sizes');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-linear-sizes.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('linear progress - 0%', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=linear&value=0');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-linear-0.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('linear progress - 25%', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=linear&value=25');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-linear-25.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('linear progress - 50%', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=linear&value=50');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-linear-50.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('linear progress - 75%', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=linear&value=75');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-linear-75.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('linear progress - 100%', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=linear&value=100');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-linear-100.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('linear progress - with percentage label', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=linear&value=65&showPercentage=true');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-linear-percentage.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('linear progress - animated with shimmer', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=linear&value=45&animated=true');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    // Note: animations are disabled for snapshot, capturing static shimmer state
    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-linear-animated.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });
});

test.describe('Progress Bar visual regression - phased variant', () => {
  test('phased progress - all pending', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=phased&phase=all-pending');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-phased-pending.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('phased progress - first active', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=phased&phase=first-active');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-phased-first-active.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('phased progress - middle active', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=phased&phase=middle-active');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-phased-middle-active.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('phased progress - last active', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=phased&phase=last-active');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-phased-last-active.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('phased progress - all completed', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=phased&phase=all-completed');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-phased-completed.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('phased progress - with error', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=phased&phase=error');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-phased-error.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('phased progress - all sizes', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=phased&showcase=sizes');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-phased-sizes.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('phased progress - with labels', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=phased&showLabels=true');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-phased-labels.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });
});

test.describe('Progress Bar visual regression - dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('linear progress dark', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=linear&value=60');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-linear-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('linear progress sizes dark', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=linear&showcase=sizes');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-linear-sizes-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('phased progress dark', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=phased&phase=middle-active');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-phased-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('phased progress completed dark', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=phased&phase=all-completed');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-phased-completed-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('phased progress error dark', async ({ page }) => {
    await page.goto('/?component=progress-bar&variant=phased&phase=error');
    await page.waitForSelector('[data-wc-component="progress-bar"]');

    const showcase = page.locator('[data-testid="progress-showcase"]');
    await expect(showcase).toHaveScreenshot('progress-bar-phased-error-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });
});
