# FloatingToolbar Component

A floating toolbar component that positions itself relative to an anchor element with automatic viewport-aware positioning, keyboard navigation, and accessibility features.

## Features

- Auto-positioning based on available viewport space
- Positioning arrow that points to the anchor element
- Keyboard navigation with arrow keys
- Action button variants: default, primary, danger
- Separators for grouping actions
- Tooltips on hover/focus
- Dark mode support
- Custom event dispatching
- Full accessibility support

## Usage

### Basic Example

```typescript
import { FloatingToolbar } from './ui/components/FloatingToolbar';

// Get anchor element (e.g., selected text)
const selection = window.getSelection();
const range = selection?.getRangeAt(0);
const anchor = range?.getBoundingClientRect();

if (!anchor) return;

// Create toolbar
const toolbar = new FloatingToolbar({
  anchor,
  ariaLabel: 'Text formatting toolbar',
  actions: [
    {
      id: 'bold',
      icon: '<svg>...</svg>',
      label: 'Bold',
      onClick: () => document.execCommand('bold'),
    },
    {
      id: 'italic',
      icon: '<svg>...</svg>',
      label: 'Italic',
      onClick: () => document.execCommand('italic'),
    },
    { type: 'separator' },
    {
      id: 'delete',
      icon: '<svg>...</svg>',
      label: 'Delete',
      variant: 'danger',
      onClick: () => range.deleteContents(),
    },
  ],
});

// Add to DOM and show
document.body.appendChild(toolbar.getElement());
toolbar.show();

// Listen for action events
toolbar.getElement().addEventListener('wc-action', (e) => {
  console.log('Action clicked:', e.detail.actionId);
});
```

### Factory Function

```typescript
import { createFloatingToolbar } from './ui/components/FloatingToolbar';

const toolbarElement = createFloatingToolbar({
  anchor: rect,
  actions: [/* ... */],
});

document.body.appendChild(toolbarElement);
```

### Action Variants

```typescript
const toolbar = new FloatingToolbar({
  anchor: rect,
  actions: [
    // Default - transparent with hover
    {
      id: 'action1',
      icon: '<svg>...</svg>',
      label: 'Default Action',
      variant: 'default', // or omit
      onClick: () => {},
    },
    // Primary - filled with brand color
    {
      id: 'action2',
      icon: '<svg>...</svg>',
      label: 'Primary Action',
      variant: 'primary',
      onClick: () => {},
    },
    // Danger - red on hover
    {
      id: 'action3',
      icon: '<svg>...</svg>',
      label: 'Delete',
      variant: 'danger',
      onClick: () => {},
    },
  ],
});
```

### Separators

```typescript
const toolbar = new FloatingToolbar({
  anchor: rect,
  actions: [
    { id: 'copy', icon: '<svg>...</svg>', label: 'Copy', onClick: () => {} },
    { id: 'paste', icon: '<svg>...</svg>', label: 'Paste', onClick: () => {} },
    { type: 'separator' },
    { id: 'delete', icon: '<svg>...</svg>', label: 'Delete', variant: 'danger', onClick: () => {} },
  ],
});
```

### Updating Toolbar

```typescript
// Update anchor position (e.g., on scroll/resize)
const newRect = element.getBoundingClientRect();
toolbar.updateAnchor(newRect);

// Update actions
toolbar.setActions([
  { id: 'new-action', icon: '<svg>...</svg>', label: 'New', onClick: () => {} },
]);
```

### Lifecycle

```typescript
// Show toolbar
toolbar.show();

// Hide toolbar
toolbar.hide();

// Clean up
toolbar.destroy();
```

## Props

### FloatingToolbarProps

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `anchor` | `DOMRect` | Required | Element to position relative to |
| `actions` | `ToolbarItem[]` | Required | Actions and separators to display |
| `position` | `'top' \| 'bottom' \| 'auto'` | `'auto'` | Preferred position (auto calculates) |
| `viewportPadding` | `number` | `8` | Min distance from viewport edge (px) |
| `ariaLabel` | `string` | `'Floating toolbar'` | Accessible label for toolbar |

### ToolbarAction

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | `string` | Required | Unique identifier |
| `icon` | `string` | Required | SVG string for icon |
| `label` | `string` | Required | Tooltip and aria-label text |
| `variant` | `'default' \| 'primary' \| 'danger'` | `'default'` | Button style variant |
| `disabled` | `boolean` | `false` | Whether action is disabled |
| `onClick` | `() => void` | Required | Click handler |

