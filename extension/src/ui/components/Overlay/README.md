# Overlay Component

Overlay components for the Web Clipper UI library. Provides fullscreen modal overlays, element highlighting, and canvas-based area selection with resize handles.

## Components

### Overlay (Base)

Base overlay component with three variants:

- **fullscreen**: Modal-style overlay with semi-transparent background
- **highlight**: Transparent overlay for element highlighting
- **selection**: Canvas-based area selection

#### Props

```typescript
interface OverlayProps {
  variant: 'fullscreen' | 'highlight' | 'selection';
  zIndex?: number;
  onEscape?: () => void;
  children?: HTMLElement;
  className?: string;
}
```

#### Example

```typescript
import { Overlay } from '@/ui/components/Overlay';

const overlay = new Overlay({
  variant: 'fullscreen',
  zIndex: 2147483647,
  onEscape: () => overlay.hide(),
});

overlay.show();
```

### HighlightOverlay

Pulsing border overlay for highlighting page elements during selection.

#### Props

```typescript
interface HighlightOverlayProps {
  target: DOMRect;
  padding?: number;          // Default: 4px
  borderColor?: string;      // Default: --wc-primary-500
  borderWidth?: number;      // Default: 2px
  pulse?: boolean;           // Default: true
  zIndex?: number;
  onEscape?: () => void;
}
```

#### Example

```typescript
import { HighlightOverlay } from '@/ui/components/Overlay';

const highlight = new HighlightOverlay({
  target: element.getBoundingClientRect(),
  borderColor: '#3b82f6',
  borderWidth: 2,
  padding: 4,
  pulse: true,
});

highlight.show();

// Update target on mouse move
document.addEventListener('mousemove', (e) => {
  const target = e.target as HTMLElement;
  highlight.setTarget(target.getBoundingClientRect());
});

// Clean up
highlight.destroy();
```

#### Methods

- `setTarget(rect: DOMRect)` - Update highlighted element
- `setPadding(padding: number)` - Update padding
- `setBorderColor(color: string)` - Update border color
- `setBorderWidth(width: number)` - Update border width
- `setPulse(enabled: boolean)` - Enable/disable pulsing animation
- `show()` - Show overlay
- `hide()` - Hide overlay
- `destroy()` - Clean up and remove

### SelectionOverlay

Canvas-based overlay for area selection with 8 resize handles (4 corners + 4 edge midpoints).

#### Props

```typescript
interface SelectionOverlayProps {
  selection: DOMRect | null;
  dimOpacity?: number;                              // Default: 0.5
  onSelectionChange?: (selection: DOMRect | null) => void;
  onSelectionComplete?: (selection: DOMRect) => void;
  minSize?: number;                                 // Default: 10px
  zIndex?: number;
  onEscape?: () => void;
}
```

#### Example

```typescript
import { SelectionOverlay } from '@/ui/components/Overlay';

const selection = new SelectionOverlay({
  selection: null,
  dimOpacity: 0.5,
  minSize: 10,
  onSelectionChange: (rect) => {
    console.log('Selection changed:', rect);
  },
  onSelectionComplete: (rect) => {
    console.log('Selection complete:', rect);
    // Capture screenshot of selected area
  },
  onEscape: () => {
    selection.destroy();
  },
});

selection.show();
```

#### Methods

- `setSelection(rect: DOMRect | null)` - Update selection area
- `getSelection()` - Get current selection
- `clearSelection()` - Clear selection
- `show()` - Show overlay
- `hide()` - Hide overlay
- `destroy()` - Clean up and remove

#### Visual Specifications

- **Dim color**: rgba(0, 0, 0, 0.5)
- **Selection border**: #3b82f6 (2px)
- **Handle size**: 8x8px
- **Handle color**: White with blue border
- **Handle count**: 8 (corners + edge midpoints)
- **Minimum selection**: 10x10px (configurable)

## Features

### Style Isolation

All overlay components use Shadow DOM with closed mode for complete style isolation from the host page. This prevents conflicts with page CSS and ensures consistent appearance.

