# Web Clipper Design Tokens

A comprehensive design token system for the Web Clipper UI component library. These tokens provide a consistent visual language across all components with full support for light/dark modes and Shadow DOM compatibility.

## Installation

Import all tokens:

```css
@import './tokens/index.css';
```

Or import individual token files:

```css
@import './tokens/colors.css';
@import './tokens/typography.css';
@import './tokens/spacing.css';
```

## Token Categories

### Colors (`colors.css`)

Complete color palette with semantic aliases for light and dark modes.

**Color Scales:**
- Primary (blue): `--wc-primary-50` through `--wc-primary-950`
- Success (green): `--wc-success-50` through `--wc-success-950`
- Warning (amber): `--wc-warning-50` through `--wc-warning-950`
- Error (red): `--wc-error-50` through `--wc-error-950`
- Neutral (gray): `--wc-gray-50` through `--wc-gray-950`

**Semantic Aliases:**
```css
/* Text colors (auto-adjust for dark mode) */
--wc-text-primary
--wc-text-secondary
--wc-text-tertiary
--wc-text-disabled
--wc-text-inverse
--wc-text-link
--wc-text-link-hover

/* Background colors */
--wc-bg-primary
--wc-bg-secondary
--wc-bg-tertiary
--wc-bg-overlay
--wc-bg-hover
--wc-bg-active

/* Border colors */
--wc-border-default
--wc-border-subtle
--wc-border-strong
--wc-border-focus

/* Interactive states */
--wc-interactive-default
--wc-interactive-hover
--wc-interactive-active
--wc-interactive-disabled
```

### Typography (`typography.css`)

Font families, sizes, weights, line heights, and complete typography presets.

**Font Families:**
```css
--wc-font-family-sans
--wc-font-family-mono
```

**Font Sizes:**
```css
--wc-font-size-xs    /* 12px */
--wc-font-size-sm    /* 14px */
--wc-font-size-base  /* 16px */
--wc-font-size-lg    /* 18px */
--wc-font-size-xl    /* 20px */
--wc-font-size-2xl   /* 24px */
--wc-font-size-3xl   /* 30px */
--wc-font-size-4xl   /* 36px */
--wc-font-size-5xl   /* 48px */
```

**Typography Presets:**
```css
/* Headings (h1-h6) */
--wc-heading-1-size
--wc-heading-1-weight
--wc-heading-1-line-height
--wc-heading-1-letter-spacing
/* ... through heading-6 */

/* Body text */
--wc-body-lg-size
--wc-body-base-size
--wc-body-sm-size
--wc-body-xs-size

/* Labels and UI text */
--wc-label-lg-size
--wc-label-base-size
--wc-label-sm-size

/* Code */
--wc-code-size
--wc-code-family

/* Captions */
--wc-caption-size

/* Overlines */
--wc-overline-size
--wc-overline-transform
```

### Spacing (`spacing.css`)

Consistent spacing scale based on 8px grid with semantic aliases.

**Base Scale:**
```css
--wc-space-0      /* 0 */
--wc-space-1      /* 4px */
--wc-space-2      /* 8px */
--wc-space-3      /* 12px */
--wc-space-4      /* 16px */
--wc-space-6      /* 24px */
--wc-space-8      /* 32px */
--wc-space-12     /* 48px */
--wc-space-16     /* 64px */
/* ... through space-32 */
```

**Semantic Aliases:**
```css
/* Component padding */
--wc-component-padding-xs
--wc-component-padding-sm
--wc-component-padding-base
--wc-component-padding-lg

/* Layout gaps */
--wc-layout-gap-xs
--wc-layout-gap-base
--wc-layout-gap-lg

/* Button/Input spacing */
--wc-button-padding-x-sm
--wc-button-padding-y-base
--wc-input-padding-x-base
/* ... etc */
```

### Layout (`layout.css`)

Border radius, z-index, widths, heights, and opacity values.

**Border Radius:**
```css
--wc-radius-none
--wc-radius-sm       /* 2px */
--wc-radius-base     /* 4px */
--wc-radius-md       /* 6px */
--wc-radius-lg       /* 8px */
--wc-radius-xl       /* 12px */
--wc-radius-2xl      /* 16px */
--wc-radius-3xl      /* 24px */
--wc-radius-full     /* 9999px */

/* Semantic aliases */
--wc-radius-button
--wc-radius-card
--wc-radius-modal
```

**Z-Index Scale:**
```css
--wc-z-base           /* 0 */
--wc-z-dropdown       /* 1000 */
--wc-z-sticky         /* 1100 */
--wc-z-fixed          /* 1200 */
--wc-z-popover        /* 1300 */
--wc-z-tooltip        /* 1400 */
--wc-z-modal-backdrop /* 1500 */
--wc-z-modal          /* 1600 */
--wc-z-notification   /* 1700 */
--wc-z-max            /* 9999 */
```

**Component Sizes:**
```css
/* Input heights */
--wc-height-input-sm
--wc-height-input-base
--wc-height-input-lg

/* Icon sizes */
--wc-icon-size-xs
--wc-icon-size-base
--wc-icon-size-lg

/* Avatar sizes */
--wc-avatar-size-sm
--wc-avatar-size-base
--wc-avatar-size-lg
```

