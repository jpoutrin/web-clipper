/**
 * Web Clipper UI Component Library
 *
 * Public API exports for the Web Clipper UI component library.
 * All components are built with Shadow DOM isolation for use in extension contexts.
 *
 * @example Design Tokens
 * ```typescript
 * // Design tokens are automatically included in component styles via getCombinedStyles()
 * // For standalone usage, import token utilities:
 * import { getCombinedStyles } from '@web-clipper/ui';
 * ```
 *
 * @example Components
 * ```typescript
 * import { createButton, createDialog, toast } from '@web-clipper/ui';
 *
 * // Create a button
 * const button = createButton({ variant: 'primary' }, 'Click me');
 * document.body.appendChild(button);
 *
 * // Show a dialog
 * const dialog = createDialog({
 *   title: 'Confirm Action',
 *   description: 'Are you sure?',
 *   actions: [
 *     { id: 'cancel', label: 'Cancel', variant: 'secondary' },
 *     { id: 'confirm', label: 'Confirm', variant: 'primary' }
 *   ]
 * });
 *
 * // Show a toast notification
 * toast.success('Operation completed!');
 * ```
 *
 * @module @web-clipper/ui
 */

// ============================================================================
// Components
// ============================================================================

/**
 * Button - Versatile, accessible button component
 */
export { Button, createButton, type ButtonProps } from './components/Button';

/**
 * ProgressBar - Linear and phased progress indicators
 */
export {
  ProgressBar,
  createProgressBar,
  type ProgressBarProps,
  type ProgressPhase,
} from './components/ProgressBar';

/**
 * Dialog - Modal dialog with actions
 */
export {
  Dialog,
  createDialog,
  showDialog,
  type DialogProps,
  type DialogAction,
} from './components/Dialog';

/**
 * Overlay - Fullscreen, highlight, and selection overlays
 */
export {
  Overlay,
  type OverlayProps,
  HighlightOverlay,
  type HighlightOverlayProps,
  SelectionOverlay,
  type SelectionOverlayProps,
} from './components/Overlay';

/**
 * FloatingToolbar - Auto-positioning toolbar with keyboard navigation
 */
export {
  FloatingToolbar,
  createFloatingToolbar,
  type FloatingToolbarProps,
  type ToolbarAction,
  type ToolbarSeparator,
  type ToolbarItem,
  type ToolbarActionEvent,
} from './components/FloatingToolbar';

/**
 * Badge - Status and count indicators
 */
export { Badge, createBadge, type BadgeProps } from './components/Badge';

/**
 * Toast - Toast notifications with manager
 */
export {
  Toast,
  type ToastProps,
  ToastManager,
  toastManager,
  toast,
  type ToastManagerConfig,
} from './components/Toast';

/**
 * Spinner - Loading indicators
 */
export { Spinner, createSpinner, type SpinnerProps } from './components/Spinner';

/**
 * ScreenReaderAnnouncer - Accessible announcements for assistive technologies
 */
export {
  ScreenReaderAnnouncer,
  announcer,
  type Announcer,
} from './components/ScreenReaderAnnouncer';

// ============================================================================
// Utilities
// ============================================================================

/**
 * Shadow DOM utilities for creating isolated components
 */
export {
  createIsolatedComponent,
  injectTokens,
  getCombinedStyles,
} from './utils/shadow-dom';

/**
 * Focus trap for modal contexts
 */
export { createFocusTrap, type FocusTrap } from './utils/focus-trap';

/**
 * Positioning utilities for floating elements
 */
export { positionToolbar, type Position } from './utils/position';

/**
 * Keyboard navigation helpers
 */
export { handleArrowNavigation, trapTabKey } from './utils/keyboard';

/**
 * Theme utilities for dark mode and accessibility preferences
 */
export { shouldAnimate, getTheme, watchTheme, type Theme } from './utils/theme';
