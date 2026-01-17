# Accessibility Testing Guide for Web Clipper

## 📚 Documentation Research Summary

This accessibility testing implementation follows current best practices from official Playwright documentation and industry experts (2025-2026 standards).

### Key Documentation Sources

1. **[Playwright Official: Accessibility Testing](https://playwright.dev/docs/accessibility-testing)**
   - Official integration guide for @axe-core/playwright
   - WCAG 2.1 AA tag configuration
   - Best practices for automated accessibility checks

2. **[Realistic Guide to Accessibility Testing with Axe Core and Playwright](https://medium.com/@pothiwalapranav/realistic-guide-to-accessibility-testing-with-axe-core-and-playwright-1bda5d59b1c8)**
   - Practical patterns for real-world applications
   - Excluding third-party elements
   - Timing considerations for dynamic content

3. **[Achieving WCAG Standard with Playwright Accessibility Tests](https://medium.com/@merisstupar11/achieving-wcag-standard-with-playwright-accessibility-tests-f634b6f9e51d)**
   - WCAG 2.1 Level AA compliance strategies
   - Test coverage best practices
   - CI/CD integration patterns

4. **[How We Automate Accessibility Testing](https://dev.to/subito/how-we-automate-accessibility-testing-with-playwright-and-axe-3ok5)**
   - Reusable fixture patterns
   - Screenshot capture for violations
   - Team collaboration workflows

## ✅ CURRENT BEST PRACTICES (2026)

### 1. Use @axe-core/playwright with WCAG 2.1 Tags

```typescript
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  .analyze();
```

**Why:** Targets WCAG 2.1 Level A and AA standards, which are the current accessibility requirements.

### 2. Create Reusable Fixtures

```typescript
export const test = base.extend<A11yFixtures>({
  makeAxeBuilder: async ({ page }, use) => {
    const makeAxeBuilder = () =>
      new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
    await use(makeAxeBuilder);
  },
});
```

**Why:** Consistent configuration across all tests, reduces duplication, easier maintenance.

### 3. Exclude Third-Party Elements

```typescript
.exclude('#webpack-dev-server-client-overlay')
.exclude('[data-third-party]')
```

**Why:** Avoids false positives from elements outside your control.

### 4. Test After Full Render

```typescript
await page.waitForLoadState('networkidle');
await page.waitForSelector('[role="dialog"]', { state: 'visible' });
```

**Why:** Ensures dynamic content is fully loaded before scanning.

### 5. Combine Automated and Manual Testing

**Automated (axe-core):**
- Detects ~30-50% of accessibility issues
- Fast and reliable
- Catches common violations

**Manual Testing:**
- Keyboard navigation flows
- Screen reader announcements
- Focus management
- Context-specific issues

**Why:** Automated tools cannot catch all accessibility problems. Manual testing is essential.

## ⚠️ DEPRECATED PATTERNS (Avoid These)

### ❌ Don't: Use Old axe-playwright Package

```typescript
// DEPRECATED
import { injectAxe, checkA11y } from 'axe-playwright';
```

**Instead:** Use `@axe-core/playwright`:

```typescript
import AxeBuilder from '@axe-core/playwright';
```

### ❌ Don't: Test Without WCAG Tags

```typescript
// INCOMPLETE
await new AxeBuilder({ page }).analyze();
```

**Instead:** Always specify WCAG level:

```typescript
await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  .analyze();
```

### ❌ Don't: Ignore Test Timing

```typescript
// FLAKY - Content may not be loaded
await page.goto('/');
const results = await axeBuilder.analyze();
```

**Instead:** Wait for content:

```typescript
await page.goto('/');
await page.waitForLoadState('networkidle');
const results = await axeBuilder.analyze();
```

### ❌ Don't: Test Only in One Browser

```typescript
// INCOMPLETE
npx playwright test --project=chromium
```

**Instead:** Test cross-browser:

```typescript
npx playwright test --project=accessibility --project=firefox-a11y --project=webkit-a11y
```

## 🎯 Component-Specific Accessibility Requirements

### Button Component

**WCAG Requirements:**
- **1.3.1 Info and Relationships:** Semantic `<button>` element
- **1.4.3 Contrast:** 3:1 minimum for large text
- **2.1.1 Keyboard:** Operable via Enter/Space
- **2.4.7 Focus Visible:** Clear focus indicator
- **2.5.5 Target Size:** Minimum 44x44px
- **4.1.2 Name, Role, Value:** Accessible name for icon-only buttons

**Implementation:**
```typescript
test('icon-only button requires aria-label', async ({ page }) => {
  const button = page.locator('[data-testid="button-icon-only"]');
  const ariaLabel = await button.getAttribute('aria-label');
  expect(ariaLabel).toBeTruthy();
});
```

### Dialog Component

**WCAG Requirements:**
- **1.3.1 Info and Relationships:** `role="dialog"` or `role="alertdialog"`
- **2.1.2 No Keyboard Trap:** Focus trap with Escape exit
- **2.4.3 Focus Order:** Logical tab order
- **4.1.2 Name, Role, Value:** `aria-modal`, `aria-labelledby`, `aria-describedby`

**Implementation:**
```typescript
test('focus trap works correctly', async ({ page }) => {
  await page.click('[data-testid="open-dialog"]');

  // Tab through all elements
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    const isInDialog = await page.evaluate(() =>
      !!document.activeElement?.closest('[role="dialog"]')
    );
    expect(isInDialog).toBe(true);
  }
});
```

### Progress Bar Component

**WCAG Requirements:**
- **1.3.1 Info and Relationships:** `role="progressbar"`
- **4.1.2 Name, Role, Value:** `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`
- **4.1.3 Status Messages:** Live region for updates

**Implementation:**
```typescript
test('progress updates are announced', async ({ page, getAriaLiveAnnouncements }) => {
  await page.click('[data-testid="increase-progress"]');
  await page.waitForTimeout(200);

  const announcements = await getAriaLiveAnnouncements();
  const hasProgressAnnouncement = announcements.some(
    text => text.includes('%') || text.includes('complete')
  );
  expect(hasProgressAnnouncement).toBe(true);
});
```

### Toast Component

**WCAG Requirements:**
- **1.4.3 Contrast:** Sufficient color contrast
- **2.1.1 Keyboard:** Dismissible via keyboard
- **4.1.3 Status Messages:** `role="alert"` (assertive) or `role="status"` (polite)

**Implementation:**
```typescript
test('error toast uses assertive announcement', async ({ page }) => {
  await page.click('[data-testid="show-error-toast"]');

  const toast = page.locator('.wc-toast--error');
  const role = await toast.getAttribute('role');
  const ariaLive = await toast.getAttribute('aria-live');

  expect(role).toBe('alert');
  expect(ariaLive).toBe('assertive');
});
```

### Toolbar Component

**WCAG Requirements:**
- **1.3.1 Info and Relationships:** `role="toolbar"`, `aria-orientation`
- **2.1.1 Keyboard:** Arrow key navigation, Home/End keys
- **2.4.3 Focus Order:** Roving tabindex pattern
- **4.1.2 Name, Role, Value:** Each button has `aria-label`

**Implementation:**
```typescript
test('arrow keys navigate between buttons', async ({ page }) => {
  await page.click('[data-testid="show-toolbar"]');
  const buttons = page.locator('[role="toolbar"] button');

  await buttons.first().focus();
  await expect(buttons.first()).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await expect(buttons.nth(1)).toBeFocused();
});
```

## 🔍 Testing Methodology

### Automated Scan Coverage (~40-50% of issues)

✅ **Detected by axe-core:**
- Missing alt text
- Missing form labels
- Color contrast failures
- Missing ARIA attributes
- Invalid HTML structure
- Duplicate IDs
- Missing language attribute

❌ **Not Detected by axe-core:**
- Focus order logic
- Keyboard navigation flows
- Screen reader announcement quality
- Context-specific labeling
- Focus trap implementations
- Live region timing

### Manual Testing Coverage (~50-60% of issues)

**Keyboard Navigation Testing:**
```typescript
test('keyboard navigation flows correctly', async ({ page }) => {
  // Tab through all interactive elements
  await page.keyboard.press('Tab');
  const firstFocused = await page.evaluate(() =>
    document.activeElement?.tagName
  );
  expect(firstFocused).toBeTruthy();
});
```

**Screen Reader Testing:**
```typescript
test('status change is announced', async ({ page, getAriaLiveAnnouncements }) => {
  await page.click('[data-testid="trigger-action"]');
  await page.waitForTimeout(200);

  const announcements = await getAriaLiveAnnouncements();
  expect(announcements.length).toBeGreaterThan(0);
});
```

**Focus Management Testing:**
```typescript
test('focus returns after dialog close', async ({ page }) => {
  const trigger = page.locator('[data-testid="open-dialog"]');
  await trigger.click();

  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});
```

## 📊 Accessibility Test Metrics

### Coverage Goals

- **Automated Scans:** 100% of pages/components
- **Keyboard Navigation:** 100% of interactive flows
- **ARIA Attributes:** 100% of dynamic components
- **Screen Reader:** 100% of status changes
- **Color Contrast:** 100% of text elements
- **Touch Targets:** 100% of interactive elements

### Test Execution Strategy

1. **Pre-Commit:** Fast smoke tests (main components)
2. **PR Pipeline:** Full accessibility suite
3. **Nightly:** Extended cross-browser tests
4. **Release:** Full regression with manual audit

## 🛠️ Tools and Utilities

### Custom Fixtures

**`makeAxeBuilder()`**
- Pre-configured with WCAG 2.1 AA tags
- Excludes common third-party elements
- Consistent across all tests

**`runA11yScan(selector?)`**
- Full page or element-specific scan
- Returns violations with detailed info
- Easy assertion: `expect(results.violations).toEqual([])`

**`testKeyboardNav()`**
- Tabs through all focusable elements
- Returns focus order information
- Validates keyboard accessibility

**`testFocusVisible()`**
- Checks all interactive elements
- Validates focus indicator visibility
- Throws on missing indicators

**`getAriaLiveAnnouncements()`**
- Captures live region content
- Tests screen reader announcements
- Validates announcement timing

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: Accessibility Tests
on: [push, pull_request]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run accessibility tests
        run: npm run test:a11y

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

## 📈 Continuous Improvement

### Regular Audits

- **Weekly:** Automated test suite execution
- **Monthly:** Manual accessibility audit
- **Quarterly:** Expert review and user testing
- **Yearly:** Full WCAG conformance assessment

### Monitoring

- Track violation trends over time
- Monitor new component accessibility
- Review user feedback on accessibility
- Stay updated on WCAG guidelines

## 📚 Additional Resources

### Official Standards
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WAI-ARIA Specification](https://www.w3.org/TR/wai-aria-1.2/)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

### Screen Readers
- [NVDA](https://www.nvaccess.org/) (Windows)
- [JAWS](https://www.freedomscientific.com/products/software/jaws/) (Windows)
- [VoiceOver](https://www.apple.com/accessibility/voiceover/) (macOS, iOS)
- [TalkBack](https://support.google.com/accessibility/android/answer/6283677) (Android)

### Learning Resources
- [WebAIM Articles](https://webaim.org/articles/)
- [A11y Project](https://www.a11yproject.com/)
- [Inclusive Components](https://inclusive-components.design/)
- [Deque University](https://dequeuniversity.com/)

---

**Last Updated:** January 2026
**WCAG Version:** 2.1 Level AA
**Playwright Version:** 1.40+
**@axe-core/playwright Version:** 4.8+
