# TS-0007: Shared UI Component Library

## Metadata

| Field | Value |
|-------|-------|
| Tech Spec ID | TS-0007 |
| Title | Shared UI Component Library |
| Status | DRAFT |
| Author | Claude Code |
| Created | 2026-01-17 |
| Last Updated | 2026-01-17 |
| Related Specs | TS-0003, TS-0004, TS-0005, TS-0006 |

---

## 1. Executive Summary

This tech spec defines a shared UI component library for the Web Clipper Chrome extension. The library provides reusable, accessible, and themeable components used across all capture modes (article, screenshot, area selection, full-page). Components are designed for Shadow DOM isolation, WCAG 2.1 AA compliance, and support both light and dark themes.

### Goals

- **Consistency**: Unified visual language across all features
- **Reusability**: Build once, use everywhere
- **Accessibility**: WCAG 2.1 AA compliance by default
- **Performance**: Minimal footprint, lazy-loadable
- **Maintainability**: Single source of truth for UI patterns

### Non-Goals

- Server-side rendering support
- Framework-specific bindings (React, Vue, etc.)
- Animation library (uses CSS only)

---

## 2. Design Tokens

Design tokens are the foundation of the component library. All components reference these tokens for consistent theming.

### 2.1 Color Tokens

```css
:host, :root {
  /* Primary - Actions, links, focus states */
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

  /* Success - Confirmations, completed states */
  --wc-success-50: #f0fdf4;
  --wc-success-100: #dcfce7;
  --wc-success-500: #22c55e;
  --wc-success-600: #16a34a;
  --wc-success-700: #15803d;

  /* Warning - Cautions, pending states */
  --wc-warning-50: #fffbeb;
  --wc-warning-100: #fef3c7;
  --wc-warning-500: #f59e0b;
  --wc-warning-600: #d97706;
  --wc-warning-700: #b45309;

  /* Error - Errors, destructive actions */
  --wc-error-50: #fef2f2;
  --wc-error-100: #fee2e2;
  --wc-error-500: #ef4444;
  --wc-error-600: #dc2626;
  --wc-error-700: #b91c1c;

  /* Neutral - Text, backgrounds, borders */
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

  /* Semantic aliases */
  --wc-text-primary: var(--wc-gray-900);
  --wc-text-secondary: var(--wc-gray-600);
  --wc-text-tertiary: var(--wc-gray-500);
  --wc-text-inverse: #ffffff;
  --wc-bg-primary: #ffffff;
  --wc-bg-secondary: var(--wc-gray-50);
  --wc-bg-tertiary: var(--wc-gray-100);
  --wc-border-default: var(--wc-gray-300);
  --wc-border-subtle: var(--wc-gray-200);
}

/* Dark mode overrides */
@media (prefers-color-scheme: dark) {
  :host, :root {
    --wc-text-primary: var(--wc-gray-100);
    --wc-text-secondary: var(--wc-gray-400);
    --wc-text-tertiary: var(--wc-gray-500);
    --wc-text-inverse: var(--wc-gray-900);
    --wc-bg-primary: var(--wc-gray-900);
    --wc-bg-secondary: var(--wc-gray-800);
    --wc-bg-tertiary: var(--wc-gray-700);
    --wc-border-default: var(--wc-gray-600);
    --wc-border-subtle: var(--wc-gray-700);
  }
}
```

### 2.2 Typography Tokens

```css
:host, :root {
  /* Font families */
  --wc-font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --wc-font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;

  /* Font sizes */
  --wc-text-xs: 11px;
  --wc-text-sm: 12px;
  --wc-text-base: 14px;
  --wc-text-lg: 16px;
  --wc-text-xl: 18px;
  --wc-text-2xl: 20px;

  /* Line heights */
  --wc-leading-tight: 1.25;
  --wc-leading-normal: 1.5;
  --wc-leading-relaxed: 1.625;

  /* Font weights */
  --wc-font-normal: 400;
  --wc-font-medium: 500;
  --wc-font-semibold: 600;
  --wc-font-bold: 700;
}
```

### 2.3 Spacing Tokens

```css
:host, :root {
  --wc-space-0: 0;
  --wc-space-1: 4px;
  --wc-space-2: 8px;
  --wc-space-3: 12px;
  --wc-space-4: 16px;
  --wc-space-5: 20px;
  --wc-space-6: 24px;
  --wc-space-8: 32px;
  --wc-space-10: 40px;
  --wc-space-12: 48px;
}
```

### 2.4 Border Radius Tokens

```css
:host, :root {
  --wc-radius-none: 0;
  --wc-radius-sm: 4px;
  --wc-radius-md: 6px;
  --wc-radius-lg: 8px;
  --wc-radius-xl: 12px;
  --wc-radius-2xl: 16px;
  --wc-radius-full: 9999px;
}
```

### 2.5 Shadow Tokens

```css
:host, :root {
  --wc-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --wc-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  --wc-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  --wc-shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  --wc-shadow-overlay: 0 8px 24px rgba(0, 0, 0, 0.2);
}

@media (prefers-color-scheme: dark) {
  :host, :root {
    --wc-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
    --wc-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3);
    --wc-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
    --wc-shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
    --wc-shadow-overlay: 0 8px 24px rgba(0, 0, 0, 0.5);
  }
}
```

### 2.6 Animation Tokens

