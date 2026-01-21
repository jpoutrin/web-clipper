import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { CaptureResult, ImagePayload, Message, CaptureConfig } from './types';
import { captureBookmark, generateBookmarkMarkdown } from './capture/bookmark';
import { captureFullPage } from './capture/fullpage';
import { SelectionOverlay } from './capture/selection-overlay';
import {
  safeDetectEmbeds,
  safeCaptureAllEmbeds,
  addEmbedRules,
  CapturedEmbed,
  DEFAULT_EMBED_CONFIG,
} from './embeds';
import { applyContentFilters } from './filters';

// Active selection overlay instance
let selectionOverlay: SelectionOverlay | null = null;

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((err) => {
      console.error('Content script error:', err);
      sendResponse({ error: err.message });
    });
  return true; // Async response
});

/**
 * Handle incoming messages
 */
async function handleMessage(message: Message): Promise<unknown> {
  const payload = message.payload as { config?: CaptureConfig } | undefined;
  const config: CaptureConfig = payload?.config || {
    maxDimensionPx: 2048,
    maxSizeBytes: 5242880,
  };

  switch (message.type) {
    case 'PING':
      // Health check to verify content script is loaded
      return { ready: true };

    case 'CAPTURE_PAGE':
      return captureArticle(config);

    case 'CAPTURE_BOOKMARK':
      return captureBookmarkMode();

    case 'CAPTURE_FULLPAGE':
      return captureFullPageMode(config);

    case 'START_SELECTION_MODE':
      return startSelectionMode(config);

    case 'CANCEL_SELECTION_MODE':
      return cancelSelectionMode();

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

/**
 * Capture bookmark (URL + title + excerpt)
 */
function captureBookmarkMode(): CaptureResult {
  const bookmark = captureBookmark();
  const markdown = generateBookmarkMarkdown(bookmark);

  return {
    mode: 'bookmark',
    title: bookmark.title,
    url: bookmark.url,
    markdown,
    images: [],
    excerpt: bookmark.excerpt,
    favicon: bookmark.favicon,
  };
}

/**
 * Capture full page with inlined styles
 */
async function captureFullPageMode(config: CaptureConfig): Promise<CaptureResult> {
  const result = await captureFullPage(config);

  return {
    mode: 'fullpage',
    title: document.title,
    url: window.location.href,
    html: result.html,
    images: result.images,
  };
}

/**
 * Start selection mode
 */
function startSelectionMode(config: CaptureConfig): { started: boolean } {
  // Cancel any existing overlay
  if (selectionOverlay) {
    selectionOverlay = null;
  }

  // Create new overlay
  selectionOverlay = new SelectionOverlay(config, {
    onSelect: (result) => {
      // Send result to background script
      chrome.runtime.sendMessage({
        type: 'SELECTION_COMPLETE',
        payload: {
          mode: 'selection',
          title: document.title,
          url: window.location.href,
          markdown: result.markdown,
          html: result.html,
          images: result.images,
          selector: result.selector,
        },
      });
      selectionOverlay = null;
    },
    onCancel: () => {
      chrome.runtime.sendMessage({ type: 'SELECTION_CANCELLED' });
      selectionOverlay = null;
    },
  });

  return { started: true };
}

/**
 * Cancel selection mode
 */
function cancelSelectionMode(): { cancelled: boolean } {
  if (selectionOverlay) {
    selectionOverlay = null;
  }
  return { cancelled: true };
}

/**
 * Placeholder info for restoring original embed elements
 */
interface EmbedPlaceholder {
  placeholder: HTMLElement;
  original: HTMLElement;
  parent: HTMLElement | null;
}

/**
 * Result of detecting and preparing embeds
 */
interface PreparedEmbeds {
  detectedEmbeds: ReturnType<typeof safeDetectEmbeds>;
  embedPlaceholders: EmbedPlaceholder[];
}

/**
 * Find the article element using common selectors
 * Returns null if no article element is found
 */
function findArticleElement(): HTMLElement | null {
  const articleSelectors = [
    'article',
    '[role="article"]',
    'main article',
    '.article-content',
    '.article-body',
    '.post-content',
    '.entry-content',
    '#article-content',
    '.story-body',
  ];

  for (const selector of articleSelectors) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      console.log(`[WebClipper] Found article element: ${selector}`);
      return element;
    }
  }

  return null;
}

/**
 * Detect embeds and replace them with placeholders before Readability processing
 * This ensures the placeholders survive Readability's DOM manipulation
 */
