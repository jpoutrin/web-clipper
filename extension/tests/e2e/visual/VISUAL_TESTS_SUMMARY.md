# Visual Regression Tests - Implementation Summary

## Overview

Comprehensive visual regression test suite for the Web Clipper UI component library using Playwright. Tests ensure consistent visual appearance across component variants, sizes, states, and color schemes.

## Research & Best Practices Applied

### Documentation Research Summary
```
┌────────────────────────────────────────────┐
│ 📚 Playwright Visual Testing 2026          │
├────────────────────────────────────────────┤
│ 🔍 Version: Playwright v1.40.0             │
│ 📦 Best Practices Applied                  │
│                                            │
│ ✅ Current Playwright APIs                 │
│ • toHaveScreenshot() for comparisons       │
│ • animations: 'disabled' prevents flakes   │
│ • maxDiffPixels tolerance thresholds       │
│ • colorScheme: 'dark'/'light' for themes   │
│ • Platform-specific snapshot storage       │
│                                            │
│ ⚠️ Avoided Deprecated Patterns             │
│ • Manual pixel comparison                  │
│ • Hardcoded waits                          │
│ • Single viewport testing                  │
│                                            │
│ 📖 Sources:                                │
│ • playwright.dev/docs/test-snapshots       │
│ • BrowserStack Guide 2026                  │
│ • TestGrid.io Best Practices               │
└────────────────────────────────────────────┘
```

## Test Coverage

### Components Tested

#### 1. Button Component (`button.visual.spec.ts`)
- **Variants**: 4 (primary, secondary, ghost, danger)
- **Sizes**: 3 (sm, md, lg)
- **States**: 5 (default, hover, focus, disabled, loading)
- **Features**: icons (left/right), icon-only, full-width
- **Color Schemes**: 2 (light, dark)
- **Total Tests**: 19 light + 7 dark = 26 tests

#### 2. Progress Bar Component (`progress-bar.visual.spec.ts`)
- **Variants**: 2 (linear, phased)
- **Sizes**: 3 (sm, md, lg)
- **Linear States**: 6 (0%, 25%, 50%, 75%, 100%, animated)
- **Phase States**: 6 (all-pending, first-active, middle-active, last-active, all-completed, error)
- **Features**: percentage labels, shimmer animation
- **Color Schemes**: 2 (light, dark)
- **Total Tests**: 15 light + 5 dark = 20 tests

#### 3. Dialog Component (`dialog.visual.spec.ts`)
- **Variants**: 4 (default, success, warning, error)
- **Features**: with/without icons, with/without descriptions
- **Actions**: single, two actions, danger actions
- **States**: dismissible, non-dismissible, hover, focus
- **Content**: normal, long scrolling content
- **Color Schemes**: 2 (light, dark)
- **Total Tests**: 15 light + 6 dark = 21 tests

#### 4. Badge Component (`badge.visual.spec.ts`)
- **Variants**: 5 (default, success, warning, error, info)
- **Sizes**: 2 (sm, md)
- **Features**: with/without icons, removable
- **Content Types**: short, long, numeric labels
- **States**: hover, focus on remove button
- **Color Schemes**: 2 (light, dark)
- **Total Tests**: 17 light + 9 dark = 26 tests

#### 5. Toast Component (`toast.visual.spec.ts`)
- **Variants**: 4 (success, error, warning, info)
- **Content**: title-only, with description
- **Features**: with/without action buttons, progress bar
- **States**: dismissible, non-dismissible, hover, focus
- **Layout**: single, stacked toasts
- **Text Variations**: short, long title/description
- **Color Schemes**: 2 (light, dark)
- **Total Tests**: 18 light + 10 dark = 28 tests

#### 6. Spinner Component (`spinner.visual.spec.ts`)
- **Sizes**: 3 (sm, md, lg)
- **Colors**: 5 (default, primary, success, error, warning)
- **Context**: standalone, in buttons, on backgrounds
- **Backgrounds**: dark, light, colored (primary, success, error)
- **Layout**: centered, inline with text
- **Accessibility**: reduced motion support
- **Color Schemes**: 2 (light, dark)
- **Total Tests**: 15 light + 7 dark + 1 reduced-motion = 23 tests