```typescript
// Shadow DOM is created automatically
const overlay = new Overlay({ variant: 'fullscreen' });
// Styles are isolated and won't affect page
```

### Accessibility

- **Escape key**: All overlays support Escape key dismissal
- **ARIA live regions**: Announces overlay activation/deactivation to screen readers
- **Focus management**: Proper focus handling for keyboard navigation
- **Reduced motion**: Respects `prefers-reduced-motion` media query
- **High contrast**: Enhanced visibility in high contrast mode

```typescript
// Accessibility announcements are automatic
const overlay = new HighlightOverlay({ target: rect });
overlay.show(); // Announces "Element highlighted."
overlay.hide(); // Announces "Highlight removed."
```

### Z-Index Management

Default z-index is set to `2147483647` (max safe integer) to ensure overlays appear above all page content, critical for Chrome extensions.

```typescript
// Custom z-index
const overlay = new Overlay({
  variant: 'fullscreen',
  zIndex: 999999,
});
```

### Performance

- **Canvas optimization**: Uses device pixel ratio for crisp rendering on high-DPI displays
- **Event debouncing**: Efficient handling of mouse events during selection
- **Lazy rendering**: Only re-renders when necessary
- **Memory management**: Proper cleanup in `destroy()` method

## Browser Support

- Chrome 88+ (Manifest V3 extensions)
- Shadow DOM (closed mode)
- Canvas 2D Context
- CSS Custom Properties
- ResizeObserver

## Integration with Design System

Overlays use CSS custom properties from the design token system:

```css
--wc-primary-500      /* Selection border color */
--wc-bg-overlay       /* Fullscreen dim color */
--wc-duration-normal  /* Transition duration */
--wc-ease-out         /* Easing function */
```

## Common Patterns

### Element Picker

```typescript
import { HighlightOverlay } from '@/ui/components/Overlay';

let highlight: HighlightOverlay | null = null;

function startElementPicker() {
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('click', handleClick);
}

function handleMouseMove(e: MouseEvent) {
  const target = e.target as HTMLElement;
  const rect = target.getBoundingClientRect();

  if (!highlight) {
    highlight = new HighlightOverlay({ target: rect });
    highlight.show();
  } else {
    highlight.setTarget(rect);
  }
}

function handleClick(e: MouseEvent) {
  e.preventDefault();
  const target = e.target as HTMLElement;
  console.log('Selected element:', target);

  cleanup();
}

function cleanup() {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('click', handleClick);
  highlight?.destroy();
  highlight = null;
}
```

### Area Screenshot

```typescript
import { SelectionOverlay } from '@/ui/components/Overlay';

function startAreaScreenshot() {
  const selection = new SelectionOverlay({
    selection: null,
    onSelectionComplete: async (rect) => {
      // Capture screenshot of selected area
      const screenshot = await captureArea(rect);

      // Clean up
      selection.destroy();

      // Process screenshot
      processScreenshot(screenshot);
    },
    onEscape: () => {
      selection.destroy();
    },
  });

  selection.show();
}

async function captureArea(rect: DOMRect): Promise<Blob> {
  // Use chrome.tabs.captureVisibleTab or similar
  // Crop to selected area
}
```

### Modal Dialog

```typescript
import { Overlay } from '@/ui/components/Overlay';

function showModal(content: HTMLElement) {
  const overlay = new Overlay({
    variant: 'fullscreen',
    children: content,
    onEscape: () => {
      overlay.destroy();
    },
  });

  overlay.show();

  return overlay;
}
```

## Research References

This implementation is based on current best practices for overlay components:

- [Chrome Extension Content Scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) - Style isolation and z-index handling
- [Canvas Selection Patterns](https://medium.com/variance-digital/interactive-rectangular-selection-on-a-responsive-image-761ebe24280c) - Resize handle implementation
- [React Aria Overlays](https://react-aria.adobe.com/) - Accessibility patterns for overlays
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Keyboard navigation and focus management

## Testing

See `Overlay.test.ts`, `HighlightOverlay.test.ts`, and `SelectionOverlay.test.ts` for comprehensive test coverage.

## License

Part of the Web Clipper project.