function detectAndPrepareEmbeds(articleElement: HTMLElement | null): PreparedEmbeds {
  console.log('[WebClipper] Detecting embedded content...');
  const detectedEmbeds = safeDetectEmbeds(
    DEFAULT_EMBED_CONFIG,
    articleElement || undefined
  );
  console.log(`[WebClipper] Found ${detectedEmbeds.length} embeds within article`);

  // Replace embed elements with placeholder divs BEFORE cloning
  // Readability strips iframes, so we need text-based placeholders that will survive
  const embedPlaceholders: EmbedPlaceholder[] = [];
  detectedEmbeds.forEach((detected, index) => {
    const placeholder = document.createElement('div');
    placeholder.setAttribute('data-webclipper-embed-id', String(index));
    placeholder.textContent = `WEBCLIPPEREMBED${index}PLACEHOLDER`;
    placeholder.style.display = 'block';
    placeholder.style.padding = '10px';
    placeholder.style.background = '#f0f0f0';

    // Replace the embed element with the placeholder
    const parent = detected.element.parentElement;
    if (parent) {
      parent.insertBefore(placeholder, detected.element);
      embedPlaceholders.push({ placeholder, original: detected.element, parent });
    }
  });

  return { detectedEmbeds, embedPlaceholders };
}

/**
 * Capture embed screenshots and create a map for quick lookup
 */
async function captureEmbedScreenshots(
  detectedEmbeds: ReturnType<typeof safeDetectEmbeds>
): Promise<Map<string, CapturedEmbed>> {
  let capturedEmbeds: CapturedEmbed[] = [];

  if (detectedEmbeds.length > 0) {
    console.log('[WebClipper] Capturing embedded content...');
    capturedEmbeds = await safeCaptureAllEmbeds(detectedEmbeds, DEFAULT_EMBED_CONFIG);
    console.log(`[WebClipper] Captured ${capturedEmbeds.length} embeds`);
  }

  // Create a map for quick lookup (embed ID -> captured data)
  const embedDataMap = new Map<string, CapturedEmbed>();
  detectedEmbeds.forEach((detected, index) => {
    const captured = capturedEmbeds.find(
      (c) => c.providerId === detected.provider.id && c.filename.includes(`embed${detected.index}`)
    );
    if (captured) {
      embedDataMap.set(String(index), captured);
    }
  });

  return embedDataMap;
}

/**
 * Result of extracting image URLs from the document
 */
interface ImageExtractionResult {
  imageMap: Map<string, string>; // originalUrl -> localFilename
  imageAltMap: Map<string, string>; // alt text -> filename (fallback)
}

/**
 * Extract images from the original document before Readability processing
 * This ensures we get the correct original URLs before they're modified
 */
function extractImageMap(articleElement: HTMLElement | null): ImageExtractionResult {
  const imageMap = new Map<string, string>();
  const imageAltMap = new Map<string, string>();
  let imageIndex = 0;

  // Extract from the found article element, or fallback to entire document
  const imageSource = articleElement || document.body;
  const imgElements = imageSource.querySelectorAll('img');

  console.log(`[WebClipper] Extracting images from ${articleElement ? 'article element' : 'document body'}: found ${imgElements.length} img tags`);

  imgElements.forEach((img) => {
    // Try multiple sources: src, data-src, data-lazy-src, srcset
    let src = img.getAttribute('src');

    // Check for lazy-loading attributes
    if (!src || src.startsWith('data:') || src.includes('placeholder') || src.includes('data:image')) {
      src = img.getAttribute('data-src') ||
            img.getAttribute('data-lazy-src') ||
            img.getAttribute('data-original') ||
            null;
    }

    // Try srcset as fallback (get first/best image)
    if (!src) {
      const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset');
      if (srcset) {
        const firstSrc = srcset.split(',')[0]?.trim().split(' ')[0];
        if (firstSrc) src = firstSrc;
      }
    }

    if (src && !src.startsWith('data:')) {
      // Resolve relative URLs to absolute
      try {
        const absoluteUrl = new URL(src, window.location.href).href;
        console.log(`[WebClipper] Found image: ${src} → ${absoluteUrl}`);

        // Skip if already in map (duplicate)
        if (imageMap.has(absoluteUrl)) return;

        const ext = getImageExtension(absoluteUrl);
        const filename = `image${++imageIndex}${ext}`;
        imageMap.set(absoluteUrl, filename);

        // Also store by alt text for fallback matching
        const alt = img.getAttribute('alt');
        if (alt && alt.length > 10) {
          imageAltMap.set(alt, filename);
        }
      } catch {
        // Invalid URL, skip
        console.warn(`[WebClipper] Invalid image URL: ${src}`);
        return;
      }
    }
  });

  // Also check for picture elements with source tags
  const pictureElements = imageSource.querySelectorAll('picture');
  pictureElements.forEach((picture) => {
    const sources = picture.querySelectorAll('source');
    sources.forEach((source) => {
      const srcset = source.getAttribute('srcset');
      if (srcset) {
        const firstSrc = srcset.split(',')[0]?.trim().split(' ')[0];
        if (firstSrc && !firstSrc.startsWith('data:')) {
          try {
            const absoluteSrc = new URL(firstSrc, window.location.href).href;
            if (!imageMap.has(absoluteSrc)) {
              const ext = getImageExtension(absoluteSrc);
              const filename = `image${++imageIndex}${ext}`;
              imageMap.set(absoluteSrc, filename);
            }
          } catch {
            // Invalid URL, skip
          }
        }
      }
    });
  });

  console.log(`[WebClipper] Found ${imageMap.size} unique images to extract`);

  return { imageMap, imageAltMap };
}

