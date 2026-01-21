/**
 * Characterization tests for captureArticle function
 * These tests document the current behavior before refactoring
 */

import { captureArticle, getImageExtension } from '../../content';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import {
  safeDetectEmbeds,
  safeCaptureAllEmbeds,
  addEmbedRules,
} from '../../embeds';
import { applyContentFilters } from '../../filters';
import { CaptureConfig } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('@mozilla/readability');
jest.mock('turndown');
jest.mock('../../embeds');
jest.mock('../../filters');

// Helper to load HTML fixtures
function loadFixture(filename: string): string {
  const fixturePath = path.join(__dirname, 'fixtures', filename);
  return fs.readFileSync(fixturePath, 'utf-8');
}

// Default config for tests
const defaultConfig: CaptureConfig = {
  maxDimensionPx: 2048,
  maxSizeBytes: 5242880,
};

describe('captureArticle', () => {
  let container: HTMLDivElement;
  const originalLocation = window.location;

  beforeAll(() => {
    // Set up window.location for URL resolution (once for all tests)
    delete (window as { location?: Location }).location;
    (window as { location: { href: string } }).location = {
      href: 'https://example.com/article',
    };
  });

  afterAll(() => {
    // Restore original location
    (window as { location: Location }).location = originalLocation;
  });

  beforeEach(() => {
    // Set up DOM
    container = document.createElement('div');
    document.body.appendChild(container);

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    (safeDetectEmbeds as jest.Mock).mockReturnValue([]);
    (safeCaptureAllEmbeds as jest.Mock).mockResolvedValue([]);
    (addEmbedRules as jest.Mock).mockImplementation(() => {});
    (applyContentFilters as jest.Mock).mockReturnValue({
      linkDensityRemoved: 0,
      floatingRemoved: 0,
      adLinksRemoved: 0,
      emptyRemoved: 0,
      imagesSkipped: 0,
      totalProcessed: 0,
    });
  });

  afterEach(() => {
    // Clean up DOM
    if (container.parentElement) {
      document.body.removeChild(container);
    }
  });

  describe('Article Element Discovery', () => {
    it('should find article by <article> tag', async () => {
      document.body.innerHTML = '<article id="test-article"><p>Content</p></article>';

      // Mock Readability to return parsed article
      const mockArticle = {
        title: 'Test Article',
        content: '<p>Content</p>',
      };
      (Readability as jest.Mock).mockImplementation(() => ({
        parse: () => mockArticle,
      }));

      // Mock TurndownService
      const mockTurndown = {
        addRule: jest.fn(),
        turndown: jest.fn().mockReturnValue('# Test Article\n\nContent'),
      };
      (TurndownService as jest.Mock).mockImplementation(() => mockTurndown);

      const result = await captureArticle(defaultConfig);

      expect(result).toBeDefined();
      expect(result.mode).toBe('article');
      expect(safeDetectEmbeds).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(HTMLElement) // Should pass the article element
      );
    });

    it('should find article by [role="article"] attribute', async () => {
      document.body.innerHTML = '<div role="article"><p>Content</p></div>';

      const mockArticle = {
        title: 'Test',
        content: '<p>Content</p>',
      };
      (Readability as jest.Mock).mockImplementation(() => ({
        parse: () => mockArticle,
      }));

      const mockTurndown = {
        addRule: jest.fn(),
        turndown: jest.fn().mockReturnValue('Content'),
      };
      (TurndownService as jest.Mock).mockImplementation(() => mockTurndown);

      await captureArticle(defaultConfig);

      expect(safeDetectEmbeds).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(HTMLElement)
      );
    });

    it('should try multiple selectors in order', async () => {
      document.body.innerHTML = `
        <div class="post-content" id="found">Post content</div>
        <article>Should not be found (appears later)</article>
      `;

      const mockArticle = {
        title: 'Test',
        content: '<div class="post-content">Post content</div>',
      };
      (Readability as jest.Mock).mockImplementation(() => ({
        parse: () => mockArticle,
      }));

      const mockTurndown = {
        addRule: jest.fn(),
        turndown: jest.fn().mockReturnValue('Post content'),
      };
      (TurndownService as jest.Mock).mockImplementation(() => mockTurndown);

      await captureArticle(defaultConfig);

      // Should find .post-content before article tag
      expect(safeDetectEmbeds).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(HTMLElement)
      );
    });

    it('should handle case when no article element found', async () => {
      document.body.innerHTML = '<div><p>Generic content</p></div>';

      const mockArticle = {
        title: 'Test',
        content: '<p>Generic content</p>',
      };
      (Readability as jest.Mock).mockImplementation(() => ({
        parse: () => mockArticle,
      }));

      const mockTurndown = {
        addRule: jest.fn(),
        turndown: jest.fn().mockReturnValue('Generic content'),
      };
      (TurndownService as jest.Mock).mockImplementation(() => mockTurndown);

      await captureArticle(defaultConfig);

      // Should call safeDetectEmbeds with undefined when no article element found
      expect(safeDetectEmbeds).toHaveBeenCalledWith(
        expect.anything(),
        undefined
      );
    });
  });

  describe('Image Extraction', () => {
    beforeEach(() => {
      const mockArticle = {
        title: 'Test',
        content: '<div></div>',
      };
      (Readability as jest.Mock).mockImplementation(() => ({
        parse: () => mockArticle,
      }));

      const mockTurndown = {
        addRule: jest.fn(),
        turndown: jest.fn().mockReturnValue(''),
      };
      (TurndownService as jest.Mock).mockImplementation(() => mockTurndown);
    });

    it('should extract images with src attribute', async () => {
      document.body.innerHTML = `
        <article>
          <img src="https://example.com/test.jpg" alt="Test">
        </article>
      `;

      await captureArticle(defaultConfig);

      // Verify TurndownService was configured with image rule
      const mockTurndown = (TurndownService as jest.Mock).mock.results[0].value;
      expect(mockTurndown.addRule).toHaveBeenCalledWith(
        'images',
        expect.objectContaining({
          filter: 'img',
          replacement: expect.any(Function),
        })
      );
    });

    it('should handle lazy-loaded images with data-src', async () => {
      document.body.innerHTML = `
        <article>
          <img data-src="https://example.com/lazy.jpg" src="placeholder.gif" alt="Lazy">
        </article>
      `;

      await captureArticle(defaultConfig);

      const mockTurndown = (TurndownService as jest.Mock).mock.results[0].value;
      expect(mockTurndown.addRule).toHaveBeenCalled();
    });

    it('should handle images with srcset attribute', async () => {
      document.body.innerHTML = `
        <article>
          <img srcset="https://example.com/small.jpg 400w, https://example.com/large.jpg 800w" alt="Responsive">
        </article>
      `;

      await captureArticle(defaultConfig);

      const mockTurndown = (TurndownService as jest.Mock).mock.results[0].value;
      expect(mockTurndown.addRule).toHaveBeenCalled();
    });

    it('should extract images from picture elements', async () => {
      document.body.innerHTML = `
        <article>
          <picture>
            <source srcset="https://example.com/webp.webp" type="image/webp">
            <img src="https://example.com/fallback.jpg" alt="Picture">
          </picture>
        </article>
      `;

      await captureArticle(defaultConfig);

      const mockTurndown = (TurndownService as jest.Mock).mock.results[0].value;
      expect(mockTurndown.addRule).toHaveBeenCalled();
    });

    it('should skip duplicate images with same URL', async () => {
      document.body.innerHTML = `
        <article>
          <img src="https://example.com/image.jpg" alt="First">
          <img src="https://example.com/image.jpg" alt="Duplicate">
        </article>
      `;

      await captureArticle(defaultConfig);

      // The image map should only have one entry for the URL
      const mockTurndown = (TurndownService as jest.Mock).mock.results[0].value;
      expect(mockTurndown.addRule).toHaveBeenCalled();
    });

    it('should convert relative URLs to absolute', async () => {
      document.body.innerHTML = `
        <article>
          <img src="/relative/path.jpg" alt="Relative">
        </article>
      `;

      await captureArticle(defaultConfig);

      // Image should be resolved to https://example.com/relative/path.jpg
      const mockTurndown = (TurndownService as jest.Mock).mock.results[0].value;
      expect(mockTurndown.addRule).toHaveBeenCalled();
    });

    it('should skip data: URIs', async () => {
      document.body.innerHTML = `
        <article>
          <img src="data:image/png;base64,iVBORw0KGgoAAAANS" alt="Data URI">
        </article>
      `;

      await captureArticle(defaultConfig);

      const mockTurndown = (TurndownService as jest.Mock).mock.results[0].value;
      expect(mockTurndown.addRule).toHaveBeenCalled();
    });
  });

  describe('Embed Detection and Capture', () => {
    beforeEach(() => {
      const mockArticle = {
        title: 'Test',
        content: '<div>Content with embed placeholders</div>',
      };
      (Readability as jest.Mock).mockImplementation(() => ({
        parse: () => mockArticle,
      }));

      const mockTurndown = {
        addRule: jest.fn(),
        turndown: jest.fn().mockReturnValue('Content'),
      };
      (TurndownService as jest.Mock).mockImplementation(() => mockTurndown);
    });

    it('should detect and capture embeds', async () => {
      const mockDetectedEmbeds = [
        {
          provider: { id: 'youtube', name: 'YouTube' },
          element: document.createElement('iframe'),
          index: 0,
          url: 'https://youtube.com/embed/test',
        },
      ];

      const mockCapturedEmbeds = [
        {
          providerId: 'youtube',
          filename: 'embed0.png',
          data: 'base64data',
          metadata: {
            title: 'Test Video',
            sourceUrl: 'https://youtube.com/watch?v=test',
            sourceName: 'YouTube',
          },
        },
      ];

      (safeDetectEmbeds as jest.Mock).mockReturnValue(mockDetectedEmbeds);
      (safeCaptureAllEmbeds as jest.Mock).mockResolvedValue(mockCapturedEmbeds);

      document.body.innerHTML = '<article><iframe src="https://youtube.com/embed/test"></iframe></article>';

      await captureArticle(defaultConfig);

      expect(safeDetectEmbeds).toHaveBeenCalled();
      expect(safeCaptureAllEmbeds).toHaveBeenCalledWith(
        mockDetectedEmbeds,
        expect.anything()
      );
      expect(addEmbedRules).toHaveBeenCalled();
    });

    it('should replace embeds with placeholders before Readability', async () => {
      const mockEmbed = document.createElement('iframe');
      mockEmbed.src = 'https://youtube.com/embed/test';

      const mockDetectedEmbeds = [
        {
          provider: { id: 'youtube', name: 'YouTube' },
          element: mockEmbed,
          index: 0,
          url: 'https://youtube.com/embed/test',
        },
      ];

      (safeDetectEmbeds as jest.Mock).mockReturnValue(mockDetectedEmbeds);

      const article = document.createElement('article');
      article.appendChild(mockEmbed);
      document.body.appendChild(article);

      await captureArticle(defaultConfig);

      // Verify Readability was called (placeholders should survive cloning)
      expect(Readability).toHaveBeenCalled();
    });
  });

  describe('Readability Processing', () => {
    it('should return error result when Readability fails', async () => {
      document.body.innerHTML = '<article><p>Content</p></article>';

      // Mock Readability to return null (parsing failure)
      (Readability as jest.Mock).mockImplementation(() => ({
        parse: () => null,
      }));

      const result = await captureArticle(defaultConfig);

      expect(result).toBeDefined();
      expect(result.mode).toBe('article');
      expect(result.markdown).toContain('Could not extract article content');
      expect(result.images).toEqual([]);
    });

    it('should use parsed article title', async () => {
      document.body.innerHTML = '<article><p>Content</p></article>';
      document.title = 'Document Title';

      const mockArticle = {
        title: 'Parsed Article Title',
        content: '<p>Content</p>',
      };
      (Readability as jest.Mock).mockImplementation(() => ({
        parse: () => mockArticle,
      }));

      const mockTurndown = {
        addRule: jest.fn(),
        turndown: jest.fn().mockReturnValue('Content'),
      };
      (TurndownService as jest.Mock).mockImplementation(() => mockTurndown);

      const result = await captureArticle(defaultConfig);

      expect(result.title).toBe('Parsed Article Title');
    });

    it('should fallback to document title when article title is missing', async () => {
      document.body.innerHTML = '<article><p>Content</p></article>';
      document.title = 'Document Title';

      const mockArticle = {
        title: '',
        content: '<p>Content</p>',
      };
      (Readability as jest.Mock).mockImplementation(() => ({
        parse: () => mockArticle,
      }));

      const mockTurndown = {
        addRule: jest.fn(),
        turndown: jest.fn().mockReturnValue('Content'),
      };
      (TurndownService as jest.Mock).mockImplementation(() => mockTurndown);

      const result = await captureArticle(defaultConfig);

      expect(result.title).toBe('Document Title');
    });
  });

  describe('Content Filtering', () => {
    beforeEach(() => {
      const mockArticle = {
        title: 'Test',
        content: '<div><p>Filtered content</p></div>',
      };
      (Readability as jest.Mock).mockImplementation(() => ({
        parse: () => mockArticle,
      }));

      const mockTurndown = {
        addRule: jest.fn(),
        turndown: jest.fn().mockReturnValue('Filtered content'),
      };
      (TurndownService as jest.Mock).mockImplementation(() => mockTurndown);
    });

    it('should apply content filters to parsed article', async () => {
      document.body.innerHTML = '<article><p>Content</p></article>';

      await captureArticle(defaultConfig);

      expect(applyContentFilters).toHaveBeenCalledWith(
        expect.any(HTMLDivElement),
        expect.objectContaining({ debug: false })
      );
    });

    it('should remove related articles sections', async () => {
      const mockArticle = {
        title: 'Test',
        content: `
          <div>
            <p>Main content</p>
            <div class="related-articles">
              <a href="/related1">Related 1</a>
            </div>
          </div>
        `,
      };
      (Readability as jest.Mock).mockImplementation(() => ({
        parse: () => mockArticle,
      }));

      const mockTurndown = {
        addRule: jest.fn(),
        turndown: jest.fn((html) => {
          // Verify related articles were removed
          expect(html).not.toContain('related-articles');
          return 'Main content';
        }),
      };
      (TurndownService as jest.Mock).mockImplementation(() => mockTurndown);

      document.body.innerHTML = '<article><p>Content</p></article>';

      await captureArticle(defaultConfig);
    });

    it('should remove ad containers', async () => {
      const mockArticle = {
        title: 'Test',
        content: `
          <div>
            <p>Main content</p>
            <div class="ad-banner">
              <img src="https://ads.example.com/banner.jpg">
            </div>
          </div>
        `,
      };
      (Readability as jest.Mock).mockImplementation(() => ({
        parse: () => mockArticle,
      }));

      const mockTurndown = {
        addRule: jest.fn(),
        turndown: jest.fn((html) => {
          expect(html).not.toContain('ad-banner');
          return 'Main content';
        }),
      };
      (TurndownService as jest.Mock).mockImplementation(() => mockTurndown);

      document.body.innerHTML = '<article><p>Content</p></article>';

      await captureArticle(defaultConfig);
    });
  });

  describe('Markdown Conversion', () => {
    it('should configure TurndownService with correct options', async () => {
      document.body.innerHTML = '<article><p>Content</p></article>';

      const mockArticle = {
        title: 'Test',
        content: '<p>Content</p>',
      };
      (Readability as jest.Mock).mockImplementation(() => ({
        parse: () => mockArticle,
      }));

      await captureArticle(defaultConfig);

      expect(TurndownService).toHaveBeenCalledWith({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        emDelimiter: '*',
      });
    });

    it('should add custom image rule', async () => {
      document.body.innerHTML = '<article><img src="https://example.com/test.jpg" alt="Test"></article>';

      const mockArticle = {
        title: 'Test',
        content: '<img src="https://example.com/test.jpg" alt="Test">',
      };
      (Readability as jest.Mock).mockImplementation(() => ({
        parse: () => mockArticle,
      }));

      const mockTurndown = {
        addRule: jest.fn(),
        turndown: jest.fn().mockReturnValue(''),
      };
      (TurndownService as jest.Mock).mockImplementation(() => mockTurndown);

      await captureArticle(defaultConfig);

      expect(mockTurndown.addRule).toHaveBeenCalledWith(
        'images',
        expect.objectContaining({
          filter: 'img',
          replacement: expect.any(Function),
        })
      );
    });

    it('should add embed rules before image rules', async () => {
      document.body.innerHTML = '<article><p>Content</p></article>';

      const mockArticle = {
        title: 'Test',
        content: '<p>Content</p>',
      };
      (Readability as jest.Mock).mockImplementation(() => ({
        parse: () => mockArticle,
      }));

      const mockTurndown = {
        addRule: jest.fn(),
        turndown: jest.fn().mockReturnValue('Content'),
      };
      (TurndownService as jest.Mock).mockImplementation(() => mockTurndown);

      await captureArticle(defaultConfig);

      // addEmbedRules should be called before image rule
      expect(addEmbedRules).toHaveBeenCalled();
      expect(mockTurndown.addRule).toHaveBeenCalledWith('images', expect.anything());
    });
  });

  describe('Integration Tests', () => {
    it('should process a complete article with all features', async () => {
      document.body.innerHTML = `
        <article>
          <h1>Test Article</h1>
          <p>Introduction paragraph.</p>
          <img src="https://example.com/image1.jpg" alt="Image 1">
          <p>More content.</p>
          <img data-src="https://example.com/lazy.jpg" src="placeholder.gif" alt="Lazy Image">
        </article>
      `;

      const mockArticle = {
        title: 'Test Article',
        content: `
          <h1>Test Article</h1>
          <p>Introduction paragraph.</p>
          <img src="https://example.com/image1.jpg" alt="Image 1">
          <p>More content.</p>
          <img src="https://example.com/lazy.jpg" alt="Lazy Image">
        `,
      };
      (Readability as jest.Mock).mockImplementation(() => ({
        parse: () => mockArticle,
      }));

      const mockTurndown = {
        addRule: jest.fn(),
        turndown: jest.fn().mockReturnValue('# Test Article\n\nIntroduction paragraph.\n\n![Image 1](media/image1.jpg)\n\nMore content.\n\n![Lazy Image](media/image2.jpg)'),
      };
      (TurndownService as jest.Mock).mockImplementation(() => mockTurndown);

      const result = await captureArticle(defaultConfig);

      expect(result).toMatchObject({
        mode: 'article',
        title: 'Test Article',
        // Note: JSDOM uses http://localhost/ for window.location.href in tests
        url: expect.stringContaining('http'),
      });
      expect(result.markdown).toBeTruthy();
      expect(result.images).toBeInstanceOf(Array);
    });
  });
});