```css
:host, :root {
  /* Durations */
  --wc-duration-fast: 100ms;
  --wc-duration-normal: 200ms;
  --wc-duration-slow: 300ms;

  /* Easings */
  --wc-ease-in: cubic-bezier(0.4, 0, 1, 1);
  --wc-ease-out: cubic-bezier(0, 0, 0.2, 1);
  --wc-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  :host, :root {
    --wc-duration-fast: 0ms;
    --wc-duration-normal: 0ms;
    --wc-duration-slow: 0ms;
  }
}
```

### 2.7 Z-Index Scale

```css
:host, :root {
  --wc-z-base: 0;
  --wc-z-dropdown: 1000;
  --wc-z-sticky: 1100;
  --wc-z-overlay: 1200;
  --wc-z-modal: 1300;
  --wc-z-popover: 1400;
  --wc-z-tooltip: 1500;
  --wc-z-toast: 1600;
  --wc-z-max: 2147483647;  /* For content script overlays */
}
```

---

## 3. Component Specifications

### 3.1 Button Component

**Used in**: TS-0003, TS-0004, TS-0005, TS-0006

#### Interface

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  iconOnly?: boolean;
  icon?: string;       // SVG string (not icon name)
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  ariaLabel?: string;  // Required for iconOnly
}

// Factory function
function createButton(props: ButtonProps, content?: string): HTMLElement;
```

#### Variants

| Variant | Use Case | Background | Text |
|---------|----------|------------|------|
| `primary` | Main actions (Clip, Capture, Confirm) | `--wc-primary-500` | white |
| `secondary` | Secondary actions (Cancel, Settings) | transparent | `--wc-text-primary` |
| `ghost` | Toolbar icons, subtle actions | transparent | `--wc-text-secondary` |
| `danger` | Destructive actions (Delete, Cancel capture) | `--wc-error-500` | white |

#### Sizes

| Size | Height | Padding | Font Size | Icon Size |
|------|--------|---------|-----------|-----------|
| `sm` | 28px | 8px 12px | 12px | 14px |
| `md` | 36px | 10px 16px | 14px | 16px |
| `lg` | 44px | 12px 20px | 16px | 20px |

#### CSS

```css
.wc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--wc-space-2);
  font-family: var(--wc-font-sans);
  font-weight: var(--wc-font-medium);
  border-radius: var(--wc-radius-lg);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--wc-duration-fast) var(--wc-ease-out);
  white-space: nowrap;
  user-select: none;
}

.wc-btn:focus-visible {
  outline: 2px solid var(--wc-primary-500);
  outline-offset: 2px;
}

.wc-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Primary */
.wc-btn--primary {
  background: var(--wc-primary-500);
  color: white;
}
.wc-btn--primary:hover:not(:disabled) {
  background: var(--wc-primary-600);
}
.wc-btn--primary:active:not(:disabled) {
  background: var(--wc-primary-700);
}

/* Secondary */
.wc-btn--secondary {
  background: transparent;
  color: var(--wc-text-primary);
  border-color: var(--wc-border-default);
}
.wc-btn--secondary:hover:not(:disabled) {
  background: var(--wc-bg-tertiary);
}

/* Ghost */
.wc-btn--ghost {
  background: transparent;
  color: var(--wc-text-secondary);
}
.wc-btn--ghost:hover:not(:disabled) {
  background: var(--wc-bg-tertiary);
  color: var(--wc-text-primary);
}

/* Danger */
.wc-btn--danger {
  background: var(--wc-error-500);
  color: white;
}
.wc-btn--danger:hover:not(:disabled) {
  background: var(--wc-error-600);
}

/* Sizes */
.wc-btn--sm {
  height: 28px;
  padding: 0 var(--wc-space-3);
  font-size: var(--wc-text-sm);
}
.wc-btn--md {
  height: 36px;
  padding: 0 var(--wc-space-4);
  font-size: var(--wc-text-base);
}
.wc-btn--lg {
  height: 44px;
  padding: 0 var(--wc-space-5);
  font-size: var(--wc-text-lg);
}

/* Icon only */
.wc-btn--icon-only {
  padding: 0;
  aspect-ratio: 1;
}
.wc-btn--icon-only.wc-btn--sm { width: 28px; }
.wc-btn--icon-only.wc-btn--md { width: 36px; }
.wc-btn--icon-only.wc-btn--lg { width: 44px; }

/* Full width */
.wc-btn--full { width: 100%; }

/* Loading state */
.wc-btn--loading {
  position: relative;
  color: transparent;
}
.wc-btn--loading::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: var(--wc-radius-full);
  animation: wc-spin 0.6s linear infinite;
}
@keyframes wc-spin {
  to { transform: rotate(360deg); }
}
```

#### Accessibility

- `role="button"` when not using `<button>` element
- `aria-disabled="true"` when disabled
- `aria-label` required for icon-only buttons
- `aria-busy="true"` during loading state
- Focus visible outline (2px solid primary)
- Minimum touch target: 44x44px for mobile

---

### 3.2 Progress Bar Component

**Used in**: TS-0004, TS-0006

#### Interface

```typescript
interface ProgressBarProps {
  value: number;           // 0-100
  max?: number;            // Default 100
  variant: 'linear' | 'phased';
  phases?: ProgressPhase[];
  showLabel?: boolean;
  showPercentage?: boolean;
  size: 'sm' | 'md' | 'lg';
  animated?: boolean;
  ariaLabel: string;
}

