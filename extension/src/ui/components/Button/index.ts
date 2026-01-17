/**
 * Button Component
 *
 * A versatile, accessible button component with Shadow DOM isolation.
 *
 * @example
 * ```typescript
 * import { Button, createButton } from './components/Button';
 *
 * // Using the class
 * const button = new Button(
 *   { variant: 'primary', size: 'md' },
 *   'Click me'
 * );
 * document.body.appendChild(button.getElement());
 *
 * button.addEventListener('wc-click', () => {
 *   console.log('Button clicked!');
 * });
 *
 * // Using the factory function
 * const simpleButton = createButton(
 *   { variant: 'secondary', size: 'sm', icon: '<svg>...</svg>', iconPosition: 'left' },
 *   'Save'
 * );
 * document.body.appendChild(simpleButton);
 *
 * // Icon-only button
 * const iconButton = createButton({
 *   variant: 'ghost',
 *   size: 'md',
 *   iconOnly: true,
 *   icon: '<svg>...</svg>',
 *   ariaLabel: 'Close dialog'
 * });
 *
 * // Loading state
 * const loadingButton = new Button(
 *   { variant: 'primary', size: 'lg', loading: true },
 *   'Processing...'
 * );
 *
 * // Full width button
 * const fullButton = createButton(
 *   { variant: 'primary', size: 'md', fullWidth: true },
 *   'Submit Form'
 * );
 * ```
 */

export { Button, createButton, type ButtonProps } from './Button';
