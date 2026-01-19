/**
 * Type declarations for CSS module imports
 *
 * This allows importing .css files as strings in TypeScript
 * for use in Shadow DOM style injection.
 */

declare module '*.css' {
  const content: string;
  export default content;
}