interface ProgressPhase {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}
```

#### Variants

| Variant | Use Case | Description |
|---------|----------|-------------|
| `linear` | Simple progress (upload, download) | Single bar with fill |
| `phased` | Multi-step operations (capture, processing) | Segmented with phase labels |

#### Sizes

| Size | Height | Font Size |
|------|--------|-----------|
| `sm` | 4px | 11px |
| `md` | 8px | 12px |
| `lg` | 12px | 14px |

#### CSS

```css
/* Container */
.wc-progress {
  display: flex;
  flex-direction: column;
  gap: var(--wc-space-2);
  width: 100%;
}

/* Track */
.wc-progress__track {
  position: relative;
  background: var(--wc-gray-200);
  border-radius: var(--wc-radius-full);
  overflow: hidden;
}
.wc-progress__track--sm { height: 4px; }
.wc-progress__track--md { height: 8px; }
.wc-progress__track--lg { height: 12px; }

/* Fill */
.wc-progress__fill {
  height: 100%;
  background: var(--wc-primary-500);
  border-radius: inherit;
  transition: width var(--wc-duration-normal) var(--wc-ease-out);
}

/* Animated shimmer */
.wc-progress__fill--animated {
  background: linear-gradient(
    90deg,
    var(--wc-primary-500) 0%,
    var(--wc-primary-400) 50%,
    var(--wc-primary-500) 100%
  );
  background-size: 200% 100%;
  animation: wc-shimmer 1.5s ease-in-out infinite;
}
@keyframes wc-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Label container */
.wc-progress__labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.wc-progress__label {
  font-family: var(--wc-font-sans);
  font-size: var(--wc-text-sm);
  color: var(--wc-text-secondary);
}

.wc-progress__percentage {
  font-family: var(--wc-font-mono);
  font-size: var(--wc-text-sm);
  font-weight: var(--wc-font-medium);
  color: var(--wc-text-primary);
}

/* Phased variant */
.wc-progress-phased {
  display: flex;
  flex-direction: column;
  gap: var(--wc-space-3);
}

.wc-progress-phased__phases {
  display: flex;
  gap: var(--wc-space-1);
}

.wc-progress-phased__segment {
  flex: 1;
  height: 4px;
  background: var(--wc-gray-200);
  border-radius: var(--wc-radius-full);
  transition: background var(--wc-duration-fast);
}

.wc-progress-phased__segment--active {
  background: var(--wc-primary-500);
}
.wc-progress-phased__segment--completed {
  background: var(--wc-success-500);
}
.wc-progress-phased__segment--error {
  background: var(--wc-error-500);
}

.wc-progress-phased__labels {
  display: flex;
  justify-content: space-between;
}

.wc-progress-phased__phase-label {
  font-size: var(--wc-text-xs);
  color: var(--wc-text-tertiary);
  text-align: center;
  flex: 1;
}
.wc-progress-phased__phase-label--active {
  color: var(--wc-primary-600);
  font-weight: var(--wc-font-medium);
}
.wc-progress-phased__phase-label--completed {
  color: var(--wc-success-600);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .wc-progress__track,
  .wc-progress-phased__segment {
    background: var(--wc-gray-700);
  }
}
```

#### Accessibility

- `role="progressbar"`
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- `aria-label` describing the operation
- `aria-live="polite"` for value updates
- Phase changes announced via live region

---

### 3.3 Dialog Component

**Used in**: TS-0006

#### Interface

```typescript
interface DialogProps {
  variant?: 'default' | 'warning' | 'error' | 'success';  // Defaults to 'default'
  title: string;
  description?: string;
  icon?: string;  // SVG string
  primaryAction?: DialogAction;
  secondaryAction?: DialogAction;
  dismissible?: boolean;
  onClose?: () => void;
}

// Factory functions
function createDialog(props: DialogProps): HTMLElement;
function showDialog(props: DialogProps): Promise<boolean>;

interface DialogAction {
  label: string;
  variant: 'primary' | 'secondary' | 'danger';
  onClick: () => void;
}
```

#### Variants

| Variant | Icon Color | Use Case |
|---------|------------|----------|
| `default` | `--wc-primary-500` | Information, confirmations |
| `warning` | `--wc-warning-500` | Cautions, proceed with care |
| `error` | `--wc-error-500` | Errors, failures |
| `success` | `--wc-success-500` | Completions, success messages |

#### CSS

```css
/* Backdrop */
.wc-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--wc-z-modal);
  animation: wc-fade-in var(--wc-duration-fast) var(--wc-ease-out);
}
@keyframes wc-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Dialog */
.wc-dialog {
  background: var(--wc-bg-primary);
  border-radius: var(--wc-radius-xl);
  box-shadow: var(--wc-shadow-xl);
  max-width: 400px;
  width: calc(100% - 32px);
  animation: wc-scale-in var(--wc-duration-normal) var(--wc-ease-out);
}
@keyframes wc-scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Header */
.wc-dialog__header {
  display: flex;
  align-items: flex-start;
  gap: var(--wc-space-3);
  padding: var(--wc-space-4);
}

