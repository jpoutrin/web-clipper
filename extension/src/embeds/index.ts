/**
 * Embedded Content Capture Module
 * TS-0004: Main exports for embed detection and capture
 */

export * from './types';
export { providerRegistry } from './providers';
export { detectEmbeds } from './detector';
export { prepareEmbed } from './preparer';
export {
  captureEmbed,
  captureAllEmbeds,
  safeDetectEmbeds,
  safeCaptureAllEmbeds,
} from './capturer';
export { addEmbedRules } from './integrator';