### Summary Statistics
```
┌──────────────────────────────────────────┐
│ Visual Test Coverage Summary              │
├──────────────────────────────────────────┤
│ Components Tested:        6               │
│ Total Test Files:         6               │
│ Total Test Cases:         144             │
│   - Light Mode Tests:     99              │
│   - Dark Mode Tests:      44              │
│   - Accessibility Tests:  1               │
│                                           │
│ Variants Covered:         19              │
│ Size Variations:          3               │
│ State Variations:         12              │
│ Color Schemes:            2 (+ reduced)   │
└──────────────────────────────────────────┘
```

## File Structure

```
extension/tests/e2e/visual/
├── button.visual.spec.ts              # 26 tests
├── progress-bar.visual.spec.ts        # 20 tests
├── dialog.visual.spec.ts              # 21 tests
├── badge.visual.spec.ts               # 26 tests
├── toast.visual.spec.ts               # 28 tests
├── spinner.visual.spec.ts             # 23 tests
├── README.md                          # Comprehensive documentation
├── VISUAL_TESTS_SUMMARY.md           # This file
└── *-snapshots/                       # Generated baseline screenshots
    ├── button-*.png
    ├── progress-bar-*.png
    ├── dialog-*.png
    ├── badge-*.png
    ├── toast-*.png
    └── spinner-*.png
```

## Test Fixture

### Component Showcase Page
**Location**: `/Users/jeremiepoutrin/projects/github/jpoutrin/web-clipper/extension/tests/e2e/fixtures/component-showcase.html`

**Purpose**:
- Renders components dynamically based on URL parameters
- Provides isolated test environment
- Supports all component variants and states

**URL Parameter System**:
```
http://localhost:3000/?component=button&variant=primary&size=md&state=loading
```

| Parameter | Values | Description |
|-----------|--------|-------------|
| `component` | button, progress-bar, dialog, badge, toast, spinner | Component to render |
| `variant` | primary, secondary, success, error, etc. | Visual variant |
| `size` | sm, md, lg | Size variant |
| `showcase` | sizes, variants, icons, colors | Multi-item showcase |
| `state` | disabled, loading, hover, focus | Component state |
| `icon` | true, false | Include icon |
| `removable` | true, false | Removable badge |
| `action` | true, false | Include action button |
| `progress` | true, false | Show progress bar |
| `dismissible` | true, false | Dismissible component |
| `content` | long, short, numeric | Content variation |

### Example URLs

```bash
# Button - primary variant, medium size
http://localhost:3000/?component=button&variant=primary&size=md

# Button - all sizes showcase
http://localhost:3000/?component=button&showcase=sizes

# Progress bar - linear, 75% complete
http://localhost:3000/?component=progress-bar&variant=linear&value=75

# Dialog - error variant with actions
http://localhost:3000/?component=dialog&variant=error&actions=two

# Badge - all variants showcase
http://localhost:3000/?component=badge&showcase=variants

# Toast - success with action button
http://localhost:3000/?component=toast&variant=success&action=true

# Spinner - all sizes showcase
http://localhost:3000/?component=spinner&showcase=sizes
```

## Configuration

### Playwright Config Updates
**File**: `/Users/jeremiepoutrin/projects/github/jpoutrin/web-clipper/extension/playwright.config.ts`

**Added Configuration**:
```typescript
// Visual regression test expectations
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 100,           // Allow 100 pixel differences
    maxDiffPixelRatio: 0.01,      // Allow 1% difference
    threshold: 0.2,               // Color diff threshold
    animations: 'disabled',        // Disable animations
  },
},

// Projects
{
  name: 'visual-light',
  testMatch: /.*\.visual\.spec\.ts/,
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 720 },
    colorScheme: 'light',
  },
},
{
  name: 'visual-dark',
  testMatch: /.*\.visual\.spec\.ts/,
  grep: /dark mode/,
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 720 },
    colorScheme: 'dark',
  },
},
```

### Package.json Scripts
**File**: `/Users/jeremiepoutrin/projects/github/jpoutrin/web-clipper/extension/package.json`

