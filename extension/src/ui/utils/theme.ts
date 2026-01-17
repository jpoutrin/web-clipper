/**
 * Theme Utilities
 *
 * Utilities for detecting and responding to user theme preferences,
 * including dark mode and reduced motion settings.
 */

/**
 * Theme type
 */
export type Theme = 'light' | 'dark';

/**
 * Checks if animations should be enabled
 *
 * Respects the user's prefers-reduced-motion setting.
 * When reduced motion is preferred, animations should be disabled
 * or significantly reduced.
 *
 * @returns true if animations should be enabled, false if reduced motion is preferred
 *
 * @example
 * ```typescript
 * if (shouldAnimate()) {
 *   element.classList.add('animate-in');
 * } else {
 *   element.classList.add('no-animation');
 * }
 * ```
 */
export function shouldAnimate(): boolean {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Gets the current theme preference
 *
 * Detects whether the user prefers light or dark mode based on
 * the prefers-color-scheme media query.
 *
 * @returns 'light' or 'dark' based on user preference
 *
 * @example
 * ```typescript
 * const theme = getTheme();
 * console.log(`Current theme: ${theme}`);
 * ```
 */
export function getTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Watches for theme changes and calls a callback when the theme changes
 *
 * Listens to the prefers-color-scheme media query and notifies
 * when the user's theme preference changes (e.g., switching between
 * light and dark mode in system settings).
 *
 * @param callback - Function to call when theme changes, receives new theme
 * @returns Cleanup function to stop watching for changes
 *
 * @example
 * ```typescript
 * const stopWatching = watchTheme((newTheme) => {
 *   console.log(`Theme changed to: ${newTheme}`);
 *   applyTheme(newTheme);
 * });
 *
 * // Later, when component unmounts:
 * stopWatching();
 * ```
 */
export function watchTheme(callback: (theme: Theme) => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (event: MediaQueryListEvent): void => {
    callback(event.matches ? 'dark' : 'light');
  };

  // Modern browsers support addEventListener on MediaQueryList
  mediaQuery.addEventListener('change', handler);

  // Return cleanup function
  return () => {
    mediaQuery.removeEventListener('change', handler);
  };
}
