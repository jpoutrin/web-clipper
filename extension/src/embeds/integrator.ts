/**
 * Embed Markdown Integrator
 * TS-0004: Turndown rules to replace embed elements with captured images
 */

import TurndownService from 'turndown';
import { CapturedEmbed } from './types';

/**
 * Create Turndown rules to replace embed elements with captured images.
 * Uses data-webclipper-embed-id attributes to match elements after DOM cloning.
 *
 * @param turndown - The Turndown service instance
 * @param capturedEmbeds - Map of embed ID (string) to captured data
 */
export function addEmbedRules(
  turndown: TurndownService,
  capturedEmbeds: Map<string, CapturedEmbed>
): void {
  // Rule for elements with captured screenshots (matched by data attribute)
  turndown.addRule('captured-embeds', {
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return false;
      const embedId = getEmbedId(node);
      return embedId !== null && capturedEmbeds.has(embedId);
    },
    replacement: (_content, node) => {
      const element = node as HTMLElement;
      const embedId = getEmbedId(element);
      const captured = embedId ? capturedEmbeds.get(embedId) : undefined;

      if (!captured) {
        return ''; // Should not happen, but safety check
      }

      return generateEmbedMarkdown(captured);
    },
  });

  // Rule for uncaptured embeds - provide link fallback
  turndown.addRule('uncaptured-embeds', {
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return false;
      const embedId = getEmbedId(node);
      // Is an embed element but wasn't captured
      return isEmbedElement(node) && (embedId === null || !capturedEmbeds.has(embedId));
    },
    replacement: (_content, node) => {
      const element = node as HTMLElement;
      return generateFallbackMarkdown(element);
    },
  });
}

/**
 * Get the embed ID from an element or its ancestors.
 */
function getEmbedId(element: HTMLElement): string | null {
  // Check the element itself
  const id = element.getAttribute('data-webclipper-embed-id');
  if (id !== null) return id;

  // Check ancestors
  let parent = element.parentElement;
  while (parent) {
    const parentId = parent.getAttribute('data-webclipper-embed-id');
    if (parentId !== null) return parentId;
    parent = parent.parentElement;
  }

  return null;
}

/**
 * Generate Markdown for a captured embed.
 */
function generateEmbedMarkdown(captured: CapturedEmbed): string {
  const { filename, metadata } = captured;
  const alt = metadata.altText || metadata.title || 'Embedded content';

  let markdown = `\n![${alt}](media/${filename})\n`;

  // Add source attribution
  if (metadata.sourceUrl && metadata.sourceName) {
    markdown += `\n*Source: [${metadata.sourceName}](${metadata.sourceUrl})*\n`;
  } else if (metadata.sourceName) {
    markdown += `\n*Source: ${metadata.sourceName}*\n`;
  }

  return markdown;
}

/**
 * Generate fallback Markdown for an uncaptured embed.
 */
function generateFallbackMarkdown(element: HTMLElement): string {
  const iframe =
    element.tagName === 'IFRAME'
      ? (element as HTMLIFrameElement)
      : element.querySelector('iframe');

  if (iframe) {
    const src = iframe.getAttribute('src') || '';
    const title = iframe.getAttribute('title') || 'Embedded Content';

    if (src) {
      return `\n*[View embedded content: ${title}](${src})*\n`;
    }
  }

  return '\n*[Embedded content could not be captured]*\n';
}

/**
 * Check if an element is an embed element.
 */
function isEmbedElement(element: HTMLElement): boolean {
  const embedTags = ['IFRAME'];
  const embedClasses = [
    'twitter-tweet',
    'flourish-embed',
    'datawrapper-embed',
    'infogram-embed',
    'youtube-player',
  ];

  if (embedTags.includes(element.tagName)) {
    return true;
  }

  return embedClasses.some((cls) => element.classList.contains(cls));
}

