# Dialog Component

Modal dialog component with variants, actions, and full accessibility support.

## Features

- **Variants**: default, warning, error, success
- **Actions**: Primary and secondary buttons with async support
- **Accessibility**: Full ARIA support, focus trapping, keyboard navigation
- **Dismissible**: Optional ESC key and backdrop click to close
- **Shadow DOM**: Style isolation for use in Chrome extension
- **Dark Mode**: Automatic dark mode support
- **Animations**: Smooth fade-in/scale-in with reduced motion support

## Basic Usage

```typescript
import { Dialog, showDialog } from '@/ui/components/Dialog';

// Simple dialog
const dialog = new Dialog({
  title: 'Welcome',
  description: 'This is a simple dialog.',
  dismissible: true,
});

dialog.open();
```

## With Actions

```typescript
import { showDialog } from '@/ui/components/Dialog';

// Dialog with actions (returns promise)
const confirmed = await showDialog({
  variant: 'warning',
  title: 'Confirm Delete',
  description: 'Are you sure you want to delete this item? This action cannot be undone.',
  dismissible: true,
  primaryAction: {
    label: 'Delete',
    variant: 'danger',
    onClick: async () => {
      await deleteItem();
    },
  },
  secondaryAction: {
    label: 'Cancel',
    variant: 'secondary',
    onClick: () => {
      // Just close the dialog
    },
  },
});

if (confirmed) {
  console.log('User confirmed deletion');
} else {
  console.log('User cancelled');
}
```

## Variants

### Default
```typescript
new Dialog({
  variant: 'default',
  title: 'Information',
  description: 'This is an informational dialog.',
  icon: '<svg>...</svg>',
});
```

### Success
```typescript
new Dialog({
  variant: 'success',
  title: 'Success!',
  description: 'Your changes have been saved.',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M20 6L9 17l-5-5"/>
  </svg>`,
  primaryAction: {
    label: 'OK',
    variant: 'primary',
    onClick: () => {},
  },
});
```

### Warning
```typescript
new Dialog({
  variant: 'warning',
  title: 'Warning',
  description: 'This action may have consequences.',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>`,
});
```

### Error
```typescript
new Dialog({
  variant: 'error',
  title: 'Error',
  description: 'An error occurred while processing your request.',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M6 18L18 6M6 6l12 12"/>
  </svg>`,
  primaryAction: {
    label: 'Retry',
    variant: 'primary',
    onClick: async () => {
      await retryOperation();
    },
  },
});
```

## Async Actions

Actions can be async and the dialog will show a loading state:

```typescript
const dialog = new Dialog({
  title: 'Save Changes',
  description: 'Do you want to save your changes?',
  primaryAction: {
    label: 'Save',
    variant: 'primary',
    onClick: async () => {
      // Button will show "Processing..." during this
      await saveChanges();
      // Dialog closes automatically after successful completion
    },
  },
  secondaryAction: {
    label: 'Discard',
    variant: 'danger',
    onClick: async () => {
      await discardChanges();
    },
  },
});

dialog.open();
```

## Custom Icons

You can provide custom SVG icons:

```typescript
const customIcon = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v6l4 2"/>
  </svg>
`;

new Dialog({
  title: 'Reminder',
  description: 'Don\'t forget to complete your task.',
  icon: customIcon,
  dismissible: true,
});
```

## Callbacks

```typescript
new Dialog({
  title: 'Settings',
  description: 'Configure your preferences.',
  dismissible: true,
  onClose: () => {
    console.log('Dialog was closed');
    // Cleanup or state updates
  },
});
```

## Non-Dismissible Dialog

For critical actions that require user input:

```typescript
new Dialog({
  variant: 'error',
  title: 'Critical Error',
  description: 'A critical error occurred. You must resolve this before continuing.',
  dismissible: false, // No ESC key or backdrop click
  primaryAction: {
    label: 'Resolve',
    variant: 'primary',
    onClick: async () => {
      await resolveError();
    },
  },
});
```

## API Reference

### DialogProps

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `variant` | `'default' \| 'warning' \| 'error' \| 'success'` | `'default'` | Visual variant |
| `title` | `string` | Required | Dialog title |
| `description` | `string` | - | Optional description text |
| `icon` | `string` | - | Optional SVG icon string |
| `primaryAction` | `DialogAction` | - | Primary action button |
| `secondaryAction` | `DialogAction` | - | Secondary action button |
| `dismissible` | `boolean` | `false` | Can be closed with ESC/backdrop |
| `onClose` | `() => void` | - | Callback when dialog closes |

### DialogAction

| Property | Type | Description |
|----------|------|-------------|
| `label` | `string` | Button text |
| `variant` | `'primary' \| 'secondary' \| 'danger'` | Button style |
| `onClick` | `() => void \| Promise<void>` | Click handler (can be async) |

### Dialog Class Methods

| Method | Description |
|--------|-------------|
| `open()` | Open the dialog |
| `close()` | Close the dialog |

### Utility Functions

#### `showDialog(props: DialogProps): Promise<boolean>`

Shows a dialog and returns a promise that resolves to:
- `true` if the primary action was clicked
- `false` if the dialog was dismissed or secondary action was clicked

```typescript
const result = await showDialog({
  title: 'Confirm',
  primaryAction: {
    label: 'Yes',
    variant: 'primary',
    onClick: () => {},
  },
});

if (result) {
  // User clicked primary action
}
```

## Accessibility Features

- **Role**: Uses `dialog` or `alertdialog` (for warnings/errors)
- **ARIA**: Proper `aria-modal`, `aria-labelledby`, `aria-describedby`
- **Focus Trap**: Focus stays within dialog when open
- **Keyboard**: ESC key closes (when dismissible)
- **Focus Restore**: Returns focus to trigger element on close
- **Screen Readers**: All content properly announced

## Browser Support

- Chrome 88+
- Edge 88+
- Firefox 78+
- Safari 14+

Requires Shadow DOM support for style isolation.
