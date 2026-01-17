/**
 * Selection Capture Module
 *
 * Captures a selected HTML element and converts it to Markdown.
 * Handles image extraction and style processing.
 */

import TurndownService from 'turndown';
import { ImagePayload, CaptureConfig } from '../types';

export interface SelectionCapture {
  html: string;
  markdown: string;
  images: ImagePayload[];
  selector: string;
}

/**
 * Capture a selected element as Markdown with images
 *
 * @param element - The HTML element to capture
 * @param config - Capture configuration
 * @returns Captured content with images
 */
export async function captureSelection(
  element: HTMLElement,
  config: CaptureConfig
): Promise<SelectionCapture> {
  // Clone the element
  const clone = element.cloneNode(true) as HTMLElement;

  // Get unique selector for reference
  const selector = getUniqueSelector(element);

  // Extract images and update references
  const imageMap = new Map<string, string>();
  const imgElements = clone.querySelectorAll('img');
  let imageIndex = 0;

  imgElements.forEach((img) => {
    const src = img.getAttribute('src') || img.getAttribute('data-src');
    if (src && !src.startsWith('data:')) {
      // Resolve relative URLs
      const absoluteUrl = new URL(src, window.location.href).href;
      const ext = getImageExtension(absoluteUrl);
      const filename = `image${++imageIndex}${ext}`;
      imageMap.set(absoluteUrl, filename);
      img.setAttribute('src', `media/${filename}`);
      img.removeAttribute('data-src');
      img.removeAttribute('srcset');
    }
  });

  // Get HTML
  const html = clone.outerHTML;

  // Convert to Markdown
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  });

  // Custom rule for code blocks
  turndown.addRule('codeBlocks', {
    filter: (node) => {
      return node.nodeName === 'PRE' && node.querySelector('code') !== null;
    },
    replacement: (_content, node) => {
      const code = (node as HTMLElement).querySelector('code');
      if (code) {
        const language = code.className.match(/language-(\w+)/)?.[1] || '';
        return `\n\`\`\`${language}\n${code.textContent}\n\`\`\`\n`;
      }
      return _content;
    },
  });

  const markdown = turndown.turndown(html);

  // Fetch images
  const images = await fetchImages(imageMap, config);

  return { html, markdown, images, selector };
}

/**
 * Generate a unique CSS selector for an element
 */
export function getUniqueSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`;
  }

  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.className && typeof current.className === 'string') {
      const classes = current.className
        .split(' ')
        .filter((c) => c && !c.startsWith('web-clipper'))
        .slice(0, 2)
        .join('.');
      if (classes) selector += `.${classes}`;
    }

    // Add nth-child if needed for uniqueness
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c) => c.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

/**
 * Get file extension from URL
 */
function getImageExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return '.' + ext;
    }
  } catch {
    // Invalid URL
  }
  return '.jpg';
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
        console.warn(`Failed to fetch image via background: ${url}`, response.error);
        // Try direct fetch as fallback
        const directResult = await fetchImageDirect(url, filename, config);
        if (directResult) {
          images.push(directResult);
        }
        continue;
      }

      // Process the image data
      const processed = await processImageData(
        response.data,
        response.contentType,
        filename,
        config
      );
      if (processed) {
        images.push({ ...processed, originalUrl: url });
      }
    } catch (err) {
      console.warn(`Failed to fetch image: ${url}`, err);
    }
  }

  return images;
}

/**
 * Direct image fetch (fallback if background fetch fails)
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
    const img = await createImageBitmap(blob);

    // Resize if needed
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

    let resultBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });

    // Compress if too large
    let quality = 0.85;
    while (resultBlob.size > config.maxSizeBytes && quality > 0.3) {
      quality -= 0.1;
      resultBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    }

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
  config: CaptureConfig
): Promise<{ filename: string; data: string } | null> {
  try {
    // Decode and resize
    const blob = await fetch(`data:${contentType};base64,${base64Data}`).then((r) => r.blob());

    // For SVGs, just return as-is
    if (contentType === 'image/svg+xml') {
      return { filename, data: base64Data };
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

    let resultBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });

    // Compress if too large
    let quality = 0.85;
    while (resultBlob.size > config.maxSizeBytes && quality > 0.3) {
      quality -= 0.1;
      resultBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    }

    const arrayBuffer = await resultBlob.arrayBuffer();
    const processedBase64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    return { filename, data: processedBase64 };
  } catch (err) {
    console.warn(`Failed to process image:`, err);
    return null;
  }
}
