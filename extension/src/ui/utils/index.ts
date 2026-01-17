/**
 * UI Utilities
 *
 * Shared utilities for the Web Clipper UI component library.
 * This module exports all utility functions for creating accessible,
 * themeable components with Shadow DOM isolation.
 */

// Shadow DOM utilities
export {
  createIsolatedComponent,
  injectTokens,
  getCombinedStyles,
} from './shadow-dom';

// Focus management
export { createFocusTrap, type FocusTrap } from './focus-trap';

// Positioning
export { positionToolbar, type Position } from './position';

// Keyboard navigation
export { handleArrowNavigation, trapTabKey } from './keyboard';

// Theme utilities
export { shouldAnimate, getTheme, watchTheme, type Theme } from './theme';