### ToolbarSeparator

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'separator'` | Identifies item as separator |

## Methods

### `updateAnchor(rect: DOMRect): void`
Updates the anchor position and repositions the toolbar.

### `setActions(actions: ToolbarItem[]): void`
Updates the toolbar actions.

### `show(): void`
Shows the toolbar with animation and focuses the first action.

### `hide(): void`
Hides the toolbar with animation.

### `getElement(): HTMLElement`
Returns the toolbar DOM element.

### `destroy(): void`
Removes the toolbar from the DOM and cleans up.

## Events

### `wc-action`
Dispatched when an action button is clicked.

```typescript
interface ToolbarActionEvent extends CustomEvent {
  detail: {
    actionId: string;
  };
}

toolbar.getElement().addEventListener('wc-action', (e: ToolbarActionEvent) => {
  console.log('Action:', e.detail.actionId);
});
```

## Keyboard Navigation

- **Arrow Left/Right**: Navigate between actions
- **Home**: Focus first action
- **End**: Focus last action
- **Escape**: Hide toolbar
- **Tab**: Standard focus navigation

## Accessibility

- `role="toolbar"` on toolbar container
- `aria-label` for toolbar identification
- `aria-label` for each action (from label prop)
- `aria-disabled` for disabled actions
- `aria-orientation="horizontal"`
- `role="separator"` for separators
- `role="tooltip"` for tooltips
- Proper tabindex management for roving focus
- Focus visible styles
- High contrast mode support

## Styling

The component uses CSS custom properties from the design tokens:

- Colors: `--wc-*` from `tokens/colors.css`
- Shadows: `--wc-shadow-*` from `tokens/shadows.css`
- Automatic dark mode support
- Responsive to `prefers-color-scheme`
- Reduced motion support
- High contrast mode support

### CSS Classes

- `.wc-floating-toolbar-container` - Main container
- `.wc-floating-toolbar` - Toolbar element
- `.wc-floating-toolbar-arrow` - Positioning arrow
- `.wc-toolbar-action` - Action button
- `.wc-toolbar-action--default` - Default variant
- `.wc-toolbar-action--primary` - Primary variant
- `.wc-toolbar-action--danger` - Danger variant
- `.wc-toolbar-separator` - Separator element
- `.wc-toolbar-tooltip` - Tooltip element

## Examples

### Selection Toolbar

```typescript
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    toolbar?.hide();
    return;
  }

  const range = selection.getRangeAt(0);
  const anchor = range.getBoundingClientRect();

  if (!toolbar) {
    toolbar = new FloatingToolbar({
      anchor,
      ariaLabel: 'Text selection toolbar',
      actions: [
        { id: 'copy', icon: copyIcon, label: 'Copy', onClick: () => navigator.clipboard.writeText(selection.toString()) },
        { id: 'highlight', icon: highlightIcon, label: 'Highlight', variant: 'primary', onClick: () => highlightText() },
        { type: 'separator' },
        { id: 'clip', icon: clipIcon, label: 'Save to Clipper', onClick: () => saveClip() },
      ],
    });
    document.body.appendChild(toolbar.getElement());
  } else {
    toolbar.updateAnchor(anchor);
  }

  toolbar.show();
});
```

### Image Hover Toolbar

```typescript
document.querySelectorAll('img').forEach((img) => {
  let toolbar: FloatingToolbar | null = null;

  img.addEventListener('mouseenter', () => {
    const rect = img.getBoundingClientRect();

    toolbar = new FloatingToolbar({
      anchor: rect,
      position: 'top',
      ariaLabel: 'Image actions',
      actions: [
        { id: 'download', icon: downloadIcon, label: 'Download', onClick: () => downloadImage(img) },
        { id: 'copy', icon: copyIcon, label: 'Copy', onClick: () => copyImage(img) },
        { type: 'separator' },
        { id: 'delete', icon: deleteIcon, label: 'Remove', variant: 'danger', onClick: () => img.remove() },
      ],
    });

    document.body.appendChild(toolbar.getElement());
    toolbar.show();
  });

  img.addEventListener('mouseleave', () => {
    toolbar?.destroy();
    toolbar = null;
  });
});
```

## Browser Support

- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+

Requires:
- ES2020+ features
- Custom Elements
- CSS Custom Properties
- Intersection Observer