.wc-dialog__icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: var(--wc-radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}
.wc-dialog__icon--warning {
  background: var(--wc-warning-100);
  color: var(--wc-warning-600);
}
.wc-dialog__icon--error {
  background: var(--wc-error-100);
  color: var(--wc-error-600);
}
.wc-dialog__icon--success {
  background: var(--wc-success-100);
  color: var(--wc-success-600);
}
.wc-dialog__icon--default {
  background: var(--wc-primary-100);
  color: var(--wc-primary-600);
}

.wc-dialog__content {
  flex: 1;
}

.wc-dialog__title {
  font-size: var(--wc-text-lg);
  font-weight: var(--wc-font-semibold);
  color: var(--wc-text-primary);
  margin: 0 0 var(--wc-space-1) 0;
}

.wc-dialog__description {
  font-size: var(--wc-text-base);
  color: var(--wc-text-secondary);
  line-height: var(--wc-leading-normal);
  margin: 0;
}

/* Close button */
.wc-dialog__close {
  position: absolute;
  top: var(--wc-space-3);
  right: var(--wc-space-3);
}

/* Actions */
.wc-dialog__actions {
  display: flex;
  gap: var(--wc-space-3);
  padding: var(--wc-space-4);
  padding-top: 0;
  justify-content: flex-end;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .wc-dialog-backdrop {
    background: rgba(0, 0, 0, 0.7);
  }
  .wc-dialog__icon--warning { background: rgba(245, 158, 11, 0.2); }
  .wc-dialog__icon--error { background: rgba(239, 68, 68, 0.2); }
  .wc-dialog__icon--success { background: rgba(34, 197, 94, 0.2); }
  .wc-dialog__icon--default { background: rgba(59, 130, 246, 0.2); }
}
```

#### Accessibility

- `role="dialog"` or `role="alertdialog"` (for warnings/errors)
- `aria-modal="true"`
- `aria-labelledby` pointing to title
- `aria-describedby` pointing to description
- Focus trapped within dialog
- Escape key closes (when dismissible)
- Focus returned to trigger element on close

---

### 3.4 Overlay Component

**Used in**: TS-0003, TS-0004, TS-0005

#### Interface

```typescript
interface OverlayProps {
  variant: 'fullscreen' | 'highlight' | 'selection';
  zIndex?: number;
  onEscape?: () => void;
  children?: HTMLElement;
  className?: string;
}

// SelectionOverlay extends Overlay with canvas-based selection
interface SelectionOverlayProps extends Omit<OverlayProps, 'variant' | 'children'> {
  selection: DOMRect | null;
  dimOpacity?: number;                                    // Default: 0.5
  onSelectionChange?: (selection: DOMRect | null) => void;
  onSelectionComplete?: (selection: DOMRect) => void;
  minSize?: number;                                       // Default: 10px
}
```

> **Note**: The previous `HighlightOverlayProps` interface has been removed. Use the base
> `Overlay` with `variant: 'highlight'` and CSS-based highlighting instead.

#### Variants

| Variant | Use Case | Description |
|---------|----------|-------------|
| `fullscreen` | Capture mode active | Covers entire viewport |
| `highlight` | Embed detection | Highlights specific element |
| `selection` | Area capture | Dimmed with selection cutout |

#### CSS

```css
/* Base overlay - injected into Shadow DOM */
.wc-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--wc-z-max);
  pointer-events: none;
}

.wc-overlay--interactive {
  pointer-events: auto;
}

/* Fullscreen dim */
.wc-overlay--fullscreen {
  background: rgba(0, 0, 0, 0.3);
}

/* Highlight overlay (for embed detection) */
.wc-overlay-highlight {
  position: absolute;
  border: 2px solid var(--wc-primary-500);
  border-radius: var(--wc-radius-md);
  background: rgba(59, 130, 246, 0.1);
  pointer-events: none;
  animation: wc-pulse-border 2s ease-in-out infinite;
}
@keyframes wc-pulse-border {
  0%, 100% { border-color: var(--wc-primary-500); }
  50% { border-color: var(--wc-primary-300); }
}

/* Selection overlay (canvas-based in TypeScript) */
.wc-overlay-selection {
  position: fixed;
  inset: 0;
  cursor: crosshair;
}

.wc-overlay-selection__canvas {
  width: 100%;
  height: 100%;
}

