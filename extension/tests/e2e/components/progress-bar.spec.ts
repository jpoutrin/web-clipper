/**
 * ProgressBar Component Tests
 *
 * Comprehensive tests for the ProgressBar component including:
 * - Linear and phased variants
 * - Size variants (sm, md, lg)
 * - Value updates and animations
 * - Phase status management
 * - Accessibility attributes
 * - Percentage display
 */

import { test, expect } from '@playwright/test';

test.describe('ProgressBar Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#progressbar-section');
  });

  test.describe('Linear Variant', () => {
    test('should render linear progress bars in all sizes', async ({ page }) => {
      const sizes = ['sm', 'md', 'lg'];

      for (const size of sizes) {
        const progressBar = page.getByTestId(`progress-linear-${size}`);
        await expect(progressBar).toBeVisible();
      }
    });

    test('should display correct progress value', async ({ page }) => {
      const progressBar = page.getByTestId('progress-linear-sm');

      // Check aria-valuenow attribute
      const value = await progressBar.evaluate(el => {
        const progressElement = el.shadowRoot?.querySelector('[role="progressbar"]');
        return progressElement?.getAttribute('aria-valuenow');
      });

      expect(value).toBe('45'); // From fixture initialization
    });

    test('should display percentage text', async ({ page }) => {
      const progressBar = page.getByTestId('progress-linear-sm');

      const percentageText = await progressBar.evaluate(el => {
        const percentage = el.shadowRoot?.querySelector('[data-percentage]');
        return percentage?.textContent;
      });

      expect(percentageText).toBe('45%');
    });

    test('should have correct progress fill width', async ({ page }) => {
      const progressBar = page.getByTestId('progress-linear-md');

      const fillWidth = await progressBar.evaluate(el => {
        const fill = el.shadowRoot?.querySelector('[data-fill]') as HTMLElement;
        return fill?.style.width;
      });

      expect(fillWidth).toBe('65%'); // From fixture initialization
    });

    test('should update progress value dynamically', async ({ page }) => {
      // Use the interactive progress bar
      const progressBar = page.getByTestId('progress-interactive');

      // Get initial value
      const initialValue = await progressBar.evaluate(el => {
        const progressElement = el.shadowRoot?.querySelector('[role="progressbar"]');
        return progressElement?.getAttribute('aria-valuenow');
      });

      expect(initialValue).toBe('50');

      // Click increase button
      await page.click('#progress-increase');
      await page.waitForTimeout(100);

      // Check updated value
      const updatedValue = await progressBar.evaluate(el => {
        const progressElement = el.shadowRoot?.querySelector('[role="progressbar"]');
        return progressElement?.getAttribute('aria-valuenow');
      });

      expect(updatedValue).toBe('60');
    });

    test('should decrease progress value', async ({ page }) => {
      const progressBar = page.getByTestId('progress-interactive');

      // Click decrease button
      await page.click('#progress-decrease');
      await page.waitForTimeout(100);

      // Check updated value
      const updatedValue = await progressBar.evaluate(el => {
        const progressElement = el.shadowRoot?.querySelector('[role="progressbar"]');
        return progressElement?.getAttribute('aria-valuenow');
      });

      expect(updatedValue).toBe('40');
    });

    test('should have animated shimmer effect when enabled', async ({ page }) => {
      const progressBar = page.getByTestId('progress-linear-md');

      const hasAnimation = await progressBar.evaluate(el => {
        const progress = el.shadowRoot?.querySelector('.wc-progress');
        return progress?.classList.contains('animated') ?? false;
      });

      expect(hasAnimation).toBe(true);
    });
  });

  test.describe('Phased Variant', () => {
    test('should render phased progress bar', async ({ page }) => {
      const progressBar = page.getByTestId('progress-phased');
      await expect(progressBar).toBeVisible();
    });

    test('should render all phases', async ({ page }) => {
      const progressBar = page.getByTestId('progress-phased');

      const phases = await progressBar.evaluate(el => {
        const phaseElements = el.shadowRoot?.querySelectorAll('[data-phase]');
        return Array.from(phaseElements || []).map(phase => ({
          id: phase.getAttribute('data-phase'),
          status: phase.getAttribute('data-status'),
        }));
      });

      expect(phases).toHaveLength(3);
      expect(phases[0]).toEqual({ id: 'capture', status: 'completed' });
      expect(phases[1]).toEqual({ id: 'process', status: 'active' });
      expect(phases[2]).toEqual({ id: 'upload', status: 'pending' });
    });

    test('should display phase labels', async ({ page }) => {
      const progressBar = page.getByTestId('progress-phased');

      const labels = await progressBar.evaluate(el => {
        const labelElements = el.shadowRoot?.querySelectorAll('.wc-progress-phase-label');
        return Array.from(labelElements || []).map(label => label.textContent);
      });

      expect(labels).toContain('Capturing');
      expect(labels).toContain('Processing');
      expect(labels).toContain('Uploading');
    });

    test('should update phase status', async ({ page }) => {
      const progressBar = page.getByTestId('progress-phased');

      // Click next phase button
      await page.click('#progress-phase-next');
      await page.waitForTimeout(100);

      const phases = await progressBar.evaluate(el => {
        const phaseElements = el.shadowRoot?.querySelectorAll('[data-phase]');
        return Array.from(phaseElements || []).map(phase => ({
          id: phase.getAttribute('data-phase'),
          status: phase.getAttribute('data-status'),
        }));
      });

      // After clicking, the next phase should be updated
      expect(phases[0].status).toBe('completed');
    });

    test('should have correct phase width distribution', async ({ page }) => {
      const progressBar = page.getByTestId('progress-phased');

      const widths = await progressBar.evaluate(el => {
        const phaseElements = el.shadowRoot?.querySelectorAll('.wc-progress-phase') as NodeListOf<HTMLElement>;
        return Array.from(phaseElements || []).map(phase => phase.style.width);
      });

      // Each phase should have equal width (100% / 3 phases)
      expect(widths).toHaveLength(3);
      widths.forEach(width => {
        expect(width).toContain('33.3333%');
      });
    });

    test('should show correct visual status for each phase', async ({ page }) => {
      const progressBar = page.getByTestId('progress-phased');

      // Check completed phase has correct color
      const completedPhase = await progressBar.evaluate(el => {
        const phase = el.shadowRoot?.querySelector('[data-phase="capture"]') as HTMLElement;
        return phase ? window.getComputedStyle(phase).backgroundColor : null;
      });

      expect(completedPhase).toBeTruthy();

      // Check active phase has correct status
      const activeStatus = await progressBar.evaluate(el => {
        const phase = el.shadowRoot?.querySelector('[data-phase="process"]');
        return phase?.getAttribute('data-status');
      });

      expect(activeStatus).toBe('active');

      // Check pending phase has correct status
      const pendingStatus = await progressBar.evaluate(el => {
        const phase = el.shadowRoot?.querySelector('[data-phase="upload"]');
        return phase?.getAttribute('data-status');
      });

      expect(pendingStatus).toBe('pending');
    });
  });

  test.describe('Size Variants', () => {
    test('should have different heights for different sizes', async ({ page }) => {
      const sizes = ['sm', 'md', 'lg'];
      const heights: { [key: string]: string } = {};

      for (const size of sizes) {
        const progressBar = page.getByTestId(`progress-linear-${size}`);

        const height = await progressBar.evaluate(el => {
          const track = el.shadowRoot?.querySelector('.wc-progress-track') as HTMLElement;
          return track ? window.getComputedStyle(track).height : null;
        });

        heights[size] = height || '';
      }

      // Verify heights are different and in ascending order
      expect(heights.sm).toBeTruthy();
      expect(heights.md).toBeTruthy();
      expect(heights.lg).toBeTruthy();
      expect(heights.sm).not.toBe(heights.md);
      expect(heights.md).not.toBe(heights.lg);
    });

    test('should apply correct size classes', async ({ page }) => {
      const sizes = ['sm', 'md', 'lg'];

      for (const size of sizes) {
        const progressBar = page.getByTestId(`progress-linear-${size}`);

        const hasClass = await progressBar.evaluate((el, s) => {
          const progress = el.shadowRoot?.querySelector('.wc-progress');
          return progress?.classList.contains(s) ?? false;
        }, size);

        expect(hasClass).toBe(true);
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have progressbar role', async ({ page }) => {
      const progressBar = page.getByTestId('progress-linear-md');

      const role = await progressBar.evaluate(el => {
        const progressElement = el.shadowRoot?.querySelector('[role="progressbar"]');
        return progressElement?.getAttribute('role');
      });

      expect(role).toBe('progressbar');
    });

    test('should have aria-valuemin attribute', async ({ page }) => {
      const progressBar = page.getByTestId('progress-linear-md');

      const valueMin = await progressBar.evaluate(el => {
        const progressElement = el.shadowRoot?.querySelector('[role="progressbar"]');
        return progressElement?.getAttribute('aria-valuemin');
      });

      expect(valueMin).toBe('0');
    });

    test('should have aria-valuemax attribute', async ({ page }) => {
      const progressBar = page.getByTestId('progress-linear-md');

      const valueMax = await progressBar.evaluate(el => {
        const progressElement = el.shadowRoot?.querySelector('[role="progressbar"]');
        return progressElement?.getAttribute('aria-valuemax');
      });

      expect(valueMax).toBe('100');
    });

    test('should have aria-valuenow attribute', async ({ page }) => {
      const progressBar = page.getByTestId('progress-linear-md');

      const valueNow = await progressBar.evaluate(el => {
        const progressElement = el.shadowRoot?.querySelector('[role="progressbar"]');
        return progressElement?.getAttribute('aria-valuenow');
      });

      expect(valueNow).toBeTruthy();
      expect(parseInt(valueNow || '0')).toBeGreaterThanOrEqual(0);
      expect(parseInt(valueNow || '0')).toBeLessThanOrEqual(100);
    });

    test('should have aria-label attribute', async ({ page }) => {
      const progressBar = page.getByTestId('progress-linear-md');

      const ariaLabel = await progressBar.evaluate(el => {
        const progressElement = el.shadowRoot?.querySelector('[role="progressbar"]');
        return progressElement?.getAttribute('aria-label');
      });

      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('progress');
    });

    test('should have live region for screen reader announcements', async ({ page }) => {
      const progressBar = page.getByTestId('progress-linear-md');

      const hasLiveRegion = await progressBar.evaluate(el => {
        const liveRegion = el.shadowRoot?.querySelector('[aria-live]');
        return !!liveRegion;
      });

      expect(hasLiveRegion).toBe(true);
    });

    test('should update live region when value changes', async ({ page }) => {
      const progressBar = page.getByTestId('progress-interactive');

      // Click increase button
      await page.click('#progress-increase');
      await page.waitForTimeout(200);

      const liveRegionContent = await progressBar.evaluate(el => {
        const liveRegion = el.shadowRoot?.querySelector('[aria-live]');
        return liveRegion?.textContent;
      });

      expect(liveRegionContent).toBeTruthy();
      expect(liveRegionContent).toContain('60');
    });
  });

  test.describe('Transitions', () => {
    test('should animate width changes', async ({ page }) => {
      const progressBar = page.getByTestId('progress-interactive');

      const hasTransition = await progressBar.evaluate(el => {
        const fill = el.shadowRoot?.querySelector('.wc-progress-fill') as HTMLElement;
        const transition = fill ? window.getComputedStyle(fill).transition : null;
        return transition && transition.includes('width');
      });

      expect(hasTransition).toBe(true);
    });

    test('should respect reduced motion preference', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.reload();
      await page.waitForSelector('#progressbar-section');

      const progressBar = page.getByTestId('progress-linear-md');

      const hasNoAnimation = await progressBar.evaluate(el => {
        const progress = el.shadowRoot?.querySelector('.wc-progress');
        const fill = el.shadowRoot?.querySelector('.wc-progress-fill') as HTMLElement;
        const shimmer = progress?.querySelector('::after');

        // Check if animations are disabled
        const fillTransition = fill ? window.getComputedStyle(fill).transition : null;

        return !fillTransition || fillTransition === 'none' || fillTransition.includes('0s');
      });

      // With reduced motion, transitions should be disabled or very short
      expect(hasNoAnimation).toBe(true);
    });
  });

  test.describe('Dark Mode', () => {
    test('should adapt to dark color scheme', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();
      await page.waitForSelector('#progressbar-section');

      const progressBar = page.getByTestId('progress-linear-md');
      await expect(progressBar).toBeVisible();

      // Component should still be visible and functional in dark mode
      const isVisible = await progressBar.isVisible();
      expect(isVisible).toBe(true);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle 0% progress', async ({ page }) => {
      const progressBar = page.getByTestId('progress-interactive');

      // Decrease to minimum
      for (let i = 0; i < 10; i++) {
        await page.click('#progress-decrease');
      }
      await page.waitForTimeout(100);

      const value = await progressBar.evaluate(el => {
        const progressElement = el.shadowRoot?.querySelector('[role="progressbar"]');
        return progressElement?.getAttribute('aria-valuenow');
      });

      expect(parseInt(value || '0')).toBeGreaterThanOrEqual(0);
    });

    test('should handle 100% progress', async ({ page }) => {
      const progressBar = page.getByTestId('progress-interactive');

      // Increase to maximum
      for (let i = 0; i < 10; i++) {
        await page.click('#progress-increase');
      }
      await page.waitForTimeout(100);

      const value = await progressBar.evaluate(el => {
        const progressElement = el.shadowRoot?.querySelector('[role="progressbar"]');
        return progressElement?.getAttribute('aria-valuenow');
      });

      expect(parseInt(value || '0')).toBeLessThanOrEqual(100);
    });
  });
});
