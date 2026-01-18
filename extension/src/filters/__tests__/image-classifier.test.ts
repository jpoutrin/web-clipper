/**
 * Tests for image size classification functionality.
 */

import {
  classifyImageSize,
  filterTrackingPixels,
  shouldSkipImage,
  getImageDimensions,
  IMAGE_THRESHOLDS,
} from '../image-classifier';
import { ImageSize, FilterConfig } from '../types';
import { DEFAULT_FILTER_CONFIG } from '../index';

/**
 * Helper to create a mock image element with specific dimensions.
 */
function createMockImage(
  width: number,
  height: number,
  options: { useAttributes?: boolean; src?: string } = {}
): HTMLImageElement {
  const img = document.createElement('img');

  if (options.useAttributes) {
    img.setAttribute('width', width.toString());
    img.setAttribute('height', height.toString());
  } else {
    // Set the width/height properties directly
    Object.defineProperty(img, 'width', { value: width, writable: true });
    Object.defineProperty(img, 'height', { value: height, writable: true });
  }

  if (options.src) {
    img.src = options.src;
  }

  return img;
}

describe('Image Size Classifier', () => {
  describe('classifyImageSize', () => {
    describe('SKIP classification (tracking pixels)', () => {
      it('should classify 1x1 as SKIP', () => {
        const img = createMockImage(1, 1);
        expect(classifyImageSize(img)).toBe(ImageSize.SKIP);
      });

      it('should classify 2x2 as SKIP', () => {
        const img = createMockImage(2, 2);
        expect(classifyImageSize(img)).toBe(ImageSize.SKIP);
      });

      it('should classify 5x5 as SKIP (boundary)', () => {
        const img = createMockImage(5, 5);
        expect(classifyImageSize(img)).toBe(ImageSize.SKIP);
      });

      it('should classify 5x1 as SKIP', () => {
        const img = createMockImage(5, 1);
        expect(classifyImageSize(img)).toBe(ImageSize.SKIP);
      });

      it('should classify 1x5 as SKIP', () => {
        const img = createMockImage(1, 5);
        expect(classifyImageSize(img)).toBe(ImageSize.SKIP);
      });
    });

    describe('LARGE classification', () => {
      it('should classify 400x300 (120000px²) as LARGE', () => {
        const img = createMockImage(400, 300);
        expect(classifyImageSize(img)).toBe(ImageSize.LARGE);
      });

      it('should classify 250x200 (50000px²) as LARGE (boundary by area)', () => {
        const img = createMockImage(250, 200);
        expect(classifyImageSize(img)).toBe(ImageSize.LARGE);
      });

      it('should classify 350x75 as LARGE (wide image criterion)', () => {
        const img = createMockImage(350, 75);
        expect(classifyImageSize(img)).toBe(ImageSize.LARGE);
      });

      it('should classify 500x100 as LARGE', () => {
        const img = createMockImage(500, 100);
        expect(classifyImageSize(img)).toBe(ImageSize.LARGE);
      });
    });

    describe('MEDIUM classification', () => {
      it('should classify 150x150 (22500px²) as MEDIUM', () => {
        const img = createMockImage(150, 150);
        expect(classifyImageSize(img)).toBe(ImageSize.MEDIUM);
      });

      it('should classify 200x100 (20000px²) as MEDIUM (boundary by area)', () => {
        const img = createMockImage(200, 100);
        expect(classifyImageSize(img)).toBe(ImageSize.MEDIUM);
      });

      it('should classify 180x180 as MEDIUM', () => {
        const img = createMockImage(180, 180);
        expect(classifyImageSize(img)).toBe(ImageSize.MEDIUM);
      });
    });

    describe('SMALL classification', () => {
      it('should classify 50x50 as SMALL', () => {
        const img = createMockImage(50, 50);
        expect(classifyImageSize(img)).toBe(ImageSize.SMALL);
      });

      it('should classify 100x100 as SMALL', () => {
        const img = createMockImage(100, 100);
        expect(classifyImageSize(img)).toBe(ImageSize.SMALL);
      });

      it('should classify 6x6 as SMALL (just above SKIP threshold)', () => {
        const img = createMockImage(6, 6);
        expect(classifyImageSize(img)).toBe(ImageSize.SMALL);
      });

      it('should classify 140x140 as SMALL (19600px² < 20000px² threshold)', () => {
        const img = createMockImage(140, 140);
        expect(classifyImageSize(img)).toBe(ImageSize.SMALL);
      });
    });

    describe('Edge cases', () => {
      it('should return SMALL for images with 0x0 dimensions', () => {
        const img = createMockImage(0, 0);
        expect(classifyImageSize(img)).toBe(ImageSize.SMALL);
      });

      it('should handle attribute-based dimensions', () => {
        const img = createMockImage(400, 300, { useAttributes: true });
        expect(classifyImageSize(img)).toBe(ImageSize.LARGE);
      });
    });
  });

  describe('getImageDimensions', () => {
    it('should return width and height from properties', () => {
      const img = createMockImage(300, 200);
      const dims = getImageDimensions(img);
      expect(dims.width).toBe(300);
      expect(dims.height).toBe(200);
    });

    it('should fallback to attributes', () => {
      const img = createMockImage(0, 0);
      img.setAttribute('width', '400');
      img.setAttribute('height', '300');
      const dims = getImageDimensions(img);
      expect(dims.width).toBe(400);
      expect(dims.height).toBe(300);
    });

    it('should return 0 for missing dimensions', () => {
      const img = document.createElement('img');
      const dims = getImageDimensions(img);
      expect(dims.width).toBe(0);
      expect(dims.height).toBe(0);
    });
  });

  describe('shouldSkipImage', () => {
    let config: FilterConfig;

    beforeEach(() => {
      config = { ...DEFAULT_FILTER_CONFIG };
    });

    it('should skip tracking pixels', () => {
      const img = createMockImage(1, 1, { src: 'https://example.com/pixel.gif' });
      const result = shouldSkipImage(img, 'https://example.com/pixel.gif', config);

      expect(result.skip).toBe(true);
      expect(result.reason).toContain('tracking pixel');
      expect(result.size).toBe(ImageSize.SKIP);
    });

    it('should skip ad network images', () => {
      const img = createMockImage(100, 100, { src: 'https://pagead2.googlesyndication.com/ad.jpg' });
      const result = shouldSkipImage(img, 'https://pagead2.googlesyndication.com/ad.jpg', config);

      expect(result.skip).toBe(true);
      expect(result.reason).toContain('ad network');
    });

    it('should not skip normal images', () => {
      const img = createMockImage(400, 300, { src: 'https://example.com/photo.jpg' });
      const result = shouldSkipImage(img, 'https://example.com/photo.jpg', config);

      expect(result.skip).toBe(false);
      expect(result.size).toBe(ImageSize.LARGE);
    });

    it('should respect disabled skipTrackingPixels config', () => {
      const img = createMockImage(1, 1);
      const disabledConfig = { ...config, skipTrackingPixels: false };
      const result = shouldSkipImage(img, 'https://example.com/pixel.gif', disabledConfig);

      expect(result.skip).toBe(false);
    });

    it('should respect disabled filterAdImages config', () => {
      const img = createMockImage(100, 100);
      const disabledConfig = { ...config, filterAdImages: false };
      const result = shouldSkipImage(img, 'https://pagead2.googlesyndication.com/ad.jpg', disabledConfig);

      expect(result.skip).toBe(false);
    });
  });

  describe('filterTrackingPixels', () => {
    let container: HTMLDivElement;
    let config: FilterConfig;

    beforeEach(() => {
      container = document.createElement('div');
      config = { ...DEFAULT_FILTER_CONFIG };
    });

    it('should remove tracking pixels', () => {
      // Create images with dimension attributes
      container.innerHTML = `
        <img width="1" height="1" src="track1.gif">
        <img width="400" height="300" src="photo.jpg">
        <img width="2" height="2" src="track2.gif">
      `;

      const removed = filterTrackingPixels(container, config);

      expect(removed).toBe(2);
      expect(container.querySelectorAll('img').length).toBe(1);
    });

    it('should preserve normal images', () => {
      container.innerHTML = `
        <img width="400" height="300" src="photo1.jpg">
        <img width="200" height="150" src="photo2.jpg">
      `;

      const removed = filterTrackingPixels(container, config);

      expect(removed).toBe(0);
      expect(container.querySelectorAll('img').length).toBe(2);
    });

    it('should do nothing when disabled', () => {
      container.innerHTML = `
        <img width="1" height="1" src="track.gif">
      `;

      const disabledConfig = { ...config, skipTrackingPixels: false };
      const removed = filterTrackingPixels(container, disabledConfig);

      expect(removed).toBe(0);
      expect(container.querySelectorAll('img').length).toBe(1);
    });
  });

  describe('IMAGE_THRESHOLDS', () => {
    it('should have correct threshold values', () => {
      expect(IMAGE_THRESHOLDS.SKIP_MAX_DIM).toBe(5);
      expect(IMAGE_THRESHOLDS.LARGE_AREA).toBe(50000);
      expect(IMAGE_THRESHOLDS.LARGE_WIDTH).toBe(350);
      expect(IMAGE_THRESHOLDS.LARGE_MIN_HEIGHT).toBe(75);
      expect(IMAGE_THRESHOLDS.MEDIUM_AREA).toBe(20000);
      expect(IMAGE_THRESHOLDS.MEDIUM_MIN_DIM).toBe(150);
    });
  });
});
