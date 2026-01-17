/**
 * Shadow DOM Utilities
 *
 * Utilities for creating isolated components with Shadow DOM,
 * injecting design tokens, and combining styles.
 */

/**
 * Cache for loaded CSS files
 */
const cssCache = new Map<string, string>();

/**
 * Loads CSS content from a file path
 *
 * @param filePath - Path to CSS file (relative to extension root)
 * @returns Promise resolving to CSS content
 */
async function loadCSS(filePath: string): Promise<string> {
  if (cssCache.has(filePath)) {
    return cssCache.get(filePath)!;
  }

  try {
    const url = chrome.runtime.getURL(filePath);
    const response = await fetch(url);
    const css = await response.text();
    cssCache.set(filePath, css);
    return css;
  } catch (error) {
    console.error(`Failed to load CSS from ${filePath}:`, error);
    return '';
  }
}

/**
 * Creates an isolated component with closed Shadow DOM and injected styles
 *
 * @param tagName - HTML tag name for the host element
 * @param styles - Component-specific CSS styles
 * @param template - HTML template string
 * @returns HTMLElement with Shadow DOM attached
 */
export function createIsolatedComponent(
  tagName: string,
  styles: string,
  template: string
): HTMLElement {
  const host = document.createElement(tagName);
  const shadow = host.attachShadow({ mode: 'closed' });

  // Inject combined styles (reset + tokens + component styles)
  const styleEl = document.createElement('style');
  styleEl.textContent = getCombinedStyles(styles);
  shadow.appendChild(styleEl);

  // Inject template
  const container = document.createElement('div');
  container.innerHTML = template;
  shadow.appendChild(container);

  return host;
}

/**
 * Injects design tokens into a Shadow DOM root
 *
 * This ensures that all CSS custom properties (design tokens)
 * are available within the Shadow DOM context.
 *
 * @param shadowRoot - Shadow DOM root to inject tokens into
 */
export async function injectTokens(shadowRoot: ShadowRoot): Promise<void> {
  const colorsCSS = await loadCSS('ui/tokens/colors.css');

  const style = document.createElement('style');
  style.textContent = `
    :host {
      /* Design tokens - colors with light/dark mode support */
      ${colorsCSS}
    }
  `;
  shadowRoot.prepend(style);
}

/**
 * Returns combined CSS (reset + tokens + component styles)
 *
 * This combines the base reset CSS, design tokens, and component-specific
 * styles into a single stylesheet for Shadow DOM injection.
 * Returns inline styles for now - in production, this should load from files.
 *
 * @param componentStyles - Component-specific CSS
 * @returns Combined CSS string
 */
export function getCombinedStyles(componentStyles: string): string {
  // Base CSS reset for Shadow DOM
  const resetCSS = `
    /* CSS Reset for Shadow DOM */
    *, *::before, *::after {
      box-sizing: border-box;
    }
    * {
      margin: 0;
      padding: 0;
    }
    button {
      font: inherit;
      color: inherit;
      background: none;
      border: none;
      cursor: pointer;
    }
    button:disabled {
      cursor: not-allowed;
    }
    img, svg {
      display: block;
      max-width: 100%;
    }
    :focus:not(:focus-visible) {
      outline: none;
    }
    :focus-visible {
      outline: 2px solid var(--wc-primary-500);
      outline-offset: 2px;
    }
    .wc-sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `;

  // Design tokens - color palette
  const tokensCSS = `
    /* Design Tokens */
    :host, :root {
      /* Primary colors */
      --wc-primary-50: #eff6ff;
      --wc-primary-100: #dbeafe;
      --wc-primary-200: #bfdbfe;
      --wc-primary-300: #93c5fd;
      --wc-primary-400: #60a5fa;
      --wc-primary-500: #3b82f6;
      --wc-primary-600: #2563eb;
      --wc-primary-700: #1d4ed8;
      --wc-primary-800: #1e40af;
      --wc-primary-900: #1e3a8a;
      --wc-primary-950: #172554;

      /* Neutral colors */
      --wc-gray-50: #f9fafb;
      --wc-gray-100: #f3f4f6;
      --wc-gray-200: #e5e7eb;
      --wc-gray-300: #d1d5db;
      --wc-gray-400: #9ca3af;
      --wc-gray-500: #6b7280;
      --wc-gray-600: #4b5563;
      --wc-gray-700: #374151;
      --wc-gray-800: #1f2937;
      --wc-gray-900: #111827;
      --wc-gray-950: #030712;

      /* Semantic tokens - light mode */
      --wc-text-primary: var(--wc-gray-900);
      --wc-text-secondary: var(--wc-gray-600);
      --wc-text-tertiary: var(--wc-gray-500);
      --wc-bg-primary: #ffffff;
      --wc-bg-secondary: var(--wc-gray-50);
      --wc-bg-tertiary: var(--wc-gray-100);
      --wc-border-default: var(--wc-gray-300);
      --wc-border-subtle: var(--wc-gray-200);

      /* Spacing */
      --wc-space-1: 4px;
      --wc-space-2: 8px;
      --wc-space-3: 12px;
      --wc-space-4: 16px;
      --wc-space-5: 20px;
      --wc-space-6: 24px;

      /* Border radius */
      --wc-radius-sm: 4px;
      --wc-radius-md: 6px;
      --wc-radius-lg: 8px;
      --wc-radius-full: 9999px;

      /* Shadows */
      --wc-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --wc-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      --wc-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

      /* Transitions */
      --wc-duration-fast: 100ms;
      --wc-duration-normal: 200ms;
      --wc-ease-out: cubic-bezier(0, 0, 0.2, 1);
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      :host, :root {
        --wc-text-primary: var(--wc-gray-50);
        --wc-text-secondary: var(--wc-gray-400);
        --wc-text-tertiary: var(--wc-gray-500);
        --wc-bg-primary: var(--wc-gray-900);
        --wc-bg-secondary: var(--wc-gray-800);
        --wc-bg-tertiary: var(--wc-gray-700);
        --wc-border-default: var(--wc-gray-700);
        --wc-border-subtle: var(--wc-gray-800);
      }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      :host, :root {
        --wc-duration-fast: 0ms;
        --wc-duration-normal: 0ms;
      }
    }
  `;

  return `
    ${resetCSS}
    ${tokensCSS}
    ${componentStyles}
  `;
}
