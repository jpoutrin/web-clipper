# Badge Component

A pill-shaped badge component for displaying status, labels, and metadata with Shadow DOM isolation.

## Features

- Multiple color variants (default, success, warning, error, info)
- Two sizes (sm, md)
- Optional icon support
- Removable badges with close button
- Shadow DOM isolation
- Light/dark mode support
- WCAG 2.1 AA compliant

## Usage

### Basic Badge

```typescript
import { createBadge } from './ui/components/Badge';

const badge = createBadge({
  variant: 'success',
  size: 'md',
  label: 'Published',
});

document.body.appendChild(badge);
```

### Badge with Icon

```typescript
const badge = createBadge({
  variant: 'info',
  size: 'md',
  label: 'New',
  icon: `<svg width="12" height="12" viewBox="0 0 12 12">
    <circle cx="6" cy="6" r="4" fill="currentColor"/>
  </svg>`,
});
```

### Removable Badge

```typescript
const badge = createBadge({
  variant: 'default',
  size: 'md',
  label: 'Tag',
  removable: true,
  onRemove: () => {
    console.log('Badge removed');
  },
});

// Or listen to custom event
badge.addEventListener('wc-badge-remove', (e) => {
  console.log('Badge removed:', e.detail.label);
});
```

### Using the Badge Class

```typescript
import { Badge } from './ui/components/Badge';

const badge = new Badge({
  variant: 'warning',
  size: 'sm',
  label: 'Pending',
});

// Update label dynamically
badge.setLabel('Processing');

// Update variant dynamically
badge.setVariant('success');

// Get the element
const element = badge.getElement();
document.body.appendChild(element);

// Clean up
badge.destroy();
```

## Props

### BadgeProps

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `variant` | `'default' \| 'success' \| 'warning' \| 'error' \| 'info'` | Yes | - | Color scheme variant |
| `size` | `'sm' \| 'md'` | Yes | - | Badge size |
| `label` | `string` | Yes | - | Text label displayed in badge |
| `icon` | `string` | No | - | SVG string for icon |
| `removable` | `boolean` | No | `false` | Whether badge can be removed |
| `onRemove` | `() => void` | No | - | Callback when badge is removed |

## Variants

### default
Gray background, suitable for general tags and labels.

### success
Green background, for completed states and confirmations.

### warning
Yellow/amber background, for cautions and pending states.

### error
Red background, for errors and destructive states.

### info
Blue background, for informational badges.

## Sizes

### sm
- Padding: 2px 8px
- Font size: 11px
- Icon size: 12px

### md
- Padding: 4px 12px
- Font size: 12px (var(--wc-font-size-xs))
- Icon size: 12px

## Methods

### setLabel(label: string): void
Updates the badge label text.

### setVariant(variant: BadgeProps['variant']): void
Changes the badge color variant.

### getElement(): HTMLElement
Returns the badge DOM element.

### destroy(): void
Removes the badge from the DOM and cleans up.

## Events

### wc-badge-remove
Dispatched when the remove button is clicked (if removable).

**Event Detail:**
```typescript
{
  label: string; // The badge label
}
```

## Accessibility

- Uses `role="status"` for screen readers
- Provides `aria-label` with badge text
- Remove button has descriptive `aria-label`
- Keyboard accessible remove button
- WCAG 2.1 AA color contrast ratios
- Supports prefers-color-scheme for dark mode

## Dark Mode

The badge automatically adapts to dark mode using CSS media queries:

```css
@media (prefers-color-scheme: dark) {
  /* Darker backgrounds with lighter text */
}
```

## Examples

```typescript
// Status badge
const statusBadge = createBadge({
  variant: 'success',
  size: 'sm',
  label: 'Active',
});

// Tag with icon
const tagBadge = createBadge({
  variant: 'default',
  size: 'md',
  label: 'JavaScript',
  icon: '<svg>...</svg>',
  removable: true,
  onRemove: () => removeTag('JavaScript'),
});

// Error badge
const errorBadge = createBadge({
  variant: 'error',
  size: 'md',
  label: 'Failed',
});

// Info badge with programmatic updates
const badge = new Badge({
  variant: 'info',
  size: 'md',
  label: 'Draft',
});

// Later update the badge
setTimeout(() => {
  badge.setVariant('success');
  badge.setLabel('Published');
}, 2000);
```