/**
 * Clone the document for Readability and restore original DOM by removing placeholders
 */
function cloneAndRestoreDocument(embedPlaceholders: EmbedPlaceholder[]): Document {
  // Clone document for Readability (it modifies the DOM)
  const documentClone = document.cloneNode(true) as Document;

  // Restore original DOM by removing placeholders
  embedPlaceholders.forEach(({ placeholder, parent }) => {
    if (parent && placeholder.parentElement === parent) {
      parent.removeChild(placeholder);
    }
  });

  return documentClone;
}

/**
 * Parse the article content using Mozilla Readability
 * Returns null if article extraction fails
 */
function parseWithReadability(documentClone: Document): ReturnType<Readability['parse']> {
  const reader = new Readability(documentClone);
  return reader.parse();
}

/**
 * Clean article content by removing ads, related articles, and unmapped images
 */
function cleanArticleContent(
  articleContent: string,
  imageMap: Map<string, string>,
  imageAltMap: Map<string, string>
): HTMLDivElement {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = articleContent;

  // Apply enhanced content filters
  const filterStats = applyContentFilters(tempDiv, { debug: false });
  console.log('[WebClipper] Content filter stats:', filterStats);

  const containerTags = ['DIV', 'SECTION', 'ASIDE', 'NAV', 'FOOTER', 'FIGURE'];

  // Remove related articles sections
  const relatedSelectors = [
    '[class*="related"]',
    '[class*="similar"]',
    '[class*="more-articles"]',
    '[class*="same-theme"]',
    '[class*="sur-le-meme"]',
    '[class*="a-lire"]',
    '[class*="read-more"]',
    '[class*="recommendations"]',
    '.fig-related',
    '.fig-premium-article',
  ];
  relatedSelectors.forEach((selector) => {
    tempDiv.querySelectorAll(selector).forEach((el) => {
      if (containerTags.includes(el.tagName)) {
        el.remove();
      }
    });
  });

  // Remove ad containers
  const adSelectors = [
    'a[href*="skip"]',
    'a[href*="publicite"]',
    'div[class*="pub-"]',
    'div[class*="-pub"]',
    'div[class*="ad-"]',
    'div[class*="-ad"]',
    'div[class*="advertisement"]',
    'div[class*="sponsor"]',
    'div[class*="promo"]',
    'div[id*="ad-"]',
    'div[id*="pub-"]',
    'div[id^="google_ads_iframe_"]',
    'iframe[id^="google_ads_iframe_"]',
    'div[id*="google_ad"]',
    'div[id*="doubleclick"]',
    '[data-ad]',
    'div.ad',
    'div.ads',
    'div.pub',
    '.adsbygoogle',
    'div[class*="google-ad"]',
  ];
  adSelectors.forEach((selector) => {
    tempDiv.querySelectorAll(selector).forEach((el) => el.remove());
  });

  // Remove ad-related text nodes
  const adTextPatterns = [
    'Passer la publicité',
    'publicité',
    'Publicité',
    'PUBLICITÉ',
    'Skip ad',
    'Skip to content',
    'Advertisement',
    'Sponsored',
    'Contenu sponsorisé',
  ];
  const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null);
  const nodesToRemove: Node[] = [];
  while (walker.nextNode()) {
    const text = walker.currentNode.textContent || '';
    if (text.trim().length < 50 && adTextPatterns.some((pattern) => text.includes(pattern))) {
      nodesToRemove.push(walker.currentNode.parentElement || walker.currentNode);
    }
  }
  nodesToRemove.forEach((node) => {
    if (node.parentElement) {
      node.parentElement.removeChild(node);
    }
  });

  // Remove unmapped images and clean up lazy-loading attributes
  tempDiv.querySelectorAll('img').forEach((img) => {
    let src = img.getAttribute('src') ||
              img.getAttribute('data-src') ||
              img.getAttribute('data-lazy-src');

    let found = false;

    if (src) {
      try {
        const absoluteSrc = new URL(src, window.location.href).href;
        found = imageMap.has(absoluteSrc);
      } catch {
        // Invalid URL
      }
    }

    // Fallback: check by alt text
    if (!found) {
      const alt = img.getAttribute('alt');
      if (alt && alt.length > 10) {
        found = imageAltMap.has(alt);
      }
    }

    if (!found) {
      const parent = img.parentElement;
      if (parent) {
        parent.removeChild(img);
      }
    } else {
      // Clean up lazy-loading attributes
      img.removeAttribute('data-src');
      img.removeAttribute('data-lazy-src');
      img.removeAttribute('srcset');
      img.removeAttribute('data-srcset');
    }
  });

  return tempDiv;
}

