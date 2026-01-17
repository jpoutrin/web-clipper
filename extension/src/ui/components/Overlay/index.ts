/**
 * Overlay Component Library
 *
 * Exports all overlay components for use in the Web Clipper UI.
 *
 * Components:
 * - Overlay: Base overlay with fullscreen, highlight, and selection variants
 * - HighlightOverlay: Pulsing border overlay for element highlighting
 * - SelectionOverlay: Canvas-based area selection with resize handles
 *
 * @example
 * ```typescript
 * import { HighlightOverlay, SelectionOverlay } from '@/ui/components/Overlay';
 *
 * // Highlight an element
 * const highlight = new HighlightOverlay({
 *   target: element.getBoundingClientRect(),
 *   borderColor: '#3b82f6',
 *   padding: 4,
 * });
 * highlight.show();
 *
 * // Area selection
 * const selection = new SelectionOverlay({
 *   selection: null,
 *   dimOpacity: 0.5,
 *   onSelectionComplete: (rect) => {
 *     console.log('Selected area:', rect);
 *   },
 * });
 * selection.show();
 * ```
 */

export { Overlay } from './Overlay';
export type { OverlayProps } from './Overlay';

export { HighlightOverlay } from './HighlightOverlay';
export type { HighlightOverlayProps } from './HighlightOverlay';

export { SelectionOverlay } from './SelectionOverlay';
export type { SelectionOverlayProps } from './SelectionOverlay';
