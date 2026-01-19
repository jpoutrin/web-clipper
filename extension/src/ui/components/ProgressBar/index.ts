/**
 * Progress Bar Component
 *
 * Exports the Progress Bar component for use throughout the Web Clipper UI.
 *
 * @example Linear progress bar
 * ```typescript
 * import { createProgressBar } from './components/ProgressBar';
 *
 * const progress = createProgressBar({
 *   value: 50,
 *   variant: 'linear',
 *   size: 'md',
 *   showPercentage: true,
 *   animated: true,
 *   ariaLabel: 'Upload progress'
 * });
 *
 * document.body.appendChild(progress);
 * ```
 *
 * @example Phased progress bar
 * ```typescript
 * import { createProgressBar, type ProgressPhase } from './components/ProgressBar';
 *
 * const phases: ProgressPhase[] = [
 *   { id: 'capture', label: 'Capturing', status: 'completed' },
 *   { id: 'process', label: 'Processing', status: 'active' },
 *   { id: 'upload', label: 'Uploading', status: 'pending' }
 * ];
 *
 * const progress = createProgressBar({
 *   value: 66,
 *   variant: 'phased',
 *   phases,
 *   size: 'md',
 *   ariaLabel: 'Clip creation progress'
 * });
 *
 * document.body.appendChild(progress);
 * ```
 *
 * @module ProgressBar
 */

export { ProgressBar, createProgressBar } from './ProgressBar';
export type { ProgressBarProps, ProgressPhase } from './ProgressBar';