/* Selection rectangle styles (drawn on canvas) */
/* Colors defined in TypeScript:
   - Dim: rgba(0, 0, 0, 0.5)
   - Selection border: #3b82f6
   - Selection fill: transparent
   - Handle fill: #ffffff
   - Handle border: #3b82f6
*/
```

#### TypeScript Implementation

```typescript
class SelectionOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private selection: DOMRect | null = null;
  private dimColor = 'rgba(0, 0, 0, 0.5)';
  private selectionColor = '#3b82f6';
  private handleSize = 8;

  constructor(container: ShadowRoot) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'wc-overlay-selection__canvas';
    this.ctx = this.canvas.getContext('2d')!;
    container.appendChild(this.canvas);
    this.resize();
  }

  setSelection(rect: DOMRect | null) {
    this.selection = rect;
    this.render();
  }

  private render() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Draw dimmed background
    this.ctx.fillStyle = this.dimColor;
    this.ctx.fillRect(0, 0, width, height);

    if (this.selection) {
      const { x, y, width: w, height: h } = this.selection;

      // Cut out selection area
      this.ctx.clearRect(x, y, w, h);

      // Draw selection border
      this.ctx.strokeStyle = this.selectionColor;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, w, h);

      // Draw corner handles
      this.drawHandles(x, y, w, h);
    }
  }

  private drawHandles(x: number, y: number, w: number, h: number) {
    const positions = [
      [x, y],                    // top-left
      [x + w, y],                // top-right
      [x, y + h],                // bottom-left
      [x + w, y + h],            // bottom-right
      [x + w / 2, y],            // top-center
      [x + w / 2, y + h],        // bottom-center
      [x, y + h / 2],            // left-center
      [x + w, y + h / 2],        // right-center
    ];

    positions.forEach(([hx, hy]) => {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(
        hx - this.handleSize / 2,
        hy - this.handleSize / 2,
        this.handleSize,
        this.handleSize
      );
      this.ctx.strokeStyle = this.selectionColor;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(
        hx - this.handleSize / 2,
        hy - this.handleSize / 2,
        this.handleSize,
        this.handleSize
      );
    });
  }
}
```

#### Accessibility

- Escape key to dismiss
- `aria-hidden="true"` on decorative elements
- Announce overlay activation via live region
- Restore focus on dismiss

---

### 3.5 Floating Toolbar Component

**Used in**: TS-0005

#### Interface

```typescript
interface FloatingToolbarProps {
  position?: 'top' | 'bottom' | 'auto';  // Default: 'auto'
  anchor: DOMRect;                        // Element to position relative to
  viewportPadding?: number;               // Min distance from viewport edge (default: 8)
  actions: ToolbarItem[];                 // Actions and separators
  ariaLabel?: string;                     // Accessible label for the toolbar
}

type ToolbarItem = ToolbarAction | ToolbarSeparator;

interface ToolbarSeparator {
  type: 'separator';
}

// Factory function
function createFloatingToolbar(props: FloatingToolbarProps): HTMLElement;

interface ToolbarAction {
  id: string;
  icon: string;      // SVG string
  label: string;     // Used for tooltip and aria-label
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
  onClick: () => void;
}
```

#### CSS

```css
.wc-toolbar {
  position: fixed;
  display: flex;
  align-items: center;
  gap: var(--wc-space-1);
  padding: var(--wc-space-1);
  background: var(--wc-bg-primary);
  border: 1px solid var(--wc-border-subtle);
  border-radius: var(--wc-radius-lg);
  box-shadow: var(--wc-shadow-lg);
  z-index: var(--wc-z-popover);
}

/* Positioning arrow */
.wc-toolbar::before {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--wc-bg-primary);
  border: 1px solid var(--wc-border-subtle);
  border-right: none;
  border-bottom: none;
  transform: rotate(45deg);
}

.wc-toolbar--top::before {
  bottom: -5px;
  left: 50%;
  margin-left: -4px;
  transform: rotate(-135deg);
}

.wc-toolbar--bottom::before {
  top: -5px;
  left: 50%;
  margin-left: -4px;
  transform: rotate(45deg);
}

/* Actions */
.wc-toolbar__action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: var(--wc-radius-md);
  color: var(--wc-text-secondary);
  cursor: pointer;
  transition: all var(--wc-duration-fast);
}

.wc-toolbar__action:hover {
  background: var(--wc-bg-tertiary);
  color: var(--wc-text-primary);
}

.wc-toolbar__action--primary {
  background: var(--wc-primary-500);
  color: white;
}
.wc-toolbar__action--primary:hover {
  background: var(--wc-primary-600);
}

.wc-toolbar__action--danger:hover {
  background: var(--wc-error-50);
  color: var(--wc-error-600);
}

.wc-toolbar__action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Separator */
.wc-toolbar__separator {
  width: 1px;
  height: 20px;
  background: var(--wc-border-subtle);
  margin: 0 var(--wc-space-1);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .wc-toolbar::before {
    background: var(--wc-bg-primary);
    border-color: var(--wc-border-subtle);
  }
}
```

#### Positioning Logic

```typescript
function positionToolbar(
  toolbar: HTMLElement,
  anchor: DOMRect,
  viewportPadding = 8
): { top: number; left: number; position: 'top' | 'bottom' } {
  const toolbarRect = toolbar.getBoundingClientRect();
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  // Calculate horizontal center
  let left = anchor.left + (anchor.width - toolbarRect.width) / 2;

  // Clamp to viewport
  left = Math.max(viewportPadding, left);
  left = Math.min(viewport.width - toolbarRect.width - viewportPadding, left);

  // Determine vertical position
  const spaceAbove = anchor.top;
  const spaceBelow = viewport.height - anchor.bottom;
  const toolbarHeight = toolbarRect.height + 12; // Include arrow

  let position: 'top' | 'bottom' = 'bottom';
  let top: number;

  if (spaceBelow >= toolbarHeight) {
    position = 'bottom';
    top = anchor.bottom + 12;
  } else if (spaceAbove >= toolbarHeight) {
    position = 'top';
    top = anchor.top - toolbarHeight;
  } else {
    // Not enough space, prefer bottom
    position = 'bottom';
    top = anchor.bottom + 12;
  }

  return { top, left, position };
}
```

#### Accessibility

- `role="toolbar"`
- `aria-label` describing toolbar purpose
- Arrow key navigation between actions
- `aria-disabled` for disabled actions
- Tooltips on hover/focus for icon-only buttons

---

### 3.6 Badge Component

**Used in**: TS-0004

#### Interface

```typescript
interface BadgeProps {
  variant: 'default' | 'success' | 'warning' | 'error' | 'info';
  size: 'sm' | 'md';
  icon?: string;      // SVG string
  label: string;
  removable?: boolean;
  onRemove?: () => void;
}