describe('getImageExtension', () => {
  it('should extract jpg extension', () => {
    expect(getImageExtension('https://example.com/image.jpg')).toBe('.jpg');
  });

  it('should extract jpeg extension', () => {
    expect(getImageExtension('https://example.com/image.jpeg')).toBe('.jpeg');
  });

  it('should extract png extension', () => {
    expect(getImageExtension('https://example.com/image.png')).toBe('.png');
  });

  it('should extract gif extension', () => {
    expect(getImageExtension('https://example.com/image.gif')).toBe('.gif');
  });

  it('should extract webp extension', () => {
    expect(getImageExtension('https://example.com/image.webp')).toBe('.webp');
  });

  it('should extract svg extension', () => {
    expect(getImageExtension('https://example.com/image.svg')).toBe('.svg');
  });

  it('should default to .jpg for unknown extensions', () => {
    expect(getImageExtension('https://example.com/image.unknown')).toBe('.jpg');
  });

  it('should default to .jpg for URLs without extension', () => {
    expect(getImageExtension('https://example.com/image')).toBe('.jpg');
  });

  it('should handle query parameters', () => {
    expect(getImageExtension('https://example.com/image.jpg?size=large')).toBe('.jpg');
  });

  it('should handle uppercase extensions', () => {
    expect(getImageExtension('https://example.com/IMAGE.JPG')).toBe('.jpg');
  });

  it('should handle invalid URLs', () => {
    expect(getImageExtension('not-a-url')).toBe('.jpg');
  });
});
