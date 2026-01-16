import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { CaptureResult, ImagePayload, Message } from './types';

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type === 'CAPTURE_PAGE') {
    const config = message.payload as { maxDimensionPx: number; maxSizeBytes: number };
    capturePage(config).then(sendResponse);
    return true; // Async response
  }
  return false;
});

// Main capture function
async function capturePage(config: { maxDimensionPx: number; maxSizeBytes: number }): Promise<CaptureResult> {
  // Clone document for Readability (it modifies the DOM)
  const documentClone = document.cloneNode(true) as Document;

  // Extract article content using Readability
  const reader = new Readability(documentClone);
  const article = reader.parse();

  if (!article) {
    return {
      title: document.title,
      url: window.location.href,
      markdown: '# ' + document.title + '\n\n*Could not extract article content*',
      images: []
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
    emDelimiter: '*'
  });

  // Custom rule for images to use local paths
  turndownService.addRule('images', {
    filter: 'img',
    replacement: (_content, node) => {
      const img = node as HTMLImageElement;
      const alt = img.alt || '';
      const src = img.getAttribute('src') || '';
      return `![${alt}](${src})`;
    }
  });

  const markdown = turndownService.turndown(tempDiv.innerHTML);

  // Fetch and resize images
  const images = await extractImages(imageMap, config);

  return {
    title: article.title || document.title,
    url: window.location.href,
    markdown,
    images
  };
}

// Extract and process images
async function extractImages(
  imageMap: Map<string, string>,
  config: { maxDimensionPx: number; maxSizeBytes: number }
): Promise<ImagePayload[]> {
  const images: ImagePayload[] = [];

  for (const [originalUrl, filename] of imageMap) {
    try {
      const imageData = await fetchAndResizeImage(originalUrl, config);
      if (imageData) {
        images.push({
          filename,
          data: imageData,
          originalUrl
        });
      }
    } catch (err) {
      console.warn(`Failed to process image ${originalUrl}:`, err);
    }
  }

  return images;
}

// Fetch and resize a single image
async function fetchAndResizeImage(
  url: string,
  config: { maxDimensionPx: number; maxSizeBytes: number }
): Promise<string | null> {
  try {
    // Fetch the image
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();

    // Create image element to get dimensions
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

// Get file extension from URL
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