// Factory function
function createBadge(props: BadgeProps): HTMLElement;
```

#### CSS

```css
.wc-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--wc-space-1);
  font-family: var(--wc-font-sans);
  font-weight: var(--wc-font-medium);
  border-radius: var(--wc-radius-full);
  white-space: nowrap;
}

/* Sizes */
.wc-badge--sm {
  padding: 2px 8px;
  font-size: var(--wc-text-xs);
}
.wc-badge--md {
  padding: 4px 12px;
  font-size: var(--wc-text-sm);
}

/* Variants */
.wc-badge--default {
  background: var(--wc-gray-100);
  color: var(--wc-gray-700);
}
.wc-badge--success {
  background: var(--wc-success-100);
  color: var(--wc-success-700);
}
.wc-badge--warning {
  background: var(--wc-warning-100);
  color: var(--wc-warning-700);
}
.wc-badge--error {
  background: var(--wc-error-100);
  color: var(--wc-error-700);
}
.wc-badge--info {
  background: var(--wc-primary-100);
  color: var(--wc-primary-700);
}

/* Icon */
.wc-badge__icon {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
}

/* Remove button */
.wc-badge__remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  margin-left: var(--wc-space-1);
  margin-right: -4px;
  border: none;
  background: transparent;
  border-radius: var(--wc-radius-full);
  cursor: pointer;
  opacity: 0.6;
  transition: opacity var(--wc-duration-fast);
}
.wc-badge__remove:hover {
  opacity: 1;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .wc-badge--default {
    background: var(--wc-gray-800);
    color: var(--wc-gray-300);
  }
  .wc-badge--success {
    background: rgba(34, 197, 94, 0.2);
    color: var(--wc-success-400);
  }
  .wc-badge--warning {
    background: rgba(245, 158, 11, 0.2);
    color: var(--wc-warning-400);
  }
  .wc-badge--error {
    background: rgba(239, 68, 68, 0.2);
    color: var(--wc-error-400);
  }
  .wc-badge--info {
    background: rgba(59, 130, 246, 0.2);
    color: var(--wc-primary-400);
  }
}
```

---

### 3.7 Toast/Notification Component

**Used in**: TS-0003, TS-0004, TS-0005, TS-0006

#### Interface

```typescript
interface ToastProps {
  variant: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;      // ms, 0 for persistent (default: 5000)
  dismissible?: boolean;  // Whether toast can be manually dismissed (default: true)
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void; // Callback when toast is dismissed
}

// Toast class for individual toasts
class Toast {
  readonly id: string;
  dismiss(): void;
  mount(container: HTMLElement): void;
  getElement(): HTMLDivElement;
}

// ToastManager for managing multiple toasts
interface ToastManager {
  show(props: ToastProps): string;  // Returns toast ID
  dismiss(id: string): void;
  dismissAll(): void;
}
```

#### CSS

```css
/* Toast container */
.wc-toast-container {
  position: fixed;
  bottom: var(--wc-space-4);
  right: var(--wc-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--wc-space-2);
  z-index: var(--wc-z-toast);
  pointer-events: none;
}

/* Toast */
.wc-toast {
  display: flex;
  align-items: flex-start;
  gap: var(--wc-space-3);
  padding: var(--wc-space-3) var(--wc-space-4);
  background: var(--wc-bg-primary);
  border: 1px solid var(--wc-border-subtle);
  border-radius: var(--wc-radius-lg);
  box-shadow: var(--wc-shadow-lg);
  max-width: 360px;
  pointer-events: auto;
  animation: wc-toast-in var(--wc-duration-normal) var(--wc-ease-out);
}
@keyframes wc-toast-in {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.wc-toast--exiting {
  animation: wc-toast-out var(--wc-duration-fast) var(--wc-ease-in) forwards;
}
@keyframes wc-toast-out {
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}

/* Icon */
.wc-toast__icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}
.wc-toast--success .wc-toast__icon { color: var(--wc-success-500); }
.wc-toast--error .wc-toast__icon { color: var(--wc-error-500); }
.wc-toast--warning .wc-toast__icon { color: var(--wc-warning-500); }
.wc-toast--info .wc-toast__icon { color: var(--wc-primary-500); }

/* Content */
.wc-toast__content {
  flex: 1;
  min-width: 0;
}

.wc-toast__title {
  font-size: var(--wc-text-sm);
  font-weight: var(--wc-font-medium);
  color: var(--wc-text-primary);
  margin: 0;
}

.wc-toast__description {
  font-size: var(--wc-text-sm);
  color: var(--wc-text-secondary);
  margin: var(--wc-space-1) 0 0 0;
}

/* Actions */
.wc-toast__actions {
  display: flex;
  gap: var(--wc-space-2);
  margin-top: var(--wc-space-2);
}

.wc-toast__action {
  font-size: var(--wc-text-sm);
  font-weight: var(--wc-font-medium);
  color: var(--wc-primary-600);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}