/**
 * Convert cleaned HTML to Markdown with image and embed mappings
 */
function convertToMarkdown(
  cleanedHTML: string,
  imageMap: Map<string, string>,
  imageAltMap: Map<string, string>,
  embedDataMap: Map<string, CapturedEmbed>
): string {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  });

  // Add embed replacement rules BEFORE images rule
  addEmbedRules(turndownService, embedDataMap);

  // Custom rule for images to map to local media paths
  turndownService.addRule('images', {
    filter: 'img',
    replacement: (_content, node) => {
      const img = node as HTMLImageElement;
      const alt = img.alt || '';
      let src = img.getAttribute('src') || '';

      let filename: string | undefined;

      // Try to match by src URL
      if (src) {
        try {
          const absoluteSrc = new URL(src, window.location.href).href;
          filename = imageMap.get(absoluteSrc);
        } catch {
          // Invalid URL
        }
      }

      // Fallback: try to match by alt text
      if (!filename && alt && alt.length > 10) {
        filename = imageAltMap.get(alt);
      }

      // If we found a mapping, use local media path
      if (filename) {
        return `![${alt}](media/${filename})`;
      }

      // Image not in our map, skip it
      return '';
    },
  });

  let markdown = turndownService.turndown(cleanedHTML);

  // Replace embed placeholders with actual embed images
  embedDataMap.forEach((captured, embedId) => {
    const placeholder = `WEBCLIPPEREMBED${embedId}PLACEHOLDER`;
    const alt = captured.metadata.altText || captured.metadata.title || 'Embedded content';
    let embedMarkdown = `![${alt}](media/${captured.filename})`;

    // Add source attribution
    if (captured.metadata.sourceUrl && captured.metadata.sourceName) {
      embedMarkdown += `\n\n*Source: [${captured.metadata.sourceName}](${captured.metadata.sourceUrl})*`;
    } else if (captured.metadata.sourceName) {
      embedMarkdown += `\n\n*Source: ${captured.metadata.sourceName}*`;
    }

    markdown = markdown.replace(placeholder, embedMarkdown);
  });

  return markdown;
}

/**
 * Capture article using Readability with embedded content capture
 */
