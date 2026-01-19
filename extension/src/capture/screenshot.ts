/**
 * Screenshot Capture Module
 *
 * Handles screenshot compression and processing.
 * The actual capture is done in background.ts using chrome.tabs.captureVisibleTab()
 */

export interface CompressedScreenshot {
  data: string; // base64
  format: 'png' | 'jpeg';
  width: number;
  height: number;
}

export interface CompressionConfig {
  maxSizeBytes: number;
  maxDimensionPx: number;
}

/**
 * Compress a screenshot to meet size constraints
 *
 * @param base64Data - Base64 encoded PNG data
 * @param config - Compression configuration
 * @returns Compressed screenshot data
 */
export async function compressScreenshot(
  base64Data: string,
  config: CompressionConfig
): Promise<CompressedScreenshot> {
  // Decode base64 to blob
  const blob = await fetch(`data:image/png;base64,${base64Data}`).then(r => r.blob());

  // Create image bitmap
  const img = await createImageBitmap(blob);
  const { width, height } = img;

  // Calculate new dimensions if needed
  let newWidth = width;
  let newHeight = height;
  const maxDim = config.maxDimensionPx;

  if (width > maxDim || height > maxDim) {
    if (width > height) {
      newWidth = maxDim;
      newHeight = Math.round((height / width) * maxDim);
    } else {
      newHeight = maxDim;
      newWidth = Math.round((width / height) * maxDim);
    }
  }

  // Draw to canvas
  const canvas = new OffscreenCanvas(newWidth, newHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  ctx.drawImage(img, 0, 0, newWidth, newHeight);

  // Try PNG first (if dimensions were reduced, it might be small enough)
  let resultBlob = await canvas.convertToBlob({ type: 'image/png' });
  let format: 'png' | 'jpeg' = 'png';

  // If too large, convert to JPEG with quality reduction
  if (resultBlob.size > config.maxSizeBytes) {
    let quality = 0.92;
    while (resultBlob.size > config.maxSizeBytes && quality > 0.5) {
      resultBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
      format = 'jpeg';
      quality -= 0.1;
    }
  }

  // Convert to base64
  const arrayBuffer = await resultBlob.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  return {
    data: base64,
    format,
    width: newWidth,
    height: newHeight,
  };
}

/**
 * Get dimensions from a base64 image
 */
export async function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Generate markdown for screenshot
 */
export function generateScreenshotMarkdown(
  title: string,
  url: string,
  filename: string,
  dimensions: { width: number; height: number }
): string {
  const domain = extractDomain(url);

  let md = `# ${title}\n\n`;
  md += `![Screenshot](media/${filename})\n\n`;
  md += `*Screenshot captured from ${domain} (${dimensions.width}x${dimensions.height})*\n`;

  return md;
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}