.wc-toast__action:hover {
  text-decoration: underline;
}

/* Dismiss */
.wc-toast__dismiss {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--wc-text-tertiary);
  cursor: pointer;
  border-radius: var(--wc-radius-sm);
}
.wc-toast__dismiss:hover {
  background: var(--wc-bg-tertiary);
  color: var(--wc-text-secondary);
}

/* Progress bar (for timed toasts) */
.wc-toast__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--wc-gray-200);
  border-radius: 0 0 var(--wc-radius-lg) var(--wc-radius-lg);
  overflow: hidden;
}
.wc-toast__progress-bar {
  height: 100%;
  background: currentColor;
  transition: width linear;
}
```

#### Accessibility

- `role="alert"` for error/warning, `role="status"` for success/info
- `aria-live="polite"` or `aria-live="assertive"`
- Dismiss button with `aria-label`
- Auto-dismiss pauses on hover/focus

---

### 3.8 Spinner Component

**Used in**: TS-0003, TS-0005

#### Interface

```typescript
interface SpinnerProps {
  size: 'sm' | 'md' | 'lg';
  color?: string;  // CSS color, defaults to currentColor (inherits)
  label?: string;  // Accessible label for screen readers
}

// Factory function
function createSpinner(props: SpinnerProps): HTMLElement;
```

#### CSS

```css
.wc-spinner {
  display: inline-block;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: var(--wc-radius-full);
  animation: wc-spin 0.6s linear infinite;
}

.wc-spinner--sm {
  width: 16px;
  height: 16px;
}
.wc-spinner--md {
  width: 24px;
  height: 24px;
}
.wc-spinner--lg {
  width: 32px;
  height: 32px;
  border-width: 3px;
}

@keyframes wc-spin {
  to { transform: rotate(360deg); }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .wc-spinner {
    animation: none;
    border-color: currentColor;
    border-right-color: currentColor;
    opacity: 0.5;
  }
}
```

#### Accessibility

- `role="status"`
- `aria-label` describing what's loading
- Hidden from screen readers when decorative

---

### 3.9 Screen Reader Announcer

**Used in**: All specs

#### Interface

```typescript
interface Announcer {
  announce(message: string, priority?: 'polite' | 'assertive'): void;
  clear(): void;
}
```

#### Implementation

```typescript
class ScreenReaderAnnouncer implements Announcer {
  private politeRegion: HTMLElement;
  private assertiveRegion: HTMLElement;

  constructor(container: ShadowRoot | HTMLElement) {
    this.politeRegion = this.createRegion('polite');
    this.assertiveRegion = this.createRegion('assertive');
    container.appendChild(this.politeRegion);
    container.appendChild(this.assertiveRegion);
  }

  private createRegion(politeness: 'polite' | 'assertive'): HTMLElement {
    const region = document.createElement('div');
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'wc-sr-only';
    return region;
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const region = priority === 'assertive'
      ? this.assertiveRegion
      : this.politeRegion;

    // Clear and re-announce to trigger screen reader
    region.textContent = '';
    requestAnimationFrame(() => {
      region.textContent = message;
    });
  }