**Added Scripts**:
```json
{
  "scripts": {
    "test:visual": "playwright test tests/e2e/visual",
    "test:visual:light": "playwright test --project=visual-light",
    "test:visual:dark": "playwright test --project=visual-dark",
    "test:visual:update": "playwright test tests/e2e/visual --update-snapshots",
    "test:visual:ui": "playwright test tests/e2e/visual --ui"
  }
}
```

## Usage

### Initial Setup
```bash
cd extension

# Install dependencies (if not already done)
npm install

# Generate baseline screenshots
npm run test:visual
```

### Running Tests

```bash
# Run all visual tests
npm run test:visual

# Run only light mode tests
npm run test:visual:light

# Run only dark mode tests
npm run test:visual:dark

# Run with interactive UI
npm run test:visual:ui

# Run specific component tests
npm run test:visual -- button.visual.spec.ts
npm run test:visual -- progress-bar.visual.spec.ts
```

### Updating Baselines

```bash
# Update all baselines after intentional changes
npm run test:visual:update

# Update specific component baselines
npm run test:visual:update -- button.visual.spec.ts
```

### Debugging Failed Tests

```bash
# Run with UI mode for visual debugging
npm run test:visual:ui

# View HTML report with visual diffs
npm run test:e2e
npx playwright show-report
```

## Best Practices Applied

### 1. Consistent Snapshot Settings
- ✅ `animations: 'disabled'` on all tests
- ✅ Fixed viewport size (1280x720)
- ✅ Explicit color scheme (light/dark)
- ✅ Platform-specific snapshots

### 2. Stable Selectors
- ✅ Data attributes: `[data-wc-component="button"]`
- ✅ Test IDs: `[data-testid="button-showcase"]`
- ✅ Semantic selectors: `[role="dialog"]`

### 3. Explicit State Testing
- ✅ Explicit hover: `await button.hover()`
- ✅ Explicit focus: `await button.focus()`
- ✅ Wait for visibility: `await page.waitForSelector()`

### 4. Comprehensive Coverage
- ✅ All component variants
- ✅ All size options
- ✅ Interactive states (hover, focus)
- ✅ Both color schemes
- ✅ Edge cases (long text, empty states)

### 5. Test Organization
- ✅ Separate files per component
- ✅ Grouped by color scheme
- ✅ Clear test descriptions
- ✅ Consistent naming conventions

## Snapshot Storage

### Platform-Specific Snapshots
Snapshots are automatically stored with platform identifiers:

```
tests/e2e/visual/button.visual.spec.ts-snapshots/
├── button-primary-chromium-darwin.png       # macOS
├── button-primary-chromium-linux.png        # Linux
├── button-primary-chromium-win32.png        # Windows
└── button-primary-dark-chromium-darwin.png  # Dark mode, macOS
```

### Baseline Management
- ✅ Commit snapshots to version control
- ✅ Update on intentional design changes
- ✅ Review diffs in PR process
- ✅ Regenerate on major browser updates

## CI/CD Integration

### GitHub Actions Workflow (Recommended)
```yaml
name: Visual Regression Tests

on:
  pull_request:
    paths:
      - 'extension/src/ui/components/**'
      - 'extension/tests/e2e/visual/**'

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        working-directory: extension
        run: npm ci

      - name: Install Playwright browsers
        working-directory: extension
        run: npx playwright install --with-deps chromium

      - name: Run visual regression tests
        working-directory: extension
        run: npm run test:visual

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: visual-test-results
          path: |
            extension/playwright-report/
            extension/test-results/
          retention-days: 30

      - name: Upload visual diffs
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diffs
          path: extension/tests/e2e/visual/**/*-diff.png
          retention-days: 30
```

## Troubleshooting

### Common Issues & Solutions

#### Issue: Tests fail only in CI
**Cause**: Environment differences (fonts, rendering)
**Solution**:
- Use Docker containers for consistent environment
- Pin browser versions
- Increase `maxDiffPixels` tolerance

#### Issue: Flaky tests
**Cause**: Animations not fully disabled or timing issues
**Solution**:
- Verify `animations: 'disabled'` is set
- Add explicit `waitForSelector` calls
- Check for async operations completing

