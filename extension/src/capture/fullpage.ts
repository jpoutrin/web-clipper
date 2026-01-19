/**
 * Full Page Capture Module
 *
 * Captures the entire page with computed styles inlined.
 * Creates a self-contained HTML file that renders correctly offline.
 */

import { ImagePayload, CaptureConfig } from '../types';

export interface FullPageCapture {
  html: string;
  images: ImagePayload[];
}

/**
 * Essential CSS properties to inline for fidelity
 */
const ESSENTIAL_CSS_PROPS = [
  // Layout
  'display',
  'position',
  'top',
  'left',
  'right',
  'bottom',
  'float',
  'clear',
  'z-index',
  'overflow',
  'overflow-x',
  'overflow-y',

  // Box Model
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border',
  'border-width',
  'border-style',
  'border-color',
  'border-radius',
  'box-sizing',

  // Flexbox
  'flex',
  'flex-direction',
  'flex-wrap',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'justify-content',
  'align-items',
  'align-self',
  'align-content',
  'order',
  'gap',

  // Grid
  'grid',
  'grid-template-columns',
  'grid-template-rows',
  'grid-column',
  'grid-row',
  'grid-area',
  'grid-gap',
  'grid-auto-flow',

  // Typography
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-decoration',
  'text-transform',
  'white-space',
  'word-wrap',
  'word-break',
  'text-overflow',

  // Colors & Background
  'color',
  'background',
  'background-color',
  'background-image',
  'background-position',
  'background-size',
  'background-repeat',

  // Visual Effects
  'opacity',
  'visibility',
  'box-shadow',
  'text-shadow',
  'transform',

  // Table
  'border-collapse',
  'border-spacing',
  'table-layout',

  // List
  'list-style',
  'list-style-type',
  'list-style-position',
];

/**
 * Selectors for elements to remove from capture
 */
const UNWANTED_SELECTORS = [
  'script',
  'noscript',
  'style[data-styled]',
  'link[rel="preload"]',
  'link[rel="prefetch"]',
  'link[rel="modulepreload"]',
  'iframe[src*="ads"]',
  'iframe[src*="doubleclick"]',
  'iframe[src*="googlesyndication"]',
  '.ad',
  '.ads',
  '.advertisement',
  '.adsbygoogle',
  '#web-clipper-selection-host',
  '[aria-hidden="true"]',
];

/**
 * Capture the full page with inlined styles
 *
 * @param config - Capture configuration
 * @returns Full page HTML with images
 */
export async function captureFullPage(config: CaptureConfig): Promise<FullPageCapture> {
  // Clone the entire document
  const docClone = document.documentElement.cloneNode(true) as HTMLElement;

  // Remove unwanted elements
  removeUnwantedElements(docClone);

  // Inline computed styles
  await inlineStyles(document.documentElement, docClone);

  // Process images
  const imageMap = new Map<string, string>();
  await processImages(docClone, imageMap);

  // Get final HTML
  const html = `<!DOCTYPE html>\n${docClone.outerHTML}`;

  // Fetch images
  const images = await fetchImages(imageMap, config);

  return { html, images };
}

/**
 * Remove unwanted elements from the cloned document
 */
