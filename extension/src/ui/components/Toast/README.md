# Toast Component

Accessible toast notification system for the Web Clipper UI library.

## Features

- **Auto-dismiss with Timer**: Configurable duration with progress bar indicator
- **Pause on Hover/Focus**: Timer pauses when user interacts with toast
- **Variants**: Success, error, warning, and info styles
- **Action Buttons**: Optional inline actions
- **Stacking**: Manages multiple toasts with configurable limits
- **Accessibility**: Proper ARIA roles, live regions, and keyboard support
- **Dark Mode**: Full dark mode support
- **Reduced Motion**: Respects `prefers-reduced-motion` preference
- **Responsive**: Adapts to mobile screens

## Installation

```typescript
import { toast } from './components/Toast';
import './components/Toast/Toast.css';
```

## Basic Usage

### Simple Notifications

```typescript
// Success notification
toast.success('Clip saved successfully');

// Error notification
toast.error('Failed to save clip');

// Warning notification
toast.warning('Storage space running low');

// Info notification
toast.info('New version available');
```

### With Description

```typescript
toast.success(
  'Clip saved',
  'Your clip has been saved to the archive'
);

toast.error(
  'Authentication failed',
  'Please check your credentials and try again'
);
```

### Custom Duration

```typescript
// 3 second auto-dismiss
toast.info('Quick message', undefined, { duration: 3000 });

// Persistent (no auto-dismiss)
toast.error('Critical error', undefined, { duration: 0 });

// Non-dismissible
toast.warning('Processing...', undefined, {
  duration: 0,
  dismissible: false
});
```

### With Action Button

```typescript
toast.success('Clip saved', undefined, {
  action: {
    label: 'View',
    onClick: () => {
      window.open('/clips/latest', '_blank');
    }
  }
});

toast.error('Failed to sync', undefined, {
  action: {
    label: 'Retry',
    onClick: async () => {
      await retrySync();
    }
  }
});
```

### Managing Toasts

```typescript
// Get toast ID for later control
const toastId = toast.info('Processing...');

// Dismiss specific toast
setTimeout(() => {
  toast.dismiss(toastId);
}, 3000);

// Dismiss all toasts
toast.dismissAll();
```

## Advanced Usage

### Using ToastManager Directly

```typescript
import { toastManager } from './components/Toast';

const toastId = toastManager.show({
  variant: 'success',
  title: 'Upload complete',
  description: '5 files uploaded successfully',
  duration: 5000,
  dismissible: true,
  action: {
    label: 'View Files',
    onClick: () => console.log('View clicked')
  },
  onDismiss: () => console.log('Toast dismissed')
});

// Check if toast is still active
if (toastManager.isActive(toastId)) {
  console.log('Toast still showing');
}

// Get active toast count
console.log(`${toastManager.getActiveCount()} toasts visible`);
```

### Custom Configuration

```typescript
import { ToastManager } from './components/Toast';

const customToastManager = ToastManager.getInstance({
  maxToasts: 3,           // Limit to 3 toasts
  position: 'top-right',  // Change position
  gap: 16                 // Custom gap between toasts
});

// Update configuration later
customToastManager.updateConfig({
  position: 'bottom-left',
  maxToasts: 5
});
```

### Custom Toast Class

```typescript
import { Toast, type ToastProps } from './components/Toast';

const customToast = new Toast({
  variant: 'info',
  title: 'Custom Toast',
  description: 'This is a custom implementation',
  duration: 0,
  dismissible: true,
  onDismiss: () => console.log('Custom toast dismissed')
});

// Mount to custom container
const container = document.getElementById('custom-container')!;
customToast.mount(container);

// Manually dismiss
customToast.dismiss();
```

## API Reference

### `toast` Object

Convenience methods for showing toasts:

```typescript
toast.success(title: string, description?: string, options?: Partial<ToastProps>): string
toast.error(title: string, description?: string, options?: Partial<ToastProps>): string
toast.warning(title: string, description?: string, options?: Partial<ToastProps>): string
toast.info(title: string, description?: string, options?: Partial<ToastProps>): string
toast.dismiss(id: string): void
toast.dismissAll(): void
```

### `ToastProps`

```typescript
interface ToastProps {
  variant: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;      // ms, 0 for persistent, default 5000
  dismissible?: boolean;  // default true
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}
```

### `ToastManager`

```typescript
class ToastManager {
  static getInstance(config?: ToastManagerConfig): ToastManager
  show(props: ToastProps): string
  dismiss(id: string): void
  dismissAll(): void
  getActiveCount(): number
  isActive(id: string): boolean
  updateConfig(config: Partial<ToastManagerConfig>): void
  destroy(): void
}
```

