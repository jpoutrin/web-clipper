# Visual Regression Tests - Quick Start Guide

## Setup (First Time)

```bash
cd extension

# Install dependencies
npm install

# Generate baseline screenshots
npm run test:visual
```

This creates baseline images in `tests/e2e/visual/*-snapshots/` directories.

## Daily Usage

### Run All Visual Tests
```bash
npm run test:visual
```

### Run Specific Tests
```bash
# Only light mode
npm run test:visual:light

# Only dark mode
npm run test:visual:dark

# Specific component
npm run test:visual -- button.visual.spec.ts
```

### Interactive Debugging
```bash
# Visual UI mode
npm run test:visual:ui
```

## Making Component Changes

### Workflow
1. Make component changes
2. Run tests: `npm run test:visual`
3. If tests fail:
   - **Intentional change?** Update baselines: `npm run test:visual:update`
   - **Bug?** Fix the component and re-run tests

### Updating Baselines
```bash
# Update all baselines
npm run test:visual:update

# Update specific component
npm run test:visual:update -- button.visual.spec.ts
```

## Viewing Results

### HTML Report
```bash
# After running tests
npx playwright show-report
```

### Visual Diffs
Failed tests generate comparison images:
```
tests/e2e/visual/*-snapshots/
├── component-name-actual.png     # Current
├── component-name-expected.png   # Baseline
└── component-name-diff.png       # Difference
```

## Test Coverage

| Component | Light Mode | Dark Mode | Total Tests |
|-----------|------------|-----------|-------------|
| Button | 19 | 7 | 26 |
| Progress Bar | 15 | 5 | 20 |
| Dialog | 15 | 6 | 21 |
| Badge | 17 | 9 | 26 |
| Toast | 18 | 10 | 28 |
| Spinner | 15 | 7 + 1 | 23 |
| **Total** | **99** | **45** | **144** |

## Common Commands

```bash
# Full test suite
npm run test:visual

# Watch mode (interactive)
npm run test:visual:ui

# Update after design changes
npm run test:visual:update

# View last test report
npx playwright show-report

# Only button tests
npm run test:visual -- button.visual.spec.ts

# Only dark mode tests
npm run test:visual:dark
```

## When Tests Fail

### 1. Review the diff
```bash
npx playwright show-report
```
Click on failed test to see visual comparison.

### 2. Decide action
- **Expected change?** → Update baseline
- **Bug?** → Fix component
- **Flaky?** → Check animations disabled

### 3. Take action
```bash
# If expected
npm run test:visual:update

# If bug, fix component then
npm run test:visual
```

## Tips

### Prevent Flaky Tests
- Always use `animations: 'disabled'`
- Wait for elements: `await page.waitForSelector()`
- Use stable selectors: `[data-testid="..."]`

### Best Practices
- ✅ Update baselines only for intentional changes
- ✅ Review visual diffs in HTML report
- ✅ Test both light and dark modes
- ✅ Commit baseline snapshots to git

### Troubleshooting
- **Tests pass locally but fail in CI?** → Environment differences, increase tolerance
- **Too many pixel differences?** → Check font rendering, increase `maxDiffPixels`
- **Dark mode not working?** → Verify `colorScheme: 'dark'` in config

## File Structure
```
tests/e2e/visual/
├── button.visual.spec.ts          # Button tests
├── progress-bar.visual.spec.ts    # Progress bar tests
├── dialog.visual.spec.ts          # Dialog tests
├── badge.visual.spec.ts           # Badge tests
├── toast.visual.spec.ts           # Toast tests
├── spinner.visual.spec.ts         # Spinner tests
└── *-snapshots/                   # Baseline screenshots
```

## Need Help?

- 📖 [Full README](./README.md) - Comprehensive documentation
- 📊 [Test Summary](./VISUAL_TESTS_SUMMARY.md) - Complete test coverage
- 🌐 [Playwright Docs](https://playwright.dev/docs/test-snapshots) - Official documentation
- 🎯 [Test Fixture](../fixtures/component-showcase.html) - Component renderer

## Quick Reference

| Task | Command |
|------|---------|
| Run all visual tests | `npm run test:visual` |
| Light mode only | `npm run test:visual:light` |
| Dark mode only | `npm run test:visual:dark` |
| Interactive UI | `npm run test:visual:ui` |
| Update baselines | `npm run test:visual:update` |
| View report | `npx playwright show-report` |
| Specific component | `npm run test:visual -- <name>.spec.ts` |

---

**Ready to start?** Run `npm run test:visual` to generate baseline screenshots!
