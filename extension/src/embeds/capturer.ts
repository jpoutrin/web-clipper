/**
 * Embed Capturer
 * TS-0004: Capture embeds as screenshots via background script
 */

import {
  DetectedEmbed,
  CapturedEmbed,
  EmbedCaptureConfig,
  DEFAULT_EMBED_CONFIG,
} from './types';
import { CaptureEmbedResponse } from '../types';
import { prepareEmbed } from './preparer';
import { detectEmbeds } from './detector';

/**
 * Capture a single embed element.
 *
 * @param embed - The detected embed to capture
 * @returns Captured embed data or null if capture failed
 */
export async function captureEmbed(embed: DetectedEmbed): Promise<CapturedEmbed | null> {
  try {
    // Prepare the embed (scroll, wait for load)
    const bounds = await prepareEmbed(embed);

    // Request screenshot from background script
    const response: CaptureEmbedResponse = await chrome.runtime.sendMessage({
      type: 'CAPTURE_EMBED',
      payload: {
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
        devicePixelRatio: window.devicePixelRatio,
      },
    });

    if (!response.success || !response.data) {
      console.warn(`[WebClipper] Embed capture failed: ${response.error}`);
      return null;
    }

    // Generate filename
    const filename = generateEmbedFilename(embed);

    return {
      filename,
      data: response.data,
      providerId: embed.provider.id,
      metadata: embed.metadata,
      bounds: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      },
    };
  } catch (err) {
    console.error(`[WebClipper] Error capturing embed:`, err);
    return null;
  }
}

/**
 * Capture all detected embeds with timeout handling.
 *
 * @param embeds - Array of detected embeds
 * @param config - Capture configuration
 * @returns Array of successfully captured embeds
 */
export async function captureAllEmbeds(
  embeds: DetectedEmbed[],
  config: EmbedCaptureConfig = DEFAULT_EMBED_CONFIG
): Promise<CapturedEmbed[]> {
  const captured: CapturedEmbed[] = [];
  const startTime = Date.now();

  for (const embed of embeds) {
    // Check total time limit
    if (Date.now() - startTime > config.maxTotalTime) {
      console.warn('[WebClipper] Embed capture timeout - stopping further captures');
      break;
    }

    // Capture with per-embed timeout
    const result = await Promise.race([
      captureEmbedWithFallback(embed),
      timeout(config.maxTimePerEmbed),
    ]);

    if (result) {
      captured.push(result);
    }
  }

  return captured;
}

/**
 * Capture embed with fallback cascade.
 * Level 1: Full capture with preparation
 * Level 2: Immediate capture without preparation
 * Level 3: Return null (metadata-only fallback handled by integrator)
 */
async function captureEmbedWithFallback(embed: DetectedEmbed): Promise<CapturedEmbed | null> {
  // Level 1: Full capture with preparation
  try {
    const result = await captureEmbed(embed);
    if (result) return result;
  } catch (err) {
    console.warn(`[WebClipper] Level 1 capture failed for ${embed.provider.id}:`, err);
  }

  // Level 2: Immediate capture without preparation
  try {
    const bounds = embed.element.getBoundingClientRect();
    const response: CaptureEmbedResponse = await chrome.runtime.sendMessage({
      type: 'CAPTURE_EMBED',
      payload: {
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
        devicePixelRatio: window.devicePixelRatio,
      },
    });

    if (response.success && response.data) {
      return {
        filename: generateEmbedFilename(embed),
        data: response.data,
        providerId: embed.provider.id,
        metadata: embed.metadata,
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
      };
    }
  } catch (err) {
    console.warn(`[WebClipper] Level 2 capture failed for ${embed.provider.id}:`, err);
  }

  // Level 3: Return null - integrator will generate fallback markdown
  return null;
}

/**
 * Generate a filename for a captured embed.
 */
function generateEmbedFilename(embed: DetectedEmbed): string {
  const sanitizedProvider = embed.provider.id.replace(/[^a-z0-9]/gi, '-');
  return `embed${embed.index}_${sanitizedProvider}.png`;
}

/**
 * Timeout promise that resolves to null.
 */
function timeout(ms: number): Promise<null> {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}

/**
 * Safe wrapper for embed detection that never throws.
 */
export function safeDetectEmbeds(
  config: EmbedCaptureConfig = DEFAULT_EMBED_CONFIG,
  scope?: HTMLElement | Document
): DetectedEmbed[] {
  try {
    return detectEmbeds(config, scope);
  } catch (err) {
    console.error('[WebClipper] Embed detection failed:', err);
    return [];
  }
}

/**
 * Safe wrapper for embed capture that never throws.
 */
export async function safeCaptureAllEmbeds(
  embeds: DetectedEmbed[],
  config: EmbedCaptureConfig = DEFAULT_EMBED_CONFIG
): Promise<CapturedEmbed[]> {
  try {
    return await captureAllEmbeds(embeds, config);
  } catch (err) {
    console.error('[WebClipper] Embed capture failed:', err);
    return [];
  }
}