### Shadows (`shadows.css`)

Elevation shadows with automatic dark mode adjustments.

**Shadow Levels:**
```css
--wc-shadow-xs
--wc-shadow-sm
--wc-shadow-base
--wc-shadow-md
--wc-shadow-lg
--wc-shadow-xl
--wc-shadow-2xl
--wc-shadow-none
--wc-shadow-inner

/* Focus rings */
--wc-shadow-focus
--wc-shadow-focus-error
--wc-shadow-focus-success

/* Semantic aliases */
--wc-shadow-card
--wc-shadow-card-hover
--wc-shadow-dropdown
--wc-shadow-modal
--wc-shadow-tooltip
```

### Animations (`animations.css`)

Duration, easing functions, and keyframe animations with reduced motion support.

**Durations:**
```css
--wc-duration-instant  /* 0ms */
--wc-duration-fast     /* 150ms */
--wc-duration-base     /* 200ms */
--wc-duration-medium   /* 300ms */
--wc-duration-slow     /* 500ms */
```

**Easing Functions:**
```css
--wc-ease-linear
--wc-ease-in
--wc-ease-out
--wc-ease-in-out
--wc-ease-bounce
--wc-ease-smooth
```

**Transitions:**
```css
--wc-transition-fade
--wc-transition-slide
--wc-transition-scale
--wc-transition-color
--wc-transition-button
--wc-transition-input
--wc-transition-modal
```

**Keyframe Animations:**
- `@keyframes wc-spin`
- `@keyframes wc-pulse`
- `@keyframes wc-bounce`
- `@keyframes wc-fade-in`
- `@keyframes wc-slide-in-up`
- `@keyframes wc-scale-in`

## Usage Examples

### Using Color Tokens

```css
.button {
  background-color: var(--wc-interactive-default);
  color: var(--wc-text-inverse);
  border: 1px solid var(--wc-border-default);
}

.button:hover {
  background-color: var(--wc-interactive-hover);
}
```

### Using Typography Presets

```css
h1 {
  font-size: var(--wc-heading-1-size);
  font-weight: var(--wc-heading-1-weight);
  line-height: var(--wc-heading-1-line-height);
  letter-spacing: var(--wc-heading-1-letter-spacing);
}

.body-text {
  font-size: var(--wc-body-base-size);
  line-height: var(--wc-body-base-line-height);
}
```

### Using Spacing

```css
.card {
  padding: var(--wc-component-padding-lg);
  gap: var(--wc-layout-gap-base);
  margin-bottom: var(--wc-space-6);
}

.button {
  padding: var(--wc-button-padding-y-base) var(--wc-button-padding-x-base);
}
```

### Using Layout Tokens

```css
.modal {
  max-width: var(--wc-width-modal-md);
  border-radius: var(--wc-radius-modal);
  z-index: var(--wc-z-modal);
}

.avatar {
  width: var(--wc-avatar-size-base);
  height: var(--wc-avatar-size-base);
  border-radius: var(--wc-radius-avatar);
}
```

### Using Shadows

```css
.card {
  box-shadow: var(--wc-shadow-card);
}

.card:hover {
  box-shadow: var(--wc-shadow-card-hover);
}

.input:focus {
  box-shadow: var(--wc-shadow-focus);
}
```

### Using Animations

```css
.button {
  transition: var(--wc-transition-button);
}

.modal {
  animation: wc-scale-in var(--wc-duration-base) var(--wc-ease-out);
}

.spinner {
  animation: wc-spin var(--wc-animation-spin) linear infinite;
}
```

## Dark Mode

All color tokens automatically adapt to dark mode using `@media (prefers-color-scheme: dark)`. No additional code needed:

```css
/* This automatically works in both light and dark mode */
.text {
  color: var(--wc-text-primary);
}
```

## Reduced Motion

The animation system respects `prefers-reduced-motion` preference. All animations are automatically disabled when users prefer reduced motion.

## Shadow DOM Compatibility

All tokens use `:host, :root` selector for compatibility with both Shadow DOM components and regular DOM elements.

## File Structure

```
tokens/
├── index.css         # Main entry point (imports all)
├── colors.css        # Color palette and semantic aliases
├── typography.css    # Font families, sizes, presets
├── spacing.css       # Spacing scale and semantic aliases
├── layout.css        # Border radius, z-index, sizes
├── shadows.css       # Elevation shadows
├── animations.css    # Durations, easings, keyframes
└── README.md         # This file
```

## Best Practices

1. **Always use semantic tokens** when available (`--wc-text-primary` instead of `--wc-gray-900`)
2. **Use component-specific tokens** for consistent sizing (`--wc-button-padding-x-base`)
3. **Avoid hardcoded values** - if you need a value not in the system, consider adding it
4. **Test in both light and dark modes** to ensure proper token usage
5. **Respect reduced motion** - use the provided transition tokens that auto-disable

## Contributing

When adding new tokens:
1. Use the existing naming convention (`--wc-category-variant-modifier`)
2. Add to the appropriate token file
3. Update this README with examples
4. Test in both light and dark modes
5. Add semantic aliases when appropriate
