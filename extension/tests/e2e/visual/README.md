# Visual Regression Tests

This directory contains visual regression tests for the Web Clipper UI component library using Playwright's screenshot comparison capabilities.

## Overview

Visual regression tests ensure that UI components maintain consistent appearance across code changes. These tests capture screenshots and compare them against baseline images to detect unintended visual changes.

## Test Structure

```
visual/
├── button.visual.spec.ts          # Button component tests
├── progress-bar.visual.spec.ts    # Progress bar component tests
├── dialog.visual.spec.ts          # Dialog component tests
├── badge.visual.spec.ts           # Badge component tests
├── toast.visual.spec.ts           # Toast notification tests
├── spinner.visual.spec.ts         # Spinner component tests
└── README.md                      # This file
```

## Components Tested

### Button Component
- **Variants**: primary, secondary, ghost, danger
- **Sizes**: sm, md, lg
- **States**: default, hover, focus, disabled, loading
- **Modifiers**: with icons, icon-only, full-width
- **Themes**: light mode, dark mode

### Progress Bar Component
- **Variants**: linear, phased
- **Sizes**: sm, md, lg
- **States**: 0%, 25%, 50%, 75%, 100%
- **Phase states**: pending, active, completed, error
- **Features**: animated shimmer, percentage labels
- **Themes**: light mode, dark mode

### Dialog Component
- **Variants**: default, success, warning, error
- **Features**: with/without icons, with/without descriptions
- **Actions**: single action, two actions, danger actions
- **States**: dismissible, non-dismissible
- **Interaction**: hover, focus states
- **Themes**: light mode, dark mode

### Badge Component
- **Variants**: default, success, warning, error, info
- **Sizes**: sm, md
- **Features**: with/without icons, removable
- **Content**: short text, long text, numeric
- **States**: hover, focus on remove button
- **Themes**: light mode, dark mode

### Toast Component
- **Variants**: success, error, warning, info
- **Content**: title-only, with description
- **Features**: with/without action buttons, dismissible
- **States**: hover, focus on buttons
- **Layout**: single toasts, stacked toasts
- **Themes**: light mode, dark mode

### Spinner Component
- **Sizes**: sm, md, lg
- **Colors**: primary, success, error, warning, custom
- **Context**: standalone, in buttons, on backgrounds
- **Layout**: centered, inline
- **Accessibility**: reduced motion support
- **Themes**: light mode, dark mode

## Running Tests

### Generate Baseline Screenshots
On first run, generate baseline screenshots:

```bash
npm run test:e2e -- tests/e2e/visual
```

This creates baseline images in `tests/e2e/visual/*-snapshots/` directories.

### Run Visual Regression Tests
Compare current UI against baselines:

```bash
npm run test:e2e -- tests/e2e/visual
```

### Update Baselines
When intentional UI changes are made:

```bash
npm run test:e2e -- tests/e2e/visual --update-snapshots
```

### Run Specific Component Tests
Test a single component:

```bash
npm run test:e2e -- tests/e2e/visual/button.visual.spec.ts
npm run test:e2e -- tests/e2e/visual/progress-bar.visual.spec.ts
```

### Run in UI Mode
Interactive mode for debugging:

```bash
npm run test:e2e:ui -- tests/e2e/visual
```

### Run Only Dark Mode Tests
Test dark mode variants:

```bash
npm run test:e2e -- tests/e2e/visual --grep "dark mode"
```

### Run Only Light Mode Tests
Test light mode variants:

```bash
npm run test:e2e -- tests/e2e/visual --grep -v "dark mode"
```

## Test Fixture

The visual tests use a test fixture page that renders components based on URL parameters:

```
http://localhost:3030/?component=button&variant=primary&size=md
```

### URL Parameters

| Parameter | Description | Example Values |
|-----------|-------------|----------------|
| `component` | Component to render | `button`, `progress-bar`, `dialog`, `badge`, `toast`, `spinner` |
| `variant` | Visual variant | `primary`, `secondary`, `success`, `error`, etc. |
| `size` | Size variant | `sm`, `md`, `lg` |
| `showcase` | Showcase mode | `sizes`, `variants`, `icons`, `colors` |
| `state` | Component state | `disabled`, `loading`, `hover`, `focus` |
| `icon` | Include icon | `true`, `false` |
| `removable` | Removable badge | `true`, `false` |
| `action` | Include action | `true`, `false` |

### Example URLs

```
# Button - primary variant, medium size
/?component=button&variant=primary&size=md

# Button - all sizes showcase
/?component=button&showcase=sizes

# Progress bar - linear, 75% complete
/?component=progress-bar&variant=linear&value=75

# Badge - all variants showcase
/?component=badge&showcase=variants

# Spinner - all colors showcase
/?component=spinner&showcase=colors
```

## Configuration

Visual tests use the following Playwright configuration:

```typescript
{
  animations: 'disabled',      // Disable animations for stable snapshots
  maxDiffPixels: 100,         // Allow up to 100 pixel differences
  fullPage: true,             // Capture full page (for dialogs)
}
```