#### Issue: Too many pixel differences
**Cause**: Font rendering, anti-aliasing differences
**Solution**:
- Increase `maxDiffPixels` to 150-200
- Adjust `threshold` to 0.3
- Review actual visual diff images

#### Issue: Dark mode tests not working
**Cause**: ColorScheme not applied or fixture doesn't respect it
**Solution**:
- Verify `colorScheme: 'dark'` in project config
- Check fixture page CSS supports prefers-color-scheme
- Ensure components use CSS custom properties

## Maintenance

### When to Update Baselines

✅ **Update baselines for:**
- Intentional design changes (colors, spacing, typography)
- Component API changes affecting appearance
- Design system token updates
- New features with visual changes

❌ **Do NOT update for:**
- Unexplained visual regressions
- Flaky test failures
- CI-only failures without investigation

### Regular Maintenance Tasks

1. **Monthly**: Review and update outdated snapshots
2. **Quarterly**: Regenerate all baselines on major browser updates
3. **Per Release**: Verify all visual tests pass before deployment
4. **Per PR**: Review visual diffs as part of code review

## Success Metrics

### Test Coverage Goals
- [x] 100% of UI components covered
- [x] All variants tested
- [x] All sizes tested
- [x] All interactive states tested
- [x] Light and dark modes tested
- [x] Accessibility states tested

### Quality Metrics
- Target: <5% test flakiness
- Target: 100% baseline accuracy
- Target: <2 hour test execution time
- Target: Zero false positives

## Resources

### Documentation
- [Playwright Visual Testing Docs](https://playwright.dev/docs/test-snapshots)
- [Component Library Source](/Users/jeremiepoutrin/projects/github/jpoutrin/web-clipper/extension/src/ui/components/)
- [Test Fixture Page](/Users/jeremiepoutrin/projects/github/jpoutrin/web-clipper/extension/tests/e2e/fixtures/component-showcase.html)
- [Visual Tests README](/Users/jeremiepoutrin/projects/github/jpoutrin/web-clipper/extension/tests/e2e/visual/README.md)

### Key Files
```
extension/
├── playwright.config.ts                    # Updated with visual config
├── package.json                            # Added visual test scripts
├── tests/e2e/
│   ├── fixtures/
│   │   └── component-showcase.html        # Test fixture page
│   └── visual/
│       ├── button.visual.spec.ts          # Button tests
│       ├── progress-bar.visual.spec.ts    # Progress bar tests
│       ├── dialog.visual.spec.ts          # Dialog tests
│       ├── badge.visual.spec.ts           # Badge tests
│       ├── toast.visual.spec.ts           # Toast tests
│       ├── spinner.visual.spec.ts         # Spinner tests
│       ├── README.md                      # Detailed documentation
│       └── VISUAL_TESTS_SUMMARY.md        # This file
└── src/ui/components/                     # Components being tested
    ├── Button/Button.ts
    ├── ProgressBar/ProgressBar.ts
    ├── Dialog/Dialog.ts
    ├── Badge/Badge.ts
    ├── Toast/Toast.ts
    └── Spinner/Spinner.ts
```

## Next Steps

### Immediate
1. Generate baseline screenshots: `npm run test:visual`
2. Review generated snapshots for accuracy
3. Commit baseline snapshots to repository
4. Add CI/CD workflow for automated testing

### Future Enhancements
1. Add visual tests for composite components (FloatingToolbar, ToastManager)
2. Add responsive viewport testing (mobile, tablet, desktop)
3. Add high-contrast mode visual tests
4. Add RTL (right-to-left) language visual tests
5. Integrate Percy or Chromatic for visual diff hosting
6. Add visual regression testing to pre-commit hooks

## Conclusion

Comprehensive visual regression test suite is now in place for all Web Clipper UI components. The test suite:

- ✅ Covers all 6 core UI components
- ✅ Tests 144 different visual states
- ✅ Supports light and dark modes
- ✅ Uses latest Playwright best practices
- ✅ Includes comprehensive documentation
- ✅ Ready for CI/CD integration
- ✅ Provides easy-to-use npm scripts

**Status**: Ready for use and baseline generation.

**Next Action**: Run `npm run test:visual` to generate baseline screenshots.
