# Button Component

A versatile, accessible button component with Shadow DOM isolation for the Web Clipper UI library.

## Features

- **Shadow DOM Isolation** - Styles are encapsulated and won't conflict with page styles
- **Multiple Variants** - Primary, Secondary, Ghost, Danger
- **Three Sizes** - Small (28px), Medium (36px), Large (44px)
- **Icon Support** - Left, right, or icon-only configurations
- **Loading State** - Automatic spinner with accessibility support
- **Full Width Mode** - Stretches to container width
- **Dark Mode** - Automatically adapts to system color scheme
- **Accessibility** - WCAG 2.1 AA compliant with proper ARIA attributes
- **Touch Optimized** - Minimum 44x44px touch targets on mobile
- **Reduced Motion** - Respects user preferences for animations

## Installation

```typescript
import { Button, createButton } from './components/Button';
```

## Basic Usage

### Using the Class

```typescript
// Create a primary button
const button = new Button(
  { variant: 'primary', size: 'md' },
  'Click me'
);

// Add to DOM
document.body.appendChild(button.getElement());

// Listen for clicks
button.addEventListener('wc-click', (event) => {
  console.log('Button clicked!', event);
});
```

### Using the Factory Function

```typescript
// Simple button creation
const saveButton = createButton(
  { variant: 'primary', size: 'md' },
  'Save Changes'
);

document.body.appendChild(saveButton);

// Listen for clicks
saveButton.addEventListener('wc-click', () => {
  console.log('Saving...');
});
```

## Variants

### Primary
Use for main actions.

```typescript
const primaryBtn = createButton(
  { variant: 'primary', size: 'md' },
  'Submit'
);
```

### Secondary
Use for secondary actions.

```typescript
const secondaryBtn = createButton(
  { variant: 'secondary', size: 'md' },
  'Cancel'
);
```

### Ghost
Use for subtle actions or in toolbars.

```typescript
const ghostBtn = createButton(
  { variant: 'ghost', size: 'md' },
  'Learn More'
);
```

### Danger
Use for destructive actions.

```typescript
const dangerBtn = createButton(
  { variant: 'danger', size: 'md' },
  'Delete'
);
```

## Sizes

### Small (28px height)

```typescript
const smallBtn = createButton(
  { variant: 'primary', size: 'sm' },
  'Small'
);
```

### Medium (36px height - Default)

```typescript
const mediumBtn = createButton(
  { variant: 'primary', size: 'md' },
  'Medium'
);
```

### Large (44px height)

```typescript
const largeBtn = createButton(
  { variant: 'primary', size: 'lg' },
  'Large'
);
```

## With Icons

### Icon Left

```typescript
const saveIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
  <path d="M13.5 2h-11C1.67 2 1 2.67 1 3.5v9c0 .83.67 1.5 1.5 1.5h11c.83 0 1.5-.67 1.5-1.5v-9c0-.83-.67-1.5-1.5-1.5zM13 12H3V4h10v8z"/>
</svg>`;

const iconLeftBtn = createButton(
  {
    variant: 'primary',
    size: 'md',
    icon: saveIcon,
    iconPosition: 'left'
  },
  'Save'
);
```

### Icon Right

```typescript
const arrowIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
  <path d="M8 0L6.59 1.41 12.17 7H0v2h12.17l-5.58 5.59L8 16l8-8z"/>
</svg>`;

const iconRightBtn = createButton(
  {
    variant: 'secondary',
    size: 'md',
    icon: arrowIcon,
    iconPosition: 'right'
  },
  'Next'
);
```

### Icon Only

**Important:** `ariaLabel` is required for icon-only buttons for accessibility.

```typescript
const closeIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
  <path d="M15.854 12.854l-3-3a.5.5 0 0 0-.708 0L12 10l-3-3 .146-.146a.5.5 0 0 0 0-.708l-3-3A.5.5 0 0 0 5.5 3H2a.5.5 0 0 0-.5.5v3.5a.5.5 0 0 0 .146.354l3 3a.5.5 0 0 0 .708 0L6 10l3 3-.146.146a.5.5 0 0 0 0 .708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0 0-.708z"/>
</svg>`;

const iconOnlyBtn = createButton({
  variant: 'ghost',
  size: 'md',
  iconOnly: true,
  icon: closeIcon,
  ariaLabel: 'Close dialog'
});
```

## States

### Disabled

```typescript
const disabledBtn = createButton(
  { variant: 'primary', size: 'md', disabled: true },
  'Disabled'
);

// Or programmatically
const btn = new Button({ variant: 'primary', size: 'md' }, 'Submit');
btn.setDisabled(true);
```

### Loading

```typescript
const loadingBtn = createButton(
  { variant: 'primary', size: 'md', loading: true },
  'Processing...'
);

// Or programmatically
const btn = new Button({ variant: 'primary', size: 'md' }, 'Submit');
btn.setLoading(true);