### Pixel Tolerance

The `maxDiffPixels: 100` setting allows for minor rendering differences across:
- Different operating systems (macOS, Linux, Windows)
- Different browser versions
- Font rendering variations
- Anti-aliasing differences

Adjust this value if tests are too strict or too lenient.

## Best Practices

### 1. Disable Animations
Always use `animations: 'disabled'` to prevent flaky tests from animated elements:

```typescript
await expect(element).toHaveScreenshot('name.png', {
  animations: 'disabled'
});
```

### 2. Wait for Elements
Ensure elements are visible before capturing:

```typescript
await page.waitForSelector('[data-wc-component="button"]');
await expect(showcase).toHaveScreenshot('button.png');
```

### 3. Use Test IDs
Use data-testid attributes for stable selectors:

```typescript
const showcase = page.locator('[data-testid="button-showcase"]');
```

### 4. Test States Explicitly
Explicitly trigger states like hover and focus:

```typescript
const button = page.locator('button');
await button.hover();
await expect(page).toHaveScreenshot('button-hover.png');
```

### 5. Test Both Color Schemes
Always test light and dark modes:

```typescript
test.describe('Component - dark mode', () => {
  test.use({ colorScheme: 'dark' });
  // tests...
});
```

### 6. Mask Dynamic Content
Mask timestamps or dynamic content that changes:

```typescript
await expect(page).toHaveScreenshot('name.png', {
  mask: [page.locator('.timestamp')]
});
```

## Debugging Failed Tests

### View Visual Diff
When tests fail, Playwright generates comparison images:

```
tests/e2e/visual/*-snapshots/
├── button-primary-actual.png        # Current screenshot
├── button-primary-expected.png      # Baseline screenshot
└── button-primary-diff.png          # Visual diff highlighting changes
```

### Review in HTML Report
View detailed comparison in the HTML report:

```bash
npm run test:e2e -- tests/e2e/visual
npx playwright show-report
```

### Common Failure Causes

1. **Font Rendering**: Different OS/browser font rendering
   - Solution: Increase `maxDiffPixels` tolerance

2. **Animation Timing**: Animations not fully settled
   - Solution: Ensure `animations: 'disabled'` is set

3. **Dynamic Content**: Timestamps, random IDs
   - Solution: Use `mask` option to hide dynamic regions

4. **Viewport Size**: Tests run at different viewport sizes
   - Solution: Set explicit viewport in test config

5. **Legitimate Changes**: Intentional UI updates
   - Solution: Update baselines with `--update-snapshots`

## CI/CD Integration

Visual tests run in CI with:
- Consistent environment (Docker containers)
- Retries for flaky tests (configured in playwright.config.ts)
- Screenshot artifacts uploaded on failure

```yaml
# .github/workflows/visual-tests.yml
- name: Run visual regression tests
  run: npm run test:e2e -- tests/e2e/visual

- name: Upload visual diffs
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: visual-test-results
    path: tests/e2e/visual/*-snapshots/*-diff.png
```

## Maintenance

### When to Update Baselines

Update baseline screenshots when:
- ✅ Intentional design changes (colors, spacing, typography)
- ✅ Component API changes affecting appearance
- ✅ Design system token updates
- ✅ New features with visual changes

Do NOT update baselines for:
- ❌ Unexplained visual regressions
- ❌ Flaky test failures (fix the test instead)
- ❌ CI-only failures (investigate environment differences)

### Snapshot Management

Baseline snapshots are stored in:
```
tests/e2e/visual/
├── button.visual.spec.ts-snapshots/
│   ├── button-primary-chromium-darwin.png
│   ├── button-primary-chromium-linux.png
│   └── ...
├── progress-bar.visual.spec.ts-snapshots/
└── ...
```

Platform-specific snapshots ensure consistent comparison across operating systems.

## Resources

- [Playwright Visual Comparison Docs](https://playwright.dev/docs/test-snapshots)
- [Web Clipper Component Library](../../../src/ui/components/)
- [Component Showcase Fixture](../fixtures/component-showcase.html)

## Troubleshooting

### Issue: Tests fail only in CI
**Solution**: Ensure consistent environment. Use Docker containers or pin browser versions.

### Issue: Too many pixel differences
**Solution**: Increase `maxDiffPixels` or investigate font/rendering differences.

### Issue: Tests are flaky
**Solution**:
1. Check animations are disabled
2. Ensure elements are fully loaded
3. Add explicit waits for dynamic content

### Issue: Dark mode tests not working
**Solution**: Verify `colorScheme` is properly configured in test.use().

## Contributing

When adding new visual tests:

1. Create test file in `/tests/e2e/visual/`
2. Follow naming convention: `component-name.visual.spec.ts`
3. Test all variants, sizes, and states
4. Include both light and dark mode tests
5. Use consistent snapshot naming
6. Document any special requirements
7. Update this README with new test coverage

## Questions?

For questions about visual regression testing:
- See [Playwright Documentation](https://playwright.dev)
- Review existing test examples in this directory
- Open an issue in the project repository
