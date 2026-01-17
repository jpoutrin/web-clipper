# Design Tokens Quick Reference

Quick lookup guide for the most commonly used tokens.

## Colors

```css
/* Text */
--wc-text-primary      /* Main text color */
--wc-text-secondary    /* Subdued text */
--wc-text-link         /* Link color */

/* Backgrounds */
--wc-bg-primary        /* Main background */
--wc-bg-secondary      /* Alternate background */
--wc-bg-hover          /* Hover state background */

/* Borders */
--wc-border-default    /* Standard borders */
--wc-border-focus      /* Focus ring color */

/* Interactive */
--wc-interactive-default  /* Default button/link */
--wc-interactive-hover    /* Hover state */

/* Semantic colors */
--wc-success-600       /* Success actions */
--wc-warning-600       /* Warning actions */
--wc-error-600         /* Error/destructive actions */
```

## Spacing

```css
/* Common spacing values */
--wc-space-2          /* 8px - tight spacing */
--wc-space-4          /* 16px - base spacing */
--wc-space-6          /* 24px - comfortable spacing */
--wc-space-8          /* 32px - loose spacing */

/* Component spacing */
--wc-component-padding-base    /* Standard padding */
--wc-layout-gap-base           /* Standard gap */
--wc-button-padding-y-base     /* Button vertical padding */
--wc-button-padding-x-base     /* Button horizontal padding */
```

## Typography

```css
/* Font sizes */
--wc-font-size-sm     /* 14px - small text */
--wc-font-size-base   /* 16px - body text */
--wc-font-size-lg     /* 18px - large text */

/* Font weights */
--wc-font-weight-normal     /* 400 */
--wc-font-weight-medium     /* 500 */
--wc-font-weight-semibold   /* 600 */
--wc-font-weight-bold       /* 700 */

/* Presets */
font-size: var(--wc-heading-2-size);
font-weight: var(--wc-heading-2-weight);
line-height: var(--wc-heading-2-line-height);
```

## Layout

```css
/* Border radius */
--wc-radius-base      /* 4px - small elements */
--wc-radius-md        /* 6px - buttons, inputs */
--wc-radius-lg        /* 8px - cards */
--wc-radius-full      /* 9999px - pills, avatars */

/* Z-index */
--wc-z-dropdown       /* 1000 */
--wc-z-modal          /* 1600 */
--wc-z-tooltip        /* 1400 */

/* Sizes */
--wc-height-button-base    /* 40px */
--wc-icon-size-base        /* 20px */
```

## Shadows

```css
--wc-shadow-sm        /* Subtle elevation */
--wc-shadow-base      /* Card shadow */
--wc-shadow-lg        /* Dropdown/popover */
--wc-shadow-focus     /* Focus ring */
```

## Animations

```css
/* Durations */
--wc-duration-fast    /* 150ms - quick feedback */
--wc-duration-base    /* 200ms - standard */

/* Transitions */
--wc-transition-button    /* Button transitions */
--wc-transition-color     /* Color transitions */

/* Keyframes */
animation: wc-fade-in var(--wc-duration-base) var(--wc-ease-out);
```

## Common Patterns

### Button

```css
.button {
  padding: var(--wc-button-padding-y-base) var(--wc-button-padding-x-base);
  font-size: var(--wc-font-size-base);
  font-weight: var(--wc-font-weight-medium);
  border-radius: var(--wc-radius-button);
  background-color: var(--wc-interactive-default);
  color: var(--wc-text-inverse);
  transition: var(--wc-transition-button);
}

.button:hover {
  background-color: var(--wc-interactive-hover);
}

.button:focus-visible {
  box-shadow: var(--wc-shadow-focus);
}
```

### Card

```css
.card {
  padding: var(--wc-component-padding-lg);
  background-color: var(--wc-surface-elevated);
  border-radius: var(--wc-radius-card);
  box-shadow: var(--wc-shadow-card);
  border: 1px solid var(--wc-border-subtle);
}

.card:hover {
  box-shadow: var(--wc-shadow-card-hover);
}
```

### Input

```css
.input {
  padding: var(--wc-input-padding-y-base) var(--wc-input-padding-x-base);
  font-size: var(--wc-font-size-base);
  border: 1px solid var(--wc-border-default);
  border-radius: var(--wc-radius-input);
  background-color: var(--wc-bg-primary);
  color: var(--wc-text-primary);
  transition: var(--wc-transition-input);
}

.input:focus {
  border-color: var(--wc-border-focus);
  box-shadow: var(--wc-shadow-focus);
}
```

### Modal

```css
.modal {
  max-width: var(--wc-width-modal-md);
  padding: var(--wc-component-padding-xl);
  background-color: var(--wc-bg-primary);
  border-radius: var(--wc-radius-modal);
  box-shadow: var(--wc-shadow-modal);
  z-index: var(--wc-z-modal);
  animation: wc-scale-in var(--wc-duration-base) var(--wc-ease-out);
}

.modal-backdrop {
  background-color: var(--wc-bg-overlay);
  z-index: var(--wc-z-modal-backdrop);
}
```

### Stack (vertical layout)

```css
.stack {
  display: flex;
  flex-direction: column;
  gap: var(--wc-stack-gap-base);
}
```

### Inline (horizontal layout)

```css
.inline {
  display: flex;
  align-items: center;
  gap: var(--wc-inline-gap-base);
}
```

### Typography

```css
.heading {
  font-size: var(--wc-heading-3-size);
  font-weight: var(--wc-heading-3-weight);
  line-height: var(--wc-heading-3-line-height);
  color: var(--wc-text-primary);
}

.body {
  font-size: var(--wc-body-base-size);
  line-height: var(--wc-body-base-line-height);
  color: var(--wc-text-secondary);
}

.label {
  font-size: var(--wc-label-base-size);
  font-weight: var(--wc-label-base-weight);
  color: var(--wc-text-primary);
}
```

## Tips

1. **Prefer semantic tokens**: Use `--wc-text-primary` over `--wc-gray-900`
2. **Use component tokens**: Use `--wc-button-padding-x-base` over `--wc-space-4`
3. **Dark mode works automatically**: Semantic tokens adapt to dark mode
4. **Stack your CSS custom properties**: Build complex values from simple tokens

```css
/* Good: Composable tokens */
.button {
  padding: var(--wc-button-padding-y-base) var(--wc-button-padding-x-base);
}

/* Avoid: Hardcoded values */
.button {
  padding: 8px 16px;
}
```