// Later, when done
btn.setLoading(false);
```

### Full Width

```typescript
const fullWidthBtn = createButton(
  { variant: 'primary', size: 'lg', fullWidth: true },
  'Continue'
);
```

## Class API

### Constructor

```typescript
new Button(props: ButtonProps, content?: string)
```

### Methods

#### `getElement(): HTMLElement`
Returns the host element to insert into the DOM.

```typescript
const button = new Button({ variant: 'primary', size: 'md' }, 'Click');
document.body.appendChild(button.getElement());
```

#### `update(newProps: Partial<ButtonProps>, newContent?: string): void`
Updates button properties and re-renders.

```typescript
button.update({ variant: 'secondary' }, 'Updated Text');
```

#### `setLoading(loading: boolean): void`
Sets the loading state.

```typescript
button.setLoading(true);
```

#### `setDisabled(disabled: boolean): void`
Sets the disabled state.

```typescript
button.setDisabled(true);
```

#### `addEventListener(event: string, handler: EventListener): void`
Adds an event listener.

```typescript
button.addEventListener('wc-click', (e) => {
  console.log('Clicked!', e);
});
```

#### `removeEventListener(event: string, handler: EventListener): void`
Removes an event listener.

```typescript
button.removeEventListener('wc-click', handleClick);
```

#### `focus(): void`
Programmatically focuses the button.

```typescript
button.focus();
```

#### `blur(): void`
Programmatically blurs the button.

```typescript
button.blur();
```

#### `destroy(): void`
Destroys the button and cleans up resources.

```typescript
button.destroy();
```

## Events

### `wc-click`
Emitted when the button is clicked (unless disabled or loading).

```typescript
button.addEventListener('wc-click', (event: CustomEvent) => {
  console.log('Original click event:', event.detail.originalEvent);
});
```

## Props Reference

### ButtonProps

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | Yes | - | Visual style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | Yes | - | Button size |
| `disabled` | `boolean` | No | `false` | Whether button is disabled |
| `loading` | `boolean` | No | `false` | Whether button is in loading state |
| `iconOnly` | `boolean` | No | `false` | Whether button only displays an icon |
| `icon` | `string` | No | - | SVG string for icon |
| `iconPosition` | `'left' \| 'right'` | No | `'left'` | Position of icon relative to text |
| `fullWidth` | `boolean` | No | `false` | Whether button takes full width |
| `ariaLabel` | `string` | Conditional* | - | Accessible label (*required for iconOnly) |

## Accessibility

The Button component follows WCAG 2.1 AA guidelines:

- **Keyboard Navigation** - Fully keyboard accessible with visible focus states
- **Screen Readers** - Proper ARIA attributes and labels
- **Touch Targets** - Minimum 44x44px on mobile devices
- **Focus Management** - Clear focus visible states with 2px outline
- **Loading States** - `aria-busy` attribute during loading
- **Disabled States** - `aria-disabled` attribute when disabled
- **Icon-Only** - Requires `aria-label` for screen reader context

## Design Tokens

The Button component uses design tokens from the Web Clipper UI library:

- Colors: `--wc-primary-*`, `--wc-error-*`, `--wc-text-*`, `--wc-bg-*`
- Spacing: `--wc-button-padding-*`, `--wc-icon-gap-*`
- Typography: `--wc-font-size-*`, `--wc-font-weight-*`
- Radius: `--wc-radius-button`
- Shadows: `--wc-shadow-button`, `--wc-shadow-focus`
- Transitions: `--wc-transition-button`

These tokens support light/dark mode and can be customized if needed.

## Browser Support

- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+

All modern browsers with Shadow DOM support.

## Examples

### Async Action with Loading State

```typescript
const button = new Button(
  { variant: 'primary', size: 'md' },
  'Save Changes'
);

button.addEventListener('wc-click', async () => {
  button.setLoading(true);
  button.update({ disabled: true });

  try {
    await saveChanges();
    // Show success
  } catch (error) {
    // Show error
  } finally {
    button.setLoading(false);
    button.update({ disabled: false });
  }
});
```

### Button Group

```typescript
const container = document.createElement('div');
container.style.display = 'flex';
container.style.gap = '8px';

const cancelBtn = createButton(
  { variant: 'secondary', size: 'md' },
  'Cancel'
);

const saveBtn = createButton(
  { variant: 'primary', size: 'md' },
  'Save'
);

container.appendChild(cancelBtn);
container.appendChild(saveBtn);
document.body.appendChild(container);
```

### Toolbar with Icon Buttons

```typescript
const toolbar = document.createElement('div');
toolbar.style.display = 'flex';
toolbar.style.gap = '4px';

const actions = [
  { icon: boldIcon, label: 'Bold' },
  { icon: italicIcon, label: 'Italic' },
  { icon: linkIcon, label: 'Insert Link' },
];

actions.forEach(({ icon, label }) => {
  const btn = createButton({
    variant: 'ghost',
    size: 'sm',
    iconOnly: true,
    icon,
    ariaLabel: label
  });
  toolbar.appendChild(btn);
});

document.body.appendChild(toolbar);
```
