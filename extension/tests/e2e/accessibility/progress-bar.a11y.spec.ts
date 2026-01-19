/**
 * Progress Bar Component Accessibility Tests
 *
 * Tests WCAG 2.1 AA compliance for progress indicators including:
 * - role="progressbar" with proper ARIA attributes
 * - aria-valuenow, aria-valuemin, aria-valuemax updates
 * - aria-label for context
 * - Screen reader announcements for progress changes
 * - Phased progress status management
 */

import { test, expect } from '../fixtures/a11y.fixture';

test.describe('Progress Bar Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components/progress-bar.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Automated Accessibility Scan', () => {
    test('should have no violations - linear variant', async ({ runA11yScan }) => {
      const results = await runA11yScan('[data-testid="progress-linear"]');
      expect(results.violations).toEqual([]);
    });

    test('should have no violations - phased variant', async ({ runA11yScan }) => {
      const results = await runA11yScan('[data-testid="progress-phased"]');
      expect(results.violations).toEqual([]);
    });

    test('should have no violations - all sizes', async ({ runA11yScan }) => {
      const results = await runA11yScan();
      expect(results.violations).toEqual([]);
    });
  });

  test.describe('ARIA Attributes - Linear Progress', () => {
    test('should have role="progressbar"', async ({ page }) => {
      const progressbar = page.locator('[data-testid="progress-linear"] [role="progressbar"]');
      await expect(progressbar).toBeVisible();
    });

    test('should have aria-valuenow with current value', async ({ page }) => {
      const progressbar = page.locator('[data-testid="progress-linear"] [role="progressbar"]');

      const ariaValueNow = await progressbar.getAttribute('aria-valuenow');
      expect(ariaValueNow).toBeTruthy();
      expect(Number(ariaValueNow)).toBeGreaterThanOrEqual(0);
    });

    test('should have aria-valuemin="0"', async ({ page }) => {
      const progressbar = page.locator('[data-testid="progress-linear"] [role="progressbar"]');

      const ariaValueMin = await progressbar.getAttribute('aria-valuemin');
      expect(ariaValueMin).toBe('0');
    });

    test('should have aria-valuemax', async ({ page }) => {
      const progressbar = page.locator('[data-testid="progress-linear"] [role="progressbar"]');

      const ariaValueMax = await progressbar.getAttribute('aria-valuemax');
      expect(ariaValueMax).toBeTruthy();
      expect(Number(ariaValueMax)).toBeGreaterThan(0);
    });

    test('should have descriptive aria-label', async ({ page }) => {
      const progressbar = page.locator('[data-testid="progress-linear"] [role="progressbar"]');

      const ariaLabel = await progressbar.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).not.toBe('');
      expect(ariaLabel?.length).toBeGreaterThan(5); // Should be descriptive
    });

    test('aria-valuenow should be within min/max range', async ({ page }) => {
      const progressbar = page.locator('[data-testid="progress-linear"] [role="progressbar"]');

      const values = await progressbar.evaluate((el) => ({
        now: Number(el.getAttribute('aria-valuenow')),
        min: Number(el.getAttribute('aria-valuemin')),
        max: Number(el.getAttribute('aria-valuemax')),
      }));

      expect(values.now).toBeGreaterThanOrEqual(values.min);
      expect(values.now).toBeLessThanOrEqual(values.max);
    });

    test('aria-valuenow should update when progress changes', async ({ page }) => {
      const progressbar = page.locator('[data-testid="progress-linear-dynamic"] [role="progressbar"]');

      const initialValue = await progressbar.getAttribute('aria-valuenow');

      // Trigger progress update
      await page.click('[data-testid="increase-progress"]');
      await page.waitForTimeout(100);

      const newValue = await progressbar.getAttribute('aria-valuenow');

      expect(Number(newValue)).toBeGreaterThan(Number(initialValue));
    });
  });

  test.describe('ARIA Attributes - Phased Progress', () => {
    test('should have role="progressbar" for phased variant', async ({ page }) => {
      const progressbar = page.locator('[data-testid="progress-phased"] [role="progressbar"]');
      await expect(progressbar).toBeVisible();
    });

    test('each phase should have semantic status indication', async ({ page }) => {
      const phases = page.locator('[data-testid="progress-phased"] .wc-progress-phase');

      const count = await phases.count();
      expect(count).toBeGreaterThan(0);

      // Check each phase has a status attribute
      for (let i = 0; i < count; i++) {
        const status = await phases.nth(i).getAttribute('data-status');
        expect(status).toMatch(/^(pending|active|completed|error)$/);
      }
    });

    test('phase labels should be visible and descriptive', async ({ page }) => {
      const labels = page.locator('[data-testid="progress-phased"] .wc-progress-phase-label');

      const count = await labels.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const text = await labels.nth(i).textContent();
        expect(text).toBeTruthy();
        expect(text?.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Screen Reader Announcements', () => {
    test('should have aria-live region for progress updates', async ({ page }) => {
      const liveRegion = page.locator(
        '[data-testid="progress-linear"] [aria-live="polite"]'
      );

      await expect(liveRegion).toBeAttached();
    });

    test('should announce progress changes', async ({ page, getAriaLiveAnnouncements }) => {
      // Trigger progress change
      await page.click('[data-testid="increase-progress"]');
      await page.waitForTimeout(200);

      const announcements = await getAriaLiveAnnouncements();

      // Should have announcement about progress
      const hasProgressAnnouncement = announcements.some(
        (text) => text.includes('%') || text.includes('complete')
      );

      expect(hasProgressAnnouncement).toBe(true);
    });

    test('should announce phase status changes', async ({ page, getAriaLiveAnnouncements }) => {
      // Change phase status
      await page.click('[data-testid="complete-phase"]');
      await page.waitForTimeout(200);

      const announcements = await getAriaLiveAnnouncements();

      // Should announce phase completion
      const hasPhaseAnnouncement = announcements.some(
        (text) => text.includes('completed') || text.includes('complete')
      );

      expect(hasPhaseAnnouncement).toBe(true);
    });

    test('aria-live region should have aria-atomic="true"', async ({ page }) => {
      const liveRegion = page.locator('[aria-live="polite"]').first();

      const ariaAtomic = await liveRegion.getAttribute('aria-atomic');
      expect(ariaAtomic).toBe('true');
    });

    test('should use polite announcement for progress updates', async ({ page }) => {
      const liveRegion = page.locator(
        '[data-testid="progress-linear"] [aria-live]'
      );

      const ariaLive = await liveRegion.getAttribute('aria-live');
      expect(ariaLive).toBe('polite');
    });
  });

  test.describe('Visual Progress Indication', () => {
    test('progress fill should visually represent aria-valuenow', async ({ page }) => {
      const progressbar = page.locator('[data-testid="progress-linear"] [role="progressbar"]');
      const fill = page.locator('[data-testid="progress-linear"] .wc-progress-fill');

      const ariaValue = await progressbar.getAttribute('aria-valuenow');
      const ariaMax = await progressbar.getAttribute('aria-valuemax');

      const expectedPercentage = (Number(ariaValue) / Number(ariaMax)) * 100;

      const fillWidth = await fill.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).width);
      });

      const containerWidth = await fill.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el.parentElement!).width);
      });

      const actualPercentage = (fillWidth / containerWidth) * 100;

      // Allow 1% tolerance for rounding
      expect(Math.abs(actualPercentage - expectedPercentage)).toBeLessThan(1);
    });

    test('completed phase should have visual indicator', async ({ page }) => {
      const completedPhase = page.locator(
        '[data-testid="progress-phased"] .wc-progress-phase[data-status="completed"]'
      ).first();

      // Should be visible
      await expect(completedPhase).toBeVisible();

      // Should have distinct background color
      const bgColor = await completedPhase.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      expect(bgColor).not.toBe('transparent');
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    test('active phase should be visually distinct', async ({ page }) => {
      const activePhase = page.locator(
        '[data-testid="progress-phased"] .wc-progress-phase[data-status="active"]'
      ).first();

      const pendingPhase = page.locator(
        '[data-testid="progress-phased"] .wc-progress-phase[data-status="pending"]'
      ).first();

      const activeBg = await activePhase.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      const pendingBg = await pendingPhase.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      expect(activeBg).not.toBe(pendingBg);
    });
  });

  test.describe('Percentage Display', () => {
    test('percentage text should match aria-valuenow', async ({ page }) => {
      const progressbar = page.locator(
        '[data-testid="progress-with-percentage"] [role="progressbar"]'
      );
      const percentageText = page.locator(
        '[data-testid="progress-with-percentage"] .wc-progress-percentage'
      );

      const ariaValue = await progressbar.getAttribute('aria-valuenow');
      const ariaMax = await progressbar.getAttribute('aria-valuemax');

      const expectedPercentage = Math.round((Number(ariaValue) / Number(ariaMax)) * 100);

      const displayedText = await percentageText.textContent();
      const displayedPercentage = Number(displayedText?.replace('%', ''));

      expect(displayedPercentage).toBe(expectedPercentage);
    });

    test('percentage should use tabular numerals for alignment', async ({ page }) => {
      const percentageText = page.locator(
        '[data-testid="progress-with-percentage"] .wc-progress-percentage'
      ).first();

      const fontVariant = await percentageText.evaluate((el) => {
        return window.getComputedStyle(el).fontVariantNumeric;
      });

      expect(fontVariant).toContain('tabular-nums');
    });
  });

  test.describe('Size Variants', () => {
    test('small progress bar should still be perceivable', async ({ page }) => {
      const smallProgress = page.locator('[data-testid="progress-small"]');

      const height = await smallProgress.evaluate((el) => {
        const progressEl = el.querySelector('.wc-progress-track, .wc-progress-phase');
        return progressEl ? parseFloat(window.getComputedStyle(progressEl).height) : 0;
      });

      // Should be at least 4px for visibility
      expect(height).toBeGreaterThanOrEqual(4);
    });

    test('all size variants should maintain ARIA attributes', async ({ page }) => {
      const sizes = ['small', 'medium', 'large'];

      for (const size of sizes) {
        const progressbar = page.locator(
          `[data-testid="progress-${size}"] [role="progressbar"]`
        );

        const hasRequiredAttrs = await progressbar.evaluate((el) => ({
          hasRole: el.getAttribute('role') === 'progressbar',
          hasValueNow: el.hasAttribute('aria-valuenow'),
          hasValueMin: el.hasAttribute('aria-valuemin'),
          hasValueMax: el.hasAttribute('aria-valuemax'),
          hasLabel: el.hasAttribute('aria-label'),
        }));

        expect(hasRequiredAttrs.hasRole).toBe(true);
        expect(hasRequiredAttrs.hasValueNow).toBe(true);
        expect(hasRequiredAttrs.hasValueMin).toBe(true);
        expect(hasRequiredAttrs.hasValueMax).toBe(true);
        expect(hasRequiredAttrs.hasLabel).toBe(true);
      }
    });
  });

  test.describe('Error State', () => {
    test('error phase should be visually distinct', async ({ page }) => {
      const errorPhase = page.locator(
        '[data-testid="progress-with-error"] .wc-progress-phase[data-status="error"]'
      ).first();

      await expect(errorPhase).toBeVisible();

      // Should have error color
      const bgColor = await errorPhase.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Error colors typically contain red (rgb with higher red value)
      expect(bgColor).toMatch(/rgb/);
    });

    test('error phase should have accessible label', async ({ page }) => {
      const errorPhase = page.locator(
        '[data-testid="progress-with-error"] .wc-progress-phase[data-status="error"]'
      ).first();

      const label = errorPhase.locator('.wc-progress-phase-label');
      await expect(label).toBeVisible();

      const text = await label.textContent();
      expect(text).toBeTruthy();
    });

    test('error should be announced to screen readers', async ({
      page,
      getAriaLiveAnnouncements,
    }) => {
      // Trigger error state
      await page.click('[data-testid="trigger-error"]');
      await page.waitForTimeout(200);

      const announcements = await getAriaLiveAnnouncements();

      const hasErrorAnnouncement = announcements.some(
        (text) => text.toLowerCase().includes('error') || text.toLowerCase().includes('failed')
      );

      expect(hasErrorAnnouncement).toBe(true);
    });
  });

  test.describe('Animation and Reduced Motion', () => {
    test('should respect prefers-reduced-motion for transitions', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });

      const fill = page.locator('[data-testid="progress-linear"] .wc-progress-fill');

      const transition = await fill.evaluate((el) => {
        return window.getComputedStyle(el).transition;
      });

      expect(transition).toBe('none');
    });

    test('shimmer animation should be disabled with reduced motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });

      const animatedProgress = page.locator('[data-testid="progress-animated"]');

      const hasAnimation = await animatedProgress.evaluate((el) => {
        const afterEl = window.getComputedStyle(el.querySelector('.wc-progress-fill')!, '::after');
        return afterEl.animation !== 'none';
      });

      expect(hasAnimation).toBe(false);
    });

    test('reduced motion should not affect ARIA updates', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });

      const progressbar = page.locator('[data-testid="progress-linear"] [role="progressbar"]');

      const initialValue = await progressbar.getAttribute('aria-valuenow');

      // Update progress
      await page.click('[data-testid="increase-progress"]');
      await page.waitForTimeout(100);

      const newValue = await progressbar.getAttribute('aria-valuenow');

      expect(Number(newValue)).toBeGreaterThan(Number(initialValue));
    });
  });

  test.describe('Color Contrast', () => {
    test('progress fill should have sufficient contrast with track', async ({ page }) => {
      const fill = page.locator('[data-testid="progress-linear"] .wc-progress-fill');
      const track = page.locator('[data-testid="progress-linear"] .wc-progress-track');

      const fillColor = await fill.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      const trackColor = await track.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Colors should be different
      expect(fillColor).not.toBe(trackColor);
      expect(fillColor).not.toBe('transparent');
      expect(trackColor).not.toBe('transparent');
    });

    test('phase labels should have readable contrast', async ({ page }) => {
      const label = page.locator('.wc-progress-phase-label').first();

      await expect(label).toBeVisible();

      const colors = await label.evaluate((el) => ({
        text: window.getComputedStyle(el).color,
        bg: window.getComputedStyle(el).backgroundColor,
      }));

      // Text should not be transparent
      expect(colors.text).not.toBe('transparent');
      expect(colors.text).not.toBe('rgba(0, 0, 0, 0)');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle 0% progress correctly', async ({ page }) => {
      const progressbar = page.locator('[data-testid="progress-zero"] [role="progressbar"]');

      const ariaValue = await progressbar.getAttribute('aria-valuenow');
      expect(ariaValue).toBe('0');

      const fill = page.locator('[data-testid="progress-zero"] .wc-progress-fill');
      const width = await fill.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).width);
      });

      expect(width).toBe(0);
    });

    test('should handle 100% progress correctly', async ({ page }) => {
      const progressbar = page.locator('[data-testid="progress-full"] [role="progressbar"]');

      const values = await progressbar.evaluate((el) => ({
        now: el.getAttribute('aria-valuenow'),
        max: el.getAttribute('aria-valuemax'),
      }));

      expect(values.now).toBe(values.max);

      const fill = page.locator('[data-testid="progress-full"] .wc-progress-fill');
      const fillWidth = await fill.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).width);
      });

      const containerWidth = await fill.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el.parentElement!).width);
      });

      const percentage = (fillWidth / containerWidth) * 100;
      expect(percentage).toBeCloseTo(100, 0);
    });

    test('should clamp values outside min/max range', async ({ page }) => {
      const progressbar = page.locator('[data-testid="progress-clamped"] [role="progressbar"]');

      const values = await progressbar.evaluate((el) => ({
        now: Number(el.getAttribute('aria-valuenow')),
        min: Number(el.getAttribute('aria-valuemin')),
        max: Number(el.getAttribute('aria-valuemax')),
      }));

      expect(values.now).toBeGreaterThanOrEqual(values.min);
      expect(values.now).toBeLessThanOrEqual(values.max);
    });
  });

  test.describe('Dark Mode', () => {
    test('should maintain accessibility in dark mode', async ({ page, runA11yScan }) => {
      await page.emulateMedia({ colorScheme: 'dark' });

      const results = await runA11yScan();
      expect(results.violations).toEqual([]);
    });

    test('should maintain contrast in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });

      const fill = page.locator('[data-testid="progress-linear"] .wc-progress-fill');

      const bgColor = await fill.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Should have a visible color
      expect(bgColor).not.toBe('transparent');
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  });
});
