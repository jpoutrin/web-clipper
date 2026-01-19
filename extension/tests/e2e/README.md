# Web Clipper E2E and Accessibility Tests

Comprehensive end-to-end and accessibility testing suite for the Web Clipper UI component library using Playwright and axe-core.

## Overview

This test suite ensures WCAG 2.1 Level AA compliance and proper functionality for all UI components:

- **Button** - Interactive buttons with multiple variants and states
- **Dialog** - Modal dialogs with focus trap and keyboard navigation
- **ProgressBar** - Linear and phased progress indicators
- **Toast** - Notification toasts with proper ARIA live regions
- **FloatingToolbar** - Floating toolbar with arrow key navigation

## Prerequisites

```bash
npm install
```

This installs:
- `@playwright/test` - Test framework
- `@axe-core/playwright` - Accessibility testing engine

## Running Tests

### Run All Accessibility Tests

```bash
npm run test:a11y
```

### Run Specific Component Tests

```bash
# Button accessibility tests
npx playwright test accessibility/button.a11y.spec.ts

# Dialog accessibility tests
npx playwright test accessibility/dialog.a11y.spec.ts

# Progress Bar accessibility tests
npx playwright test accessibility/progress-bar.a11y.spec.ts

# Toast accessibility tests
npx playwright test accessibility/toast.a11y.spec.ts

# Toolbar accessibility tests
npx playwright test accessibility/toolbar.a11y.spec.ts
```

### Run Tests in UI Mode (Interactive)

```bash
npm run test:e2e:ui
```

### Run Tests in Specific Browser

```bash
# Chromium (default)
npx playwright test --project=accessibility

# Dark mode testing
npx playwright test --project=accessibility-dark

# Firefox
npx playwright test --project=firefox-a11y

# WebKit (Safari)
npx playwright test --project=webkit-a11y

# Mobile
npx playwright test --project=mobile-a11y
```

### Run Tests in Headed Mode

```bash
npx playwright test --headed
```

### Debug Tests

```bash
npx playwright test --debug
```

## Test Structure

```
tests/e2e/
├── accessibility/              # Accessibility test specs
│   ├── button.a11y.spec.ts
│   ├── dialog.a11y.spec.ts
│   ├── progress-bar.a11y.spec.ts
│   ├── toast.a11y.spec.ts
│   └── toolbar.a11y.spec.ts
├── fixtures/                   # Reusable test fixtures
│   └── a11y.fixture.ts        # Accessibility testing utilities
└── README.md                   # This file
```

## What We Test

### Automated Accessibility Scans

- **axe-core** violations detection
- WCAG 2.1 Level A and AA compliance
- Color contrast ratios (4.5:1 for normal text, 3:1 for large)
- Touch target sizes (minimum 44x44px)

### Keyboard Navigation

- Tab order and focus management
- Arrow key navigation (toolbar)
- Home/End key support
- Enter/Space key activation
- Escape key for dismissal

### ARIA Attributes

- Proper role assignment (`button`, `dialog`, `progressbar`, `alert`, `status`, `toolbar`)
- `aria-label`, `aria-labelledby`, `aria-describedby`
- `aria-modal`, `aria-live`, `aria-atomic`
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax` (progress)
- `aria-disabled`, `aria-busy`

### Focus Management

- Focus trap in dialogs
- Focus return after dialog close
- Visible focus indicators
- Focus-visible support

### Screen Reader Compatibility

- Live region announcements
- Assertive vs polite announcements
- Atomic announcements
- Hidden decorative elements (`aria-hidden`)

### Responsive Behavior

- Mobile touch targets
- Viewport positioning
- Dark mode support
- High contrast mode
- Reduced motion preferences

## Test Fixtures

### `a11y.fixture.ts`

Provides reusable accessibility testing utilities:

#### `makeAxeBuilder()`

Creates a configured AxeBuilder instance with WCAG 2.1 AA tags:

```typescript
const results = await makeAxeBuilder().analyze();
expect(results.violations).toEqual([]);
```

#### `runA11yScan(selector?)`

Runs a full accessibility scan on the page or specific element:

```typescript
const results = await runA11yScan('[role="dialog"]');
expect(results.violations).toEqual([]);
```

#### `testKeyboardNav()`

Tests keyboard navigation through all focusable elements:

```typescript
const focusedElements = await testKeyboardNav();
expect(focusedElements.length).toBeGreaterThan(0);
```

#### `testFocusVisible()`

Verifies all interactive elements have visible focus indicators:

```typescript
await testFocusVisible();
// Throws if any element lacks focus indicator
```

#### `getAriaLiveAnnouncements()`

Captures ARIA live region announcements:

```typescript
const announcements = await getAriaLiveAnnouncements();
expect(announcements).toContain('Loading complete');
```

## Component Test Requirements

### Button

- ✅ All variants have no axe violations
- ✅ Icon-only buttons have `aria-label`
- ✅ Disabled buttons have `aria-disabled`
- ✅ Loading buttons have `aria-busy`
- ✅ Focus indicators visible
- ✅ Color contrast meets WCAG AA
- ✅ Touch targets ≥ 44x44px

### Dialog

- ✅ Modal has `role="dialog"` or `role="alertdialog"`
- ✅ Has `aria-modal="true"`
- ✅ Has `aria-labelledby` pointing to title
- ✅ Has `aria-describedby` when description present
- ✅ Focus trapped within dialog
- ✅ Escape closes dismissible dialogs
- ✅ Focus returns to trigger on close
- ✅ Tab cycles through dialog elements only

### ProgressBar

- ✅ Has `role="progressbar"`
- ✅ Has `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- ✅ Has descriptive `aria-label`
- ✅ Progress updates announced via live region
- ✅ Phase status changes announced
- ✅ Visual progress matches ARIA values

