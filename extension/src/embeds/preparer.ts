/**
 * Embed Preparation
 * TS-0004: Scroll embeds into view and wait for content to load
 */

import { DetectedEmbed } from './types';

/**
 * Prepare an embed for capture by scrolling it into view
 * and waiting for its content to load.
 *
 * @param embed - The detected embed to prepare
 * @returns Updated bounds after preparation
 */
export async function prepareEmbed(embed: DetectedEmbed): Promise<DOMRect> {
  const { element, provider } = embed;

  // Scroll into view if required
  if (provider.requiresScroll) {
    await scrollIntoView(element);
  }

  // Wait for content to load
  if (provider.waitForSelector) {
    await waitForSelector(element, provider.waitForSelector, provider.waitTimeout || 3000);
  } else if (provider.waitTimeout) {
    // Generic wait for lazy-loaded content
    await wait(Math.min(provider.waitTimeout, 1000));
  }

  // Re-measure bounds after scrolling and loading
  const updatedBounds = element.getBoundingClientRect();

  return updatedBounds;
}

/**
 * Scroll an element into the center of the viewport.
 */
async function scrollIntoView(element: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    element.scrollIntoView({
      behavior: 'instant',
      block: 'center',
      inline: 'center',
    });

    // Wait for scroll to complete
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

/**
 * Wait for a selector to appear within an element.
 */
async function waitForSelector(
  container: HTMLElement,
  selector: string,
  timeout: number
): Promise<boolean> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    // Check if already present
    if (container.querySelector(selector)) {
      resolve(true);
      return;
    }

    // For iframes, check inside the frame if same-origin
    if (container.tagName === 'IFRAME') {
      try {
        const iframe = container as HTMLIFrameElement;
        const doc = iframe.contentDocument;
        if (doc && doc.querySelector(selector)) {
          resolve(true);
          return;
        }
      } catch {
        // Cross-origin iframe, can't check inside
      }
    }

    // Poll for the selector
    const interval = setInterval(() => {
      if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        resolve(false);
        return;
      }

      if (container.querySelector(selector)) {
        clearInterval(interval);
        resolve(true);
        return;
      }

      // Check iframe content if accessible
      if (container.tagName === 'IFRAME') {
        try {
          const iframe = container as HTMLIFrameElement;
          const doc = iframe.contentDocument;
          if (doc && doc.querySelector(selector)) {
            clearInterval(interval);
            resolve(true);
            return;
          }
        } catch {
          // Cross-origin, continue polling
        }
      }
    }, 100);
  });
}

/**
 * Simple wait utility.
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
