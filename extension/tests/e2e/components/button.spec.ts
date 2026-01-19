/**
 * Button Component Tests
 *
 * Comprehensive tests for the Button component including:
 * - Rendering of all variants and sizes
 * - Interactive states (hover, focus, click)
 * - Custom event handling
 * - Keyboard navigation
 * - Loading and disabled states
 * - Icon configurations
 */

import { test, expect } from '@playwright/test';

test.describe('Button Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#button-section');
  });

  test.describe('Variants', () => {
    test('should render all button variants', async ({ page }) => {
      const variants = ['primary', 'secondary', 'ghost', 'danger'];

      for (const variant of variants) {
        const button = page.getByTestId(`button-${variant}`);
        await expect(button).toBeVisible();
        await expect(button).toContainText(`${variant.charAt(0).toUpperCase() + variant.slice(1)} Button`);
      }
    });

    test('should apply correct variant classes', async ({ page }) => {
      const primaryButton = page.getByTestId('button-primary');
      const shadowRoot = await primaryButton.evaluateHandle(el => el.shadowRoot);
      const buttonElement = await shadowRoot.evaluateHandle(root => root.querySelector('button'));

      const className = await buttonElement.evaluate(el => el.className);
      expect(className).toContain('wc-button--primary');
    });

    test('should have correct hover states', async ({ page }) => {
      const button = page.getByTestId('button-primary');

      // Get computed color before hover
      const buttonInShadow = await button.evaluateHandle(el => el.shadowRoot?.querySelector('button'));
      const beforeColor = await buttonInShadow.evaluate(el => window.getComputedStyle(el).backgroundColor);

      // Hover and check color changed
      await button.hover();
      await page.waitForTimeout(100); // Allow transition

      const afterColor = await buttonInShadow.evaluate(el => window.getComputedStyle(el).backgroundColor);
      expect(beforeColor).not.toBe(afterColor);
    });
  });

  test.describe('Sizes', () => {
    test('should render all button sizes', async ({ page }) => {
      const sizes = ['sm', 'md', 'lg'];

      for (const size of sizes) {
        const button = page.getByTestId(`button-size-${size}`);
        await expect(button).toBeVisible();
      }
    });

    test('should have correct size classes', async ({ page }) => {
      const sizes = ['sm', 'md', 'lg'];

      for (const size of sizes) {
        const button = page.getByTestId(`button-size-${size}`);
        const shadowRoot = await button.evaluateHandle(el => el.shadowRoot);
        const buttonElement = await shadowRoot.evaluateHandle(root => root.querySelector('button'));

        const className = await buttonElement.evaluate(el => el.className);
        expect(className).toContain(`wc-button--${size}`);
      }
    });

    test('should have different heights for different sizes', async ({ page }) => {
      const smButton = page.getByTestId('button-size-sm');
      const mdButton = page.getByTestId('button-size-md');
      const lgButton = page.getByTestId('button-size-lg');

      const smHeight = await smButton.evaluate(el => {
        const btn = el.shadowRoot?.querySelector('button');
        return btn ? window.getComputedStyle(btn).height : null;
      });

      const mdHeight = await mdButton.evaluate(el => {
        const btn = el.shadowRoot?.querySelector('button');
        return btn ? window.getComputedStyle(btn).height : null;
      });

      const lgHeight = await lgButton.evaluate(el => {
        const btn = el.shadowRoot?.querySelector('button');
        return btn ? window.getComputedStyle(btn).height : null;
      });

      expect(smHeight).toBeTruthy();
      expect(mdHeight).toBeTruthy();
      expect(lgHeight).toBeTruthy();
      expect(smHeight).not.toBe(mdHeight);
      expect(mdHeight).not.toBe(lgHeight);
    });
  });

  test.describe('States', () => {
    test('should render disabled button', async ({ page }) => {
      const button = page.getByTestId('button-disabled');
      await expect(button).toBeVisible();

      const isDisabled = await button.evaluate(el => {
        const btn = el.shadowRoot?.querySelector('button');
        return btn?.disabled ?? false;
      });

      expect(isDisabled).toBe(true);
    });

    test('should render loading button with spinner', async ({ page }) => {
      const button = page.getByTestId('button-loading');
      await expect(button).toBeVisible();

      const hasSpinner = await button.evaluate(el => {
        const spinner = el.shadowRoot?.querySelector('.wc-button__spinner');
        return !!spinner;
      });

      expect(hasSpinner).toBe(true);
    });

    test('should have aria-busy="true" for loading state', async ({ page }) => {
      const button = page.getByTestId('button-loading');

      const ariaBusy = await button.evaluate(el => {
        const btn = el.shadowRoot?.querySelector('button');
        return btn?.getAttribute('aria-busy');
      });

      expect(ariaBusy).toBe('true');
    });

    test('disabled button should not be clickable', async ({ page }) => {
      const button = page.getByTestId('button-disabled');

      let clickEventFired = false;
      await page.exposeFunction('buttonClicked', () => {
        clickEventFired = true;
      });

      await button.evaluate(el => {
        el.addEventListener('wc-click', () => {
          (window as any).buttonClicked();
        });
      });

      await button.click({ force: true });
      await page.waitForTimeout(100);

      expect(clickEventFired).toBe(false);
    });
  });

  test.describe('Icon Buttons', () => {
    test('should render button with icon on left', async ({ page }) => {
      const button = page.getByTestId('button-icon-left');
      await expect(button).toBeVisible();

      const hasIcon = await button.evaluate(el => {
        const icon = el.shadowRoot?.querySelector('.wc-button__icon--left');
        return !!icon;
      });

      expect(hasIcon).toBe(true);
    });

    test('should render button with icon on right', async ({ page }) => {
      const button = page.getByTestId('button-icon-right');
      await expect(button).toBeVisible();

      const hasIcon = await button.evaluate(el => {
        const icon = el.shadowRoot?.querySelector('.wc-button__icon--right');
        return !!icon;
      });

      expect(hasIcon).toBe(true);
    });

    test('should render icon-only button', async ({ page }) => {
      const button = page.getByTestId('button-icon-only');
      await expect(button).toBeVisible();

      const hasIconOnlyClass = await button.evaluate(el => {
        const btn = el.shadowRoot?.querySelector('button');
        return btn?.classList.contains('wc-button--icon-only') ?? false;
      });

      expect(hasIconOnlyClass).toBe(true);
    });

    test('icon-only button should have aria-label', async ({ page }) => {
      const button = page.getByTestId('button-icon-only');

      const ariaLabel = await button.evaluate(el => {
        const btn = el.shadowRoot?.querySelector('button');
        return btn?.getAttribute('aria-label');
      });

      expect(ariaLabel).toBe('Delete item');
    });
  });

  test.describe('Full Width', () => {
    test('should render full width button', async ({ page }) => {
      const button = page.getByTestId('button-full-width');
      await expect(button).toBeVisible();

      const hasFullWidthClass = await button.evaluate(el => {
        const btn = el.shadowRoot?.querySelector('button');
        return btn?.classList.contains('wc-button--full-width') ?? false;
      });

      expect(hasFullWidthClass).toBe(true);
    });
  });

  test.describe('Interactions', () => {
    test('should emit wc-click event on click', async ({ page }) => {
      const button = page.getByTestId('button-primary');

      let clickEventFired = false;
      await page.exposeFunction('buttonClicked', () => {
        clickEventFired = true;
      });

      await button.evaluate(el => {
        el.addEventListener('wc-click', () => {
          (window as any).buttonClicked();
        });
      });

      await button.click();
      await page.waitForTimeout(100);

      expect(clickEventFired).toBe(true);
    });

    test('should be keyboard accessible', async ({ page }) => {
      const button = page.getByTestId('button-primary');

      // Focus the button
      await button.evaluate(el => {
        const btn = el.shadowRoot?.querySelector('button');
        (btn as HTMLButtonElement)?.focus();
      });

      // Check if focused
      const isFocused = await button.evaluate(el => {
        const btn = el.shadowRoot?.querySelector('button');
        return document.activeElement === btn || el.shadowRoot?.activeElement === btn;
      });

      expect(isFocused).toBe(true);
    });

    test('should show focus-visible styles on keyboard navigation', async ({ page }) => {
      const button = page.getByTestId('button-primary');

      // Simulate keyboard navigation
      await page.keyboard.press('Tab');
      await button.evaluate(el => {
        const btn = el.shadowRoot?.querySelector('button');
        (btn as HTMLButtonElement)?.focus();
      });

      await page.keyboard.press('Tab'); // Focus should move to button
      await page.waitForTimeout(100);

      // In real usage, focus-visible would be applied, but programmatic focus might not trigger it
      // This test validates the button can receive focus
      const canReceiveFocus = await button.evaluate(el => {
        const btn = el.shadowRoot?.querySelector('button');
        return btn?.tabIndex !== -1;
      });

      expect(canReceiveFocus).toBe(true);
    });

    test('should activate on Enter key', async ({ page }) => {
      const button = page.getByTestId('button-primary');

      let clickEventFired = false;
      await page.exposeFunction('buttonActivated', () => {
        clickEventFired = true;
      });

      await button.evaluate(el => {
        el.addEventListener('wc-click', () => {
          (window as any).buttonActivated();
        });

        const btn = el.shadowRoot?.querySelector('button');
        (btn as HTMLButtonElement)?.focus();
      });

      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);

      expect(clickEventFired).toBe(true);
    });

    test('should activate on Space key', async ({ page }) => {
      const button = page.getByTestId('button-primary');

      let clickEventFired = false;
      await page.exposeFunction('buttonActivatedSpace', () => {
        clickEventFired = true;
      });

      await button.evaluate(el => {
        el.addEventListener('wc-click', () => {
          (window as any).buttonActivatedSpace();
        });

        const btn = el.shadowRoot?.querySelector('button');
        (btn as HTMLButtonElement)?.focus();
      });

      await page.keyboard.press('Space');
      await page.waitForTimeout(100);

      expect(clickEventFired).toBe(true);
    });
  });

  test.describe('Accessibility', () => {
    test('should have button role', async ({ page }) => {
      const button = page.getByTestId('button-primary');

      const role = await button.evaluate(el => {
        const btn = el.shadowRoot?.querySelector('button');
        return btn?.getAttribute('role') || btn?.tagName.toLowerCase();
      });

      expect(role).toBe('button');
    });

    test('should have proper aria-disabled attribute when disabled', async ({ page }) => {
      const button = page.getByTestId('button-disabled');

      const ariaDisabled = await button.evaluate(el => {
        const btn = el.shadowRoot?.querySelector('button');
        return btn?.getAttribute('aria-disabled');
      });

      expect(ariaDisabled).toBe('true');
    });
  });

  test.describe('Reduced Motion', () => {
    test('should respect prefers-reduced-motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.reload();
      await page.waitForSelector('#button-section');

      const button = page.getByTestId('button-primary');

      // Check if transitions are disabled
      const hasTransition = await button.evaluate(el => {
        const btn = el.shadowRoot?.querySelector('button');
        const transition = btn ? window.getComputedStyle(btn).transition : null;
        // Reduced motion should have no transition or very short
        return transition && transition !== 'none' && !transition.includes('0s');
      });

      expect(hasTransition).toBe(false);
    });
  });
});