export async function captureArticle(config: CaptureConfig): Promise<CaptureResult> {
  // 1. Find the article element FIRST to scope embed detection
  const articleElement = findArticleElement();

  // 2. Detect embeds and prepare placeholders
  const { detectedEmbeds, embedPlaceholders } = detectAndPrepareEmbeds(articleElement);

  // 3. Capture embed screenshots
  const embedDataMap = await captureEmbedScreenshots(detectedEmbeds);

  // 4. Extract images from original document before Readability processing
  const { imageMap, imageAltMap } = extractImageMap(articleElement);

  // 5. Clone document and restore original DOM
  const documentClone = cloneAndRestoreDocument(embedPlaceholders);

  // 6. Parse article with Readability
  const article = parseWithReadability(documentClone);

  if (!article) {
    return {
      mode: 'article',
      title: document.title,
      url: window.location.href,
      markdown: '# ' + document.title + '\n\n*Could not extract article content*',
      images: [],
    };
  }

  // 7. Clean article content
  const cleanedElement = cleanArticleContent(article.content || '', imageMap, imageAltMap);

  // 8. Convert to Markdown
  const markdown = convertToMarkdown(cleanedElement.innerHTML, imageMap, imageAltMap, embedDataMap);

  // Fetch and resize regular images
  const regularImages = await extractImages(imageMap, config);

  // Combine regular images and embed images
  const embedImages: ImagePayload[] = Array.from(embedDataMap.values()).map((embed) => ({
    filename: embed.filename,
    data: embed.data,
    originalUrl: '', // Embeds don't have a source URL for the image itself
  }));

  const allImages = [...regularImages, ...embedImages];

  return {
    mode: 'article',
    title: article.title || document.title,
    url: window.location.href,
    markdown,
    images: allImages,
  };
}

/**
 * Extract and process images
 */
export async function extractImages(
  imageMap: Map<string, string>,
  config: CaptureConfig
): Promise<ImagePayload[]> {
  const images: ImagePayload[] = [];

  for (const [originalUrl, filename] of imageMap) {
    try {
      const imageData = await fetchAndResizeImage(originalUrl, config);
      if (imageData) {
        images.push({
          filename,
          data: imageData,
          originalUrl,
        });
      }
    } catch (err) {
      console.warn(`Failed to process image ${originalUrl}:`, err);
    }
  }

  return images;
}

/**
 * Fetch and resize a single image
 */
async function fetchAndResizeImage(
  url: string,
  config: CaptureConfig
): Promise<string | null> {
  try {
    // Try via background script first (to avoid CORS)
    const response = await chrome.runtime.sendMessage({
      type: 'FETCH_IMAGE',
      payload: { url },
    });

    if (response.error) {
      // Fallback to direct fetch
      return fetchImageDirect(url, config);
    }

    // Process the image data
    return processImageData(response.data, response.contentType, config);
  } catch {
    // Fallback to direct fetch
    return fetchImageDirect(url, config);
  }
}

/**
 * Direct image fetch (fallback)
 */
async function fetchImageDirect(url: string, config: CaptureConfig): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    const img = await createImageBitmap(blob);
    const { width, height } = img;

    // Calculate new dimensions
    const maxDim = config.maxDimensionPx;
    let newWidth = width;
    let newHeight = height;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        newWidth = maxDim;
        newHeight = Math.round((height / width) * maxDim);
      } else {
        newHeight = maxDim;
        newWidth = Math.round((width / height) * maxDim);
      }
    }

    // Create canvas for resizing
    const canvas = new OffscreenCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    // Convert to blob with quality reduction if needed
    let quality = 0.9;
    let resultBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });

    // Reduce quality until under size limit
    while (resultBlob.size > config.maxSizeBytes && quality > 0.1) {
      quality -= 0.1;
      resultBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    }

    // If still too large, skip this image
    if (resultBlob.size > config.maxSizeBytes) {
      console.warn(`Image ${url} still too large after compression`);
      return null;
    }

    // Convert to base64
    const arrayBuffer = await resultBlob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    return base64;
  } catch (err) {
    console.warn(`Error processing image ${url}:`, err);
    return null;
  }
}

/**
 * Process image data from background script
 */
async function processImageData(
  base64Data: string,
  contentType: string,
  config: CaptureConfig
): Promise<string | null> {
  try {
    const blob = await fetch(`data:${contentType};base64,${base64Data}`).then((r) => r.blob());
    const img = await createImageBitmap(blob);
    let { width, height } = img;
    const maxDim = config.maxDimensionPx;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height / width) * maxDim);
        width = maxDim;
      } else {
        width = Math.round((width / height) * maxDim);
        height = maxDim;
      }
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.9;
    let resultBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });

    while (resultBlob.size > config.maxSizeBytes && quality > 0.1) {
      quality -= 0.1;
      resultBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    }

    if (resultBlob.size > config.maxSizeBytes) {
      return null;
    }

    const arrayBuffer = await resultBlob.arrayBuffer();
    return btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
  } catch {
    return null;
  }
}

/**
 * Get file extension from URL
 */
export function getImageExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return '.' + ext;
    }
  } catch {
    // Invalid URL
  }
  return '.jpg'; // Default to jpg (we convert anyway)
}