### `ToastManagerConfig`

```typescript
interface ToastManagerConfig {
  maxToasts?: number;     // default: 5
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; // default: 'bottom-right'
  gap?: number;           // pixels, default: 12
}
```

## Accessibility

The Toast component follows WCAG 2.1 Level AA guidelines:

- **ARIA Roles**: `role="alert"` for errors/warnings, `role="status"` for success/info
- **Live Regions**: `aria-live="assertive"` for urgent, `aria-live="polite"` for informational
- **Atomic Updates**: `aria-atomic="true"` ensures full message is read
- **Keyboard Support**: Dismiss button is keyboard accessible
- **Focus Management**: Timer pauses on focus for sufficient reading time
- **Color Contrast**: All variants meet WCAG AA contrast requirements
- **Reduced Motion**: Respects `prefers-reduced-motion` setting

### Minimum Duration

For accessibility, toasts auto-dismiss after a minimum of 5 seconds (default) to ensure users have time to read the content. This can be customized, but consider:

- Simple messages: 3-5 seconds
- Messages with descriptions: 5-7 seconds
- Messages with actions: No auto-dismiss (duration: 0)

## Styling

The component uses Web Clipper design tokens for consistency:

### CSS Variables

```css
/* Spacing */
--wc-space-*: Padding, gaps, positioning

/* Colors */
--wc-success-*: Success variant colors
--wc-error-*: Error variant colors
--wc-warning-*: Warning variant colors
--wc-primary-*: Info variant colors

/* Shadows */
--wc-shadow-lg: Toast elevation

/* Animation */
--wc-duration-*: Transition durations
--wc-ease-*: Easing functions
```

### Dark Mode

Dark mode is automatically applied based on `prefers-color-scheme: dark`. All variants adjust their colors for optimal contrast in dark environments.

## Best Practices

### When to Use

Use toasts for:
- Confirmation of user actions (save, delete, etc.)
- Non-critical errors that don't block workflow
- Background process completion
- System notifications

### When NOT to Use

Avoid toasts for:
- Critical errors requiring immediate action (use modals)
- Long-form content (use dedicated pages)
- Permanent information (use banners)
- Frequent updates (causes notification fatigue)

### Guidelines

1. **Keep it Brief**: Titles should be 1-5 words, descriptions 1-2 sentences
2. **Be Specific**: "Clip saved" is better than "Success"
3. **Use Actions Wisely**: Only for immediate, relevant actions
4. **Limit Frequency**: Don't overwhelm users with too many toasts
5. **Choose Right Variant**:
   - Success: Completed actions
   - Error: Failed operations
   - Warning: Potential issues or cautions
   - Info: Neutral information or tips

### Example Scenarios

```typescript
// Good: Specific and actionable
toast.success('Clip saved to "Work" folder', undefined, {
  action: { label: 'View', onClick: openFolder }
});

// Bad: Too vague
toast.success('Success');

// Good: Clear error with recovery
toast.error('Failed to upload image', 'Check your internet connection', {
  action: { label: 'Retry', onClick: retryUpload }
});

// Bad: Technical jargon
toast.error('ERR_NETWORK_TIMEOUT_500');

// Good: Persistent for ongoing process
const uploadId = toast.info('Uploading 5 files...', undefined, {
  duration: 0,
  dismissible: false
});

// Dismiss when complete
uploadComplete.then(() => {
  toast.dismiss(uploadId);
  toast.success('Upload complete');
});
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Testing

```typescript
import { toast, toastManager } from './components/Toast';

describe('Toast', () => {
  beforeEach(() => {
    toastManager.dismissAll();
  });

  it('shows success toast', () => {
    const id = toast.success('Test');
    expect(toastManager.isActive(id)).toBe(true);
  });

  it('auto-dismisses after duration', async () => {
    const id = toast.info('Test', undefined, { duration: 100 });
    expect(toastManager.isActive(id)).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(toastManager.isActive(id)).toBe(false);
  });

  it('respects max toasts limit', () => {
    for (let i = 0; i < 10; i++) {
      toast.info(`Toast ${i}`);
    }
    expect(toastManager.getActiveCount()).toBe(5);
  });
});
```

## Contributing

When adding new features or variants:
1. Ensure accessibility compliance
2. Add corresponding tests
3. Update this documentation
4. Test in both light and dark modes
5. Verify reduced motion support
