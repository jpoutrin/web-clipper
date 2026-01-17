import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { CaptureResult, ImagePayload, Message, CaptureConfig } from './types';
import { captureBookmark, generateBookmarkMarkdown } from './capture/bookmark';
import { captureFullPage } from './capture/fullpage';
import { SelectionOverlay } from './capture/selection-overlay';

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
 * Capture article using Readability (existing functionality)
 */
async function captureArticle(config: CaptureConfig): Promise<CaptureResult> {
  // Clone document for Readability (it modifies the DOM)
  const documentClone = document.cloneNode(true) as Document;

  // Extract article content using Readability
  const reader = new Readability(documentClone);
  const article = reader.parse();

  if (!article) {
    return {
      mode: 'article',
      title: document.title,
      url: window.location.href,
      markdown: '# ' + document.title + '\n\n*Could not extract article content*',
      images: [],
    };
  }

  // Create a temporary div to parse the HTML content
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = article.content || '';

  // Extract and process images
  const imageMap = new Map<string, string>(); // originalUrl -> localFilename
  const imgElements = tempDiv.querySelectorAll('img');
  let imageIndex = 0;

  imgElements.forEach((img) => {
    const src = img.getAttribute('src');
    if (src && !src.startsWith('data:')) {
      const ext = getImageExtension(src);
      const filename = `image${++imageIndex}${ext}`;
      imageMap.set(src, filename);
      // Update src to local path for Markdown
      img.setAttribute('src', `media/${filename}`);
    }
  });

  // Convert HTML to Markdown
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  });

  // Custom rule for images to use local paths
  turndownService.addRule('images', {
    filter: 'img',
    replacement: (_content, node) => {
      const img = node as HTMLImageElement;
      const alt = img.alt || '';
      const src = img.getAttribute('src') || '';
      return `![${alt}](${src})`;
    },
  });

  const markdown = turndownService.turndown(tempDiv.innerHTML);

  // Fetch and resize images
  const images = await extractImages(imageMap, config);

  return {
    mode: 'article',
    title: article.title || document.title,
    url: window.location.href,
    markdown,
    images,
  };
}

/**
 * Extract and process images
 */
async function extractImages(
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
  return '.jpg'; // Default to jpg (we convert anyway)
}
