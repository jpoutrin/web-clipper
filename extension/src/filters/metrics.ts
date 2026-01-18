/**
 * Content metrics collection for filtering decisions.
 *
 * Collects text length, word count, link density, and image metrics
 * for each element to inform filtering decisions.
 */

import { ElementMetrics } from './types';
import { classifyImageSize } from './image-classifier';

/**
 * Measure text length (excluding whitespace).
 */
export function measureTextLength(text: string): number {
  return text.replace(/\s+/g, '').length;
}

/**
 * Count words in text.
 * Only counts words with 3+ characters to filter out noise.
 */
export function countWords(text: string): number {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return 0;
  return normalized.split(/\s+/).filter((w) => w.length >= 3).length;
}

/**
 * Collect content metrics for an element and its children.
 * This is used by multiple filters to make decisions.
 */
export function collectMetrics(element: Element): ElementMetrics {
  let plainTextLength = 0;
  let plainWordCount = 0;
  let linkTextLength = 0;
  let linkWordCount = 0;
  let linkCount = 0;
  const images = { large: 0, medium: 0, small: 0, skip: 0 };

  // Track ancestor links to handle nested content
  const isInsideLink = (node: Node): boolean => {
    let current: Node | null = node.parentNode;
    while (current && current !== element) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        const el = current as Element;
        if (el.tagName.toLowerCase() === 'a') {
          return true;
        }
      }
      current = current.parentNode;
    }
    return false;
  };

  // Count links
  const links = element.querySelectorAll('a');
  linkCount = links.length;

  // Classify images
  const imgs = element.querySelectorAll('img');
  imgs.forEach((img) => {
    const size = classifyImageSize(img as HTMLImageElement);
    images[size]++;
  });

  // Walk text nodes
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.textContent || '';
    const trimmed = text.trim();

    if (!trimmed) continue;

    const length = measureTextLength(trimmed);
    const words = countWords(trimmed);

    if (isInsideLink(node)) {
      linkTextLength += length;
      linkWordCount += words;
    } else {
      plainTextLength += length;
      plainWordCount += words;
    }
  }

  // Compute derived metrics
  const totalTextLength = plainTextLength + linkTextLength;
  const linkDensity = totalTextLength > 0 ? linkTextLength / totalTextLength : 0;

  // Check if element is floated
  let isFloating = false;
  try {
    const computedStyle = window.getComputedStyle(element as HTMLElement);
    const float = computedStyle.getPropertyValue('float');
    isFloating = float === 'left' || float === 'right';
  } catch {
    // getComputedStyle may fail for detached elements
  }

  return {
    plainTextLength,
    plainWordCount,
    linkTextLength,
    linkWordCount,
    linkCount,
    totalTextLength,
    images,
    isFloating,
    linkDensity,
  };
}

/**
 * Create a summary string of metrics for debugging.
 */
export function formatMetrics(metrics: ElementMetrics): string {
  return [
    `plainText: ${metrics.plainTextLength} chars, ${metrics.plainWordCount} words`,
    `linkText: ${metrics.linkTextLength} chars, ${metrics.linkWordCount} words`,
    `links: ${metrics.linkCount}`,
    `linkDensity: ${(metrics.linkDensity * 100).toFixed(1)}%`,
    `images: L${metrics.images.large}/M${metrics.images.medium}/S${metrics.images.small}/X${metrics.images.skip}`,
    `floating: ${metrics.isFloating}`,
  ].join(', ');
}