function removeUnwantedElements(root: HTMLElement): void {
  UNWANTED_SELECTORS.forEach((selector) => {
    try {
      root.querySelectorAll(selector).forEach((el) => el.remove());
    } catch {
      // Invalid selector, skip
    }
  });

  // Remove inline scripts
  root.querySelectorAll('*').forEach((el) => {
    // Remove event handlers
    const attrs = Array.from(el.attributes);
    attrs.forEach((attr) => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });
}

/**
 * Inline computed styles from original to clone
 */
async function inlineStyles(
  originalRoot: HTMLElement,
  cloneRoot: HTMLElement
): Promise<void> {
  const originalElements = originalRoot.querySelectorAll('*');
  const cloneElements = cloneRoot.querySelectorAll('*');

  // Process in batches to avoid blocking
  const batchSize = 100;
  for (let i = 0; i < originalElements.length; i += batchSize) {
    const batch = Array.from(originalElements).slice(i, i + batchSize);

    batch.forEach((originalEl, j) => {
      const cloneEl = cloneElements[i + j] as HTMLElement;
      if (!cloneEl || !(originalEl instanceof HTMLElement)) return;

      try {
        // Get computed styles
        const computed = window.getComputedStyle(originalEl);

        const styles: string[] = [];
        ESSENTIAL_CSS_PROPS.forEach((prop) => {
          const value = computed.getPropertyValue(prop);
          // Skip default/empty values
          if (
            value &&
            value !== 'none' &&
            value !== 'auto' &&
            value !== 'normal' &&
            value !== '0px' &&
            value !== 'rgba(0, 0, 0, 0)'
          ) {
            styles.push(`${prop}: ${value}`);
          }
        });

        if (styles.length > 0) {
          cloneEl.setAttribute('style', styles.join('; '));
        }
      } catch {
        // Skip elements that can't be styled
      }
    });

    // Yield to prevent blocking UI
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/**
 * Process images in the cloned document
 */
async function processImages(
  root: HTMLElement,
  imageMap: Map<string, string>
): Promise<void> {
  let index = 0;

  // Process img elements
  const images = root.querySelectorAll('img');
  images.forEach((img) => {
    const src = img.getAttribute('src') || img.getAttribute('data-src');
    if (src && !src.startsWith('data:')) {
      try {
        const absoluteUrl = new URL(src, window.location.href).href;
        const ext = getExtension(src);
        const filename = `image${++index}.${ext}`;
        imageMap.set(absoluteUrl, filename);
        img.setAttribute('src', `media/${filename}`);
        img.removeAttribute('srcset');
        img.removeAttribute('data-src');
        img.removeAttribute('data-srcset');
      } catch {
        // Invalid URL
      }
    }
  });

  // Process background images in inline styles
  root.querySelectorAll('[style*="background"]').forEach((el) => {
    const style = el.getAttribute('style') || '';
    const urlMatch = style.match(/url\(['"]?([^'"()]+)['"]?\)/);
    if (urlMatch && !urlMatch[1].startsWith('data:')) {
      try {
        const absoluteUrl = new URL(urlMatch[1], window.location.href).href;
        const ext = getExtension(urlMatch[1]);
        const filename = `bg${++index}.${ext}`;
        imageMap.set(absoluteUrl, filename);
        const newStyle = style.replace(urlMatch[0], `url('media/${filename}')`);
        el.setAttribute('style', newStyle);
      } catch {
        // Invalid URL
      }
    }
  });
}

/**
 * Get file extension from URL
 */
function getExtension(url: string): string {
  try {
    const pathname = new URL(url, window.location.href).pathname;
    const match = pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i);
    return match ? match[1].toLowerCase() : 'jpg';
  } catch {
    return 'jpg';
  }
}

/**
 * Fetch and process images
 */
async function fetchImages(
  imageMap: Map<string, string>,
  config: CaptureConfig
): Promise<ImagePayload[]> {
  const images: ImagePayload[] = [];

  for (const [url, filename] of imageMap) {
    try {
      // Try to fetch via background script to avoid CORS
      const response = await chrome.runtime.sendMessage({
        type: 'FETCH_IMAGE',
        payload: { url },
      });

      if (response.error) {
        // Try direct fetch as fallback
        const directResult = await fetchImageDirect(url, filename, config);
        if (directResult) {
          images.push(directResult);
        }
        continue;
      }

      // Process the image
      const processed = await processImageData(
        response.data,
        response.contentType,
        filename,
        config,
        url
      );
      if (processed) {
        images.push(processed);
      }
    } catch (err) {
      console.warn(`Failed to fetch image: ${url}`, err);
    }
  }

  return images;
}

/**
 * Direct image fetch (fallback)
 */
async function fetchImageDirect(
  url: string,
  filename: string,
  config: CaptureConfig
): Promise<ImagePayload | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();

    // For SVGs, convert to text and base64
    if (blob.type === 'image/svg+xml') {
      const text = await blob.text();
      const base64 = btoa(unescape(encodeURIComponent(text)));
      return { filename, data: base64, originalUrl: url };
    }

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

    const resultBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    const arrayBuffer = await resultBlob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    return { filename, data: base64, originalUrl: url };
  } catch (err) {
    console.warn(`Direct fetch failed for ${url}:`, err);
    return null;
  }
}

/**
 * Process image data from background script
 */
async function processImageData(
  base64Data: string,
  contentType: string,
  filename: string,
  config: CaptureConfig,
  originalUrl: string
): Promise<ImagePayload | null> {
  try {
    // For SVGs, just return as-is
    if (contentType === 'image/svg+xml') {
      return { filename, data: base64Data, originalUrl };
    }

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

    const resultBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    const arrayBuffer = await resultBlob.arrayBuffer();
    const processedBase64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    return { filename, data: processedBase64, originalUrl };
  } catch (err) {
    console.warn(`Failed to process image:`, err);
    return null;
  }
}
