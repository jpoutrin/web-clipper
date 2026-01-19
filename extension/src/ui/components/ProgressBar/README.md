# Progress Bar Component

Accessible progress indicator supporting linear (single bar) and phased (segmented) variants with full ARIA support and dark mode compatibility.

## Features

- **Two Variants**: Linear (single bar) and Phased (segmented with labels)
- **Size Options**: Small (4px), Medium (8px), Large (12px)
- **Animations**: Optional shimmer animation for active states
- **Phase Management**: Track multi-step processes with status updates
- **Accessibility**: Full ARIA support with live region announcements
- **Dark Mode**: Automatic dark mode support
- **Shadow DOM**: Isolated styling with design tokens

## Usage

### Linear Progress Bar

Simple progress bar for single operations:

```typescript
import { createProgressBar } from './components/ProgressBar';

const progress = createProgressBar({
  value: 50,
  variant: 'linear',
  size: 'md',
  showPercentage: true,
  animated: true,
  ariaLabel: 'Upload progress'
});

document.body.appendChild(progress);
```

### Phased Progress Bar

Segmented progress for multi-step operations:

```typescript
import { createProgressBar, type ProgressPhase } from './components/ProgressBar';

const phases: ProgressPhase[] = [
  { id: 'capture', label: 'Capturing', status: 'completed' },
  { id: 'process', label: 'Processing', status: 'active' },
  { id: 'upload', label: 'Uploading', status: 'pending' }
];

const progress = createProgressBar({
  value: 66,
  variant: 'phased',
  phases,
  size: 'md',
  ariaLabel: 'Clip creation progress'
});

document.body.appendChild(progress);
```

### Using the ProgressBar Class

For dynamic updates, use the `ProgressBar` class instance:

```typescript
import { ProgressBar } from './components/ProgressBar';

const progressBar = new ProgressBar({
  value: 0,
  variant: 'phased',
  phases: [
    { id: 'step1', label: 'Step 1', status: 'pending' },
    { id: 'step2', label: 'Step 2', status: 'pending' },
    { id: 'step3', label: 'Step 3', status: 'pending' }
  ],
  size: 'md',
  showPercentage: true,
  ariaLabel: 'Multi-step process'
});

document.body.appendChild(progressBar.getElement());

// Update progress
progressBar.setValue(33);
progressBar.setPhaseStatus('step1', 'completed');
progressBar.setPhaseStatus('step2', 'active');

// Later...
progressBar.setValue(66);
progressBar.setPhaseStatus('step2', 'completed');
progressBar.setPhaseStatus('step3', 'active');

// Finally...
progressBar.setValue(100);
progressBar.setPhaseStatus('step3', 'completed');

// Clean up when done
progressBar.destroy();
```

## API Reference

### ProgressBarProps

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `value` | `number` | - | Current progress value (0-100) |
| `max` | `number` | `100` | Maximum value |
| `variant` | `'linear' \| 'phased'` | - | Visual variant |
| `phases` | `ProgressPhase[]` | - | Phase configurations (required for phased variant) |
| `showLabel` | `boolean` | `false` | Show text label below progress bar |
| `showPercentage` | `boolean` | `false` | Show percentage in label |
| `size` | `'sm' \| 'md' \| 'lg'` | - | Size variant |
| `animated` | `boolean` | `false` | Enable shimmer animation |
| `ariaLabel` | `string` | - | Accessible label describing the operation |

### ProgressPhase

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier for the phase |
| `label` | `string` | Display label for the phase |
| `status` | `'pending' \| 'active' \| 'completed' \| 'error'` | Current status of the phase |

### ProgressBar Methods

#### `setValue(value: number): void`

Updates the progress value.

```typescript
progressBar.setValue(75);
```

#### `setPhaseStatus(id: string, status: ProgressPhase['status']): void`

Updates the status of a specific phase (phased variant only).

```typescript
progressBar.setPhaseStatus('upload', 'completed');
progressBar.setPhaseStatus('process', 'active');
```

#### `getElement(): HTMLElement`

Returns the host element for appending to the DOM.

```typescript
const element = progressBar.getElement();
document.body.appendChild(element);
```

#### `destroy(): void`

Cleans up the component and removes it from the DOM.

```typescript
progressBar.destroy();
```

## Examples

### File Upload Progress

```typescript
const uploadProgress = createProgressBar({
  value: 0,
  variant: 'linear',
  size: 'md',
  showPercentage: true,
  animated: true,
  ariaLabel: 'File upload progress'
});

// Simulate upload progress
let progress = 0;
const interval = setInterval(() => {
  progress += 10;
  uploadProgress.setValue(progress);

  if (progress >= 100) {
    clearInterval(interval);
  }
}, 500);
```

### Multi-Step Form

```typescript
const formProgress = new ProgressBar({
  value: 0,
  variant: 'phased',
  phases: [
    { id: 'personal', label: 'Personal Info', status: 'pending' },
    { id: 'address', label: 'Address', status: 'pending' },
    { id: 'payment', label: 'Payment', status: 'pending' },
    { id: 'review', label: 'Review', status: 'pending' }
  ],
  size: 'lg',
  ariaLabel: 'Form completion progress'
});

// Move to next step
function nextStep(currentStepId: string, nextStepId: string) {
  formProgress.setPhaseStatus(currentStepId, 'completed');
  formProgress.setPhaseStatus(nextStepId, 'active');

  // Update overall progress
  const completedCount = phases.filter(p => p.status === 'completed').length;
  formProgress.setValue((completedCount / phases.length) * 100);
}
```

### Error Handling

```typescript
const processProgress = new ProgressBar({
  value: 50,
  variant: 'phased',
  phases: [
    { id: 'validate', label: 'Validate', status: 'completed' },
    { id: 'process', label: 'Process', status: 'active' },
    { id: 'save', label: 'Save', status: 'pending' }
  ],
  size: 'md',
  ariaLabel: 'Data processing'
});

// Handle error in processing step
try {
  await processData();
  processProgress.setPhaseStatus('process', 'completed');
  processProgress.setPhaseStatus('save', 'active');
} catch (error) {
  processProgress.setPhaseStatus('process', 'error');
}
```

## Accessibility

The Progress Bar component follows WCAG 2.1 Level AA guidelines:

- **ARIA Attributes**: Uses `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-label`
- **Live Regions**: Progress updates are announced to screen readers via `aria-live="polite"`
- **Keyboard Navigation**: Focusable with visible focus indicators
- **Color Contrast**: All color combinations meet WCAG contrast requirements
- **Reduced Motion**: Respects `prefers-reduced-motion` preference

## Styling

The component uses Shadow DOM with CSS custom properties (design tokens) for consistent theming:

- Automatically adapts to light/dark mode via `prefers-color-scheme`
- Respects `prefers-reduced-motion` for animations
- Uses semantic color tokens for phases (primary, success, error)
- Includes shimmer animation for active states

## Size Variants

| Size | Height | Use Case |
|------|--------|----------|
| `sm` | 4px | Compact layouts, minimal UI |
| `md` | 8px | Standard progress indicators |
| `lg` | 12px | Prominent progress displays |

## Phase Status Colors

| Status | Color | Meaning |
|--------|-------|---------|
| `pending` | Gray | Not yet started |
| `active` | Primary (Blue) | Currently in progress |
| `completed` | Success (Green) | Successfully completed |
| `error` | Error (Red) | Failed with error |

## Browser Support

- Chrome 88+ (Manifest V3)
- Modern browsers with Shadow DOM support
- Automatic fallbacks for reduced motion and dark mode