  clear(): void {
    this.politeRegion.textContent = '';
    this.assertiveRegion.textContent = '';
  }
}
```

#### CSS

```css
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
```

---

## 4. Component Usage Matrix

| Component | TS-0003 | TS-0004 | TS-0005 | TS-0006 | Popup |
|-----------|---------|---------|---------|---------|-------|
| Button | ✅ | ✅ | ✅ | ✅ | ✅ |
| Progress Bar | | ✅ | | ✅ | |
| Dialog | | | | ✅ | |
| Overlay | ✅ | ✅ | ✅ | | |
| Floating Toolbar | | | ✅ | | |
| Badge | | ✅ | | | |
| Toast | ✅ | ✅ | ✅ | ✅ | ✅ |
| Spinner | ✅ | | ✅ | | ✅ |
| SR Announcer | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 5. File Structure

```
extension/src/
├── ui/
│   ├── tokens/
│   │   ├── colors.css
│   │   ├── typography.css
│   │   ├── spacing.css
│   │   ├── shadows.css
│   │   ├── animations.css
│   │   └── index.css          # Combines all tokens
│   │
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.ts
│   │   │   ├── Button.css
│   │   │   └── index.ts
│   │   ├── ProgressBar/
│   │   │   ├── ProgressBar.ts
│   │   │   ├── ProgressBar.css
│   │   │   └── index.ts
│   │   ├── Dialog/
│   │   │   ├── Dialog.ts
│   │   │   ├── Dialog.css
│   │   │   └── index.ts
│   │   ├── Overlay/
│   │   │   ├── Overlay.ts
│   │   │   ├── SelectionOverlay.ts
│   │   │   ├── HighlightOverlay.ts
│   │   │   ├── Overlay.css
│   │   │   └── index.ts
│   │   ├── FloatingToolbar/
│   │   │   ├── FloatingToolbar.ts
│   │   │   ├── FloatingToolbar.css
│   │   │   └── index.ts
│   │   ├── Badge/
│   │   │   ├── Badge.ts
│   │   │   ├── Badge.css
│   │   │   └── index.ts
│   │   ├── Toast/
│   │   │   ├── Toast.ts
│   │   │   ├── ToastManager.ts
│   │   │   ├── Toast.css
│   │   │   └── index.ts
│   │   ├── Spinner/
│   │   │   ├── Spinner.ts
│   │   │   ├── Spinner.css
│   │   │   └── index.ts
│   │   └── ScreenReaderAnnouncer/
│   │       ├── ScreenReaderAnnouncer.ts
│   │       └── index.ts
│   │
│   ├── utils/
│   │   ├── focus-trap.ts
│   │   ├── position.ts
│   │   ├── keyboard.ts
│   │   └── shadow-dom.ts
│   │
│   └── index.ts               # Public exports
│
└── ...
```

---

## 6. Implementation Guidelines

### 6.1 Shadow DOM Integration

All components injected into page content MUST use Shadow DOM for style isolation:

```typescript
function createIsolatedComponent(
  tagName: string,
  styles: string,
  template: string
): HTMLElement {
  const host = document.createElement(tagName);
  const shadow = host.attachShadow({ mode: 'closed' });

  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  shadow.appendChild(styleEl);

  const container = document.createElement('div');
  container.innerHTML = template;
  shadow.appendChild(container);

  return host;
}
```

### 6.2 CSS Custom Properties Inheritance

For theming to work across Shadow DOM boundaries:

```typescript
function injectTokens(shadowRoot: ShadowRoot): void {
  const style = document.createElement('style');
  style.textContent = `
    :host {
      /* Import all design tokens */
      ${designTokensCSS}
    }
  `;
  shadowRoot.prepend(style);
}
```

### 6.3 Event Handling

Components should emit custom events for parent communication:

```typescript
class Button {
  private emit(name: string, detail?: unknown): void {
    this.element.dispatchEvent(
      new CustomEvent(`wc-${name}`, {
        bubbles: true,
        composed: true,  // Crosses Shadow DOM boundary
        detail,
      })
    );
  }
}
```

### 6.4 Reduced Motion Support

All animations must respect user preferences:

```typescript
function shouldAnimate(): boolean {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
```

### 6.5 Dark Mode Support

Components automatically adapt via CSS media queries. For JavaScript-based theming:

```typescript
function getTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function watchTheme(callback: (theme: 'light' | 'dark') => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => callback(e.matches ? 'dark' : 'light');
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
```

---

## 7. Testing Requirements

### 7.1 Unit Tests

Each component requires:

- Rendering tests (all variants)
- Prop changes
- Event emission
- Accessibility attributes

### 7.2 Visual Regression Tests

- Light/dark mode screenshots
- All component states (hover, focus, disabled, loading)
- Responsive behavior

### 7.3 Accessibility Tests

- Automated axe-core scans
- Keyboard navigation verification
- Screen reader announcement verification

---

## 8. Acceptance Criteria

### 8.1 Functional Requirements

- [ ] All components render correctly in Chrome 120+
- [ ] Components work inside Shadow DOM
- [ ] Dark mode automatically applies
- [ ] Reduced motion respected
- [ ] All interactive elements keyboard accessible
- [ ] Focus visible on all focusable elements

### 8.2 Accessibility Requirements

- [ ] WCAG 2.1 AA color contrast (4.5:1 text, 3:1 UI)
- [ ] All images/icons have alt text or aria-label
- [ ] Screen reader announcements work
- [ ] Focus trap works in dialogs
- [ ] No keyboard traps

### 8.3 Performance Requirements

- [ ] Total CSS < 20KB (minified, uncompressed)
- [ ] Total JS < 30KB (minified, uncompressed)
- [ ] No layout thrashing in animations
- [ ] Lazy-loadable per component

---

## 9. Dependencies

### Required
- None (vanilla TypeScript)

### Dev Dependencies
- TypeScript 5.0+
- Jest for unit tests
- Playwright for E2E/visual tests
- axe-core for accessibility testing

---

## 10. Migration Path

For existing code in TS-0003 through TS-0006:

1. **Phase 1**: Extract design tokens, update existing CSS to use tokens
2. **Phase 2**: Create Button component, migrate all buttons
3. **Phase 3**: Create remaining components one by one
4. **Phase 4**: Remove duplicated CSS from feature-specific files

---

## Implementation Tracking

Task List: ../tasks/TS-0007-shared-ui-component-library-tasks.md
Generated: 2026-01-17
Status: See task file for current progress

---

## Appendix A: Icon Set

The component library uses inline SVGs for icons. Recommended icon set:

| Icon | Use Case | SVG Path |
|------|----------|----------|
| `check` | Success, confirm | `M5 12l5 5L20 7` |
| `x` | Close, error, cancel | `M6 6l12 12M6 18L18 6` |
| `warning` | Warnings | `M12 9v4m0 4h.01M12 3l9 16H3L12 3z` |
| `info` | Information | `M12 16v-4m0-4h.01M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z` |
| `spinner` | Loading | (CSS animation) |
| `capture` | Screenshot | `M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z` |
| `crop` | Area select | `M6 2v4H2v2h4v14h2V8h14V6H8V2H6zm12 16h4v-2h-4V6h-2v14h2v-2z` |
| `fullpage` | Full page | `M4 4h16v16H4V4zm2 2v12h12V6H6z` |

---

## Appendix B: CSS Reset for Shadow DOM

```css
/* Applied to all Shadow DOM roots */
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
```
