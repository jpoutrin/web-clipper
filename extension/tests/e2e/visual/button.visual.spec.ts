/**
 * Button Component - Visual Regression Tests
 *
 * Tests visual appearance of button variants, sizes, and states
 * across light/dark modes and interaction states.
 */

import { test, expect } from '@playwright/test';

test.describe('Button visual regression - light mode', () => {
  test('primary variant', async ({ page }) => {
    await page.goto('/?component=button&variant=primary');
    await page.waitForSelector('[data-wc-component="button"]');

    const showcase = page.locator('[data-testid="button-showcase"]');
    await expect(showcase).toHaveScreenshot('button-primary.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('secondary variant', async ({ page }) => {
    await page.goto('/?component=button&variant=secondary');
    await page.waitForSelector('[data-wc-component="button"]');

    const showcase = page.locator('[data-testid="button-showcase"]');
    await expect(showcase).toHaveScreenshot('button-secondary.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('ghost variant', async ({ page }) => {
    await page.goto('/?component=button&variant=ghost');
    await page.waitForSelector('[data-wc-component="button"]');

    const showcase = page.locator('[data-testid="button-showcase"]');
    await expect(showcase).toHaveScreenshot('button-ghost.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('danger variant', async ({ page }) => {
    await page.goto('/?component=button&variant=danger');
    await page.waitForSelector('[data-wc-component="button"]');

    const showcase = page.locator('[data-testid="button-showcase"]');
    await expect(showcase).toHaveScreenshot('button-danger.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('all sizes', async ({ page }) => {
    await page.goto('/?component=button&showcase=sizes');
    await page.waitForSelector('[data-wc-component="button"]');

    const showcase = page.locator('[data-testid="button-showcase"]');
    await expect(showcase).toHaveScreenshot('button-sizes.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('with icons', async ({ page }) => {
    await page.goto('/?component=button&showcase=icons');
    await page.waitForSelector('[data-wc-component="button"]');

    const showcase = page.locator('[data-testid="button-showcase"]');
    await expect(showcase).toHaveScreenshot('button-icons.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('icon-only buttons', async ({ page }) => {
    await page.goto('/?component=button&showcase=icon-only');
    await page.waitForSelector('[data-wc-component="button"]');

    const showcase = page.locator('[data-testid="button-showcase"]');
    await expect(showcase).toHaveScreenshot('button-icon-only.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('hover state', async ({ page }) => {
    await page.goto('/?component=button&variant=primary&size=md');
    await page.waitForSelector('[data-wc-component="button"]');

    const button = page.locator('[data-wc-component="button"]').first();
    await button.hover();

    const showcase = page.locator('[data-testid="button-showcase"]');
    await expect(showcase).toHaveScreenshot('button-hover.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('focus state', async ({ page }) => {
    await page.goto('/?component=button&variant=primary&size=md');
    await page.waitForSelector('[data-wc-component="button"]');

    const button = page.locator('[data-wc-component="button"]').first();
    await button.focus();

    const showcase = page.locator('[data-testid="button-showcase"]');
    await expect(showcase).toHaveScreenshot('button-focus.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('disabled state', async ({ page }) => {
    await page.goto('/?component=button&state=disabled');
    await page.waitForSelector('[data-wc-component="button"]');

    const showcase = page.locator('[data-testid="button-showcase"]');
    await expect(showcase).toHaveScreenshot('button-disabled.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('loading state', async ({ page }) => {
    await page.goto('/?component=button&state=loading');
    await page.waitForSelector('[data-wc-component="button"]');

    // Disable animations for consistent spinner appearance
    const showcase = page.locator('[data-testid="button-showcase"]');
    await expect(showcase).toHaveScreenshot('button-loading.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('full width variant', async ({ page }) => {
    await page.goto('/?component=button&variant=primary&fullWidth=true');
    await page.waitForSelector('[data-wc-component="button"]');

    const showcase = page.locator('[data-testid="button-showcase"]');
    await expect(showcase).toHaveScreenshot('button-full-width.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });
});

test.describe('Button visual regression - dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('primary variant dark', async ({ page }) => {
    await page.goto('/?component=button&variant=primary');
    await page.waitForSelector('[data-wc-component="button"]');

    const showcase = page.locator('[data-testid="button-showcase"]');
    await expect(showcase).toHaveScreenshot('button-primary-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('secondary variant dark', async ({ page }) => {
    await page.goto('/?component=button&variant=secondary');
    await page.waitForSelector('[data-wc-component="button"]');

    const showcase = page.locator('[data-testid="button-showcase"]');
    await expect(showcase).toHaveScreenshot('button-secondary-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('ghost variant dark', async ({ page }) => {
    await page.goto('/?component=button&variant=ghost');
    await page.waitForSelector('[data-wc-component="button"]');

    const showcase = page.locator('[data-testid="button-showcase"]');
    await expect(showcase).toHaveScreenshot('button-ghost-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('danger variant dark', async ({ page }) => {
    await page.goto('/?component=button&variant=danger');
    await page.waitForSelector('[data-wc-component="button"]');

    const showcase = page.locator('[data-testid="button-showcase"]');
    await expect(showcase).toHaveScreenshot('button-danger-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('all sizes dark', async ({ page }) => {
    await page.goto('/?component=button&showcase=sizes');
    await page.waitForSelector('[data-wc-component="button"]');

    const showcase = page.locator('[data-testid="button-showcase"]');
    await expect(showcase).toHaveScreenshot('button-sizes-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('disabled state dark', async ({ page }) => {
    await page.goto('/?component=button&state=disabled');
    await page.waitForSelector('[data-wc-component="button"]');

    const showcase = page.locator('[data-testid="button-showcase"]');
    await expect(showcase).toHaveScreenshot('button-disabled-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('loading state dark', async ({ page }) => {
    await page.goto('/?component=button&state=loading');
    await page.waitForSelector('[data-wc-component="button"]');

    const showcase = page.locator('[data-testid="button-showcase"]');
    await expect(showcase).toHaveScreenshot('button-loading-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });
});
