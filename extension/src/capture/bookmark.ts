/**
 * Bookmark Capture Module
 *
 * Captures URL, title, and a brief excerpt for quick bookmarking.
 * The simplest capture mode - no images or full content extraction.
 */

export interface BookmarkCapture {
  title: string;
  url: string;
  excerpt: string;
  favicon?: string;
}

/**
 * Capture bookmark data from the current page
 */
export function captureBookmark(): BookmarkCapture {
  const title = document.title || 'Untitled';
  const url = window.location.href;
  const excerpt = getExcerpt();
  const favicon = getFavicon();

  return { title, url, excerpt, favicon };
}

/**
 * Extract excerpt from meta description or first paragraph
 */
function getExcerpt(): string {
  // Try meta description first
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc?.getAttribute('content')) {
    return metaDesc.getAttribute('content')!.slice(0, 300);
  }

  // Try og:description
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc?.getAttribute('content')) {
    return ogDesc.getAttribute('content')!.slice(0, 300);
  }

  // Try twitter:description
  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc?.getAttribute('content')) {
    return twitterDesc.getAttribute('content')!.slice(0, 300);
  }

  // Fall back to first paragraph
  const firstP = document.querySelector('article p, main p, .content p, p');
  if (firstP?.textContent) {
    return firstP.textContent.trim().slice(0, 300);
  }

  return '';
}

/**
 * Get favicon URL
 */
function getFavicon(): string | undefined {
  // Check for apple-touch-icon (higher quality)
  const apple = document.querySelector('link[rel="apple-touch-icon"]');
  if (apple?.getAttribute('href')) {
    return new URL(apple.getAttribute('href')!, window.location.href).href;
  }

  // Check for high-res icons
  const icon32 = document.querySelector('link[rel="icon"][sizes="32x32"]');
  if (icon32?.getAttribute('href')) {
    return new URL(icon32.getAttribute('href')!, window.location.href).href;
  }

  // Check for standard favicon
  const favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
  if (favicon?.getAttribute('href')) {
    return new URL(favicon.getAttribute('href')!, window.location.href).href;
  }

  // Default favicon path
  return new URL('/favicon.ico', window.location.origin).href;
}

/**
 * Generate markdown for bookmark
 */
export function generateBookmarkMarkdown(bookmark: BookmarkCapture): string {
  const domain = extractDomain(bookmark.url);
  let md = `# [${bookmark.title}](${bookmark.url})\n\n`;

  if (bookmark.excerpt) {
    md += `> ${bookmark.excerpt}\n\n`;
  }

  md += `*Bookmarked from ${domain}*\n`;

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