### Toast

- ✅ Error/warning use `role="alert"` with `aria-live="assertive"`
- ✅ Success/info use `role="status"` with `aria-live="polite"`
- ✅ Has `aria-atomic="true"`
- ✅ Dismiss button has `aria-label`
- ✅ Keyboard accessible
- ✅ Hover/focus pauses auto-dismiss
- ✅ Icon has `aria-hidden="true"`

### Toolbar

- ✅ Has `role="toolbar"`
- ✅ Has `aria-label`
- ✅ Has `aria-orientation="horizontal"`
- ✅ Arrow keys navigate between buttons
- ✅ Home/End keys navigate to first/last
- ✅ All buttons have `aria-label`
- ✅ Separators have `role="separator"`
- ✅ Roving tabindex (only one `tabindex="0"`)

## Continuous Integration

Tests run automatically in CI with the following configuration:

- **Retries**: 2 (for flaky test resilience)
- **Workers**: 1 (sequential execution in CI)
- **Artifacts**: Screenshots and videos on failure
- **Reports**: HTML and JSON test reports

## Best Practices

### 1. Always Test with Multiple Browsers

```bash
npx playwright test --project=accessibility --project=firefox-a11y
```

### 2. Test Both Light and Dark Modes

```bash
npx playwright test --project=accessibility --project=accessibility-dark
```

### 3. Test with Reduced Motion

Tests automatically check `prefers-reduced-motion` media query.

### 4. Test Mobile Viewports

```bash
npx playwright test --project=mobile-a11y
```

### 5. Review Axe Violations Carefully

When tests fail, check the HTML output for detailed violation information:

```bash
npx playwright show-report
```

## Documentation Research

This test suite follows the latest best practices from:

- [Playwright Accessibility Testing](https://playwright.dev/docs/accessibility-testing) - Official Playwright documentation
- [Realistic Guide to Accessibility Testing with Axe Core and Playwright](https://medium.com/@pothiwalapranav/realistic-guide-to-accessibility-testing-with-axe-core-and-playwright-1bda5d59b1c8) - Comprehensive testing patterns
- [Achieving WCAG Standard with Playwright Accessibility Tests](https://medium.com/@merisstupar11/achieving-wcag-standard-with-playwright-accessibility-tests-f634b6f9e51d) - WCAG 2.1 compliance strategies
- [How We Automate Accessibility Testing with Playwright and Axe](https://dev.to/subito/how-we-automate-accessibility-testing-with-playwright-and-axe-3ok5) - Real-world implementation examples

## Troubleshooting

### Tests Fail with "No axe-core found"

Make sure `@axe-core/playwright` is installed:

```bash
npm install -D @axe-core/playwright
```

### Tests Timeout

Increase timeout in `playwright.config.ts`:

```typescript
timeout: 60 * 1000, // 60 seconds
```

### Can't Find Test Server

Ensure the test server is running. The config automatically starts a server on port 3000.

### Color Contrast Failures

Check CSS custom properties in design tokens. Ensure:
- Normal text: ≥ 4.5:1 contrast ratio
- Large text (≥18pt or ≥14pt bold): ≥ 3:1 contrast ratio

## Contributing

When adding new components:

1. Create a new test file: `[component].a11y.spec.ts`
2. Use the `a11y.fixture.ts` utilities
3. Test all WCAG 2.1 AA requirements
4. Include keyboard navigation tests
5. Test ARIA attributes
6. Verify screen reader announcements
7. Test responsive behavior
8. Add documentation here

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [Playwright Test Documentation](https://playwright.dev/docs/intro)
