# TS-0007: Shared UI Component Library - Implementation Tasks

Source: tech-specs/draft/TS-0007-shared-ui-component-library.md
Generated: 2026-01-17
Total Tasks: 42
Completed: 42

---

## Tasks

### Phase 1: Foundation Setup

- [x] 1.0 Project Structure Setup
  - [x] 1.1 Create `extension/src/ui/` directory structure per spec section 5
  - [x] 1.2 Set up `tokens/`, `components/`, and `utils/` subdirectories
  - [x] 1.3 Configure webpack for CSS and TypeScript bundling of UI library
  - [x] 1.4 Add build scripts for component library (separate from main extension build)

### Phase 2: Design Tokens

- [x] 2.0 Implement Design Tokens
  - [x] 2.1 Create `tokens/colors.css` with color palette and semantic aliases (section 2.1)
  - [x] 2.2 Create `tokens/typography.css` with font families, sizes, weights (section 2.2)
  - [x] 2.3 Create `tokens/spacing.css` with spacing scale (section 2.3)
  - [x] 2.4 Create `tokens/shadows.css` with shadow tokens and dark mode variants (section 2.5)
  - [x] 2.5 Create `tokens/animations.css` with duration, easing, and reduced motion support (section 2.6)
  - [x] 2.6 Add border radius tokens (section 2.4)
  - [x] 2.7 Add z-index scale (section 2.7)
  - [x] 2.8 Create `tokens/index.css` that combines all token files
  - [x] 2.9 Add dark mode overrides for all applicable tokens

### Phase 3: Utility Functions

- [x] 3.0 Implement Utility Functions
  - [x] 3.1 Create `utils/shadow-dom.ts` with `createIsolatedComponent()` and `injectTokens()` (section 6.1, 6.2)
  - [x] 3.2 Create `utils/focus-trap.ts` for dialog focus trapping
  - [x] 3.3 Create `utils/position.ts` with toolbar positioning logic (section 3.5)
  - [x] 3.4 Create `utils/keyboard.ts` for keyboard navigation helpers
  - [x] 3.5 Add `shouldAnimate()` and theme detection utilities (section 6.4, 6.5)

### Phase 4: Core Components

- [x] 4.0 Implement Button Component (section 3.1)
  - [x] 4.1 Create `components/Button/Button.ts` with all variants (primary, secondary, ghost, danger)
  - [x] 4.2 Create `components/Button/Button.css` with all sizes (sm, md, lg)
  - [x] 4.3 Add icon support (left/right position, icon-only mode)
  - [x] 4.4 Add loading state with spinner animation
  - [x] 4.5 Ensure accessibility: focus visible, aria-label for icon-only, aria-disabled

- [x] 5.0 Implement Progress Bar Component (section 3.2)
  - [x] 5.1 Create `components/ProgressBar/ProgressBar.ts` for linear variant
  - [x] 5.2 Add phased variant with segment indicators
  - [x] 5.3 Create `components/ProgressBar/ProgressBar.css` with sizes and animations
  - [x] 5.4 Add shimmer animation for indeterminate state
  - [x] 5.5 Ensure accessibility: role="progressbar", aria-valuenow/min/max

- [x] 6.0 Implement Dialog Component (section 3.3)
  - [x] 6.1 Create `components/Dialog/Dialog.ts` with all variants
  - [x] 6.2 Create `components/Dialog/Dialog.css` with backdrop and animations
  - [x] 6.3 Add icon support per variant (default, warning, error, success)
  - [x] 6.4 Implement focus trapping and escape key dismiss
  - [x] 6.5 Ensure accessibility: role="dialog", aria-modal, labelledby/describedby

- [x] 7.0 Implement Overlay Component (section 3.4)
  - [x] 7.1 Create `components/Overlay/Overlay.ts` for fullscreen variant
  - [x] 7.2 Create `components/Overlay/HighlightOverlay.ts` for element highlighting
  - [x] 7.3 Create `components/Overlay/SelectionOverlay.ts` with canvas-based selection
  - [x] 7.4 Add resize handles and selection rectangle drawing
  - [x] 7.5 Create `components/Overlay/Overlay.css` with animations

- [x] 8.0 Implement Floating Toolbar Component (section 3.5)
  - [x] 8.1 Create `components/FloatingToolbar/FloatingToolbar.ts`
  - [x] 8.2 Create `components/FloatingToolbar/FloatingToolbar.css` with positioning arrow
  - [x] 8.3 Implement auto-positioning logic (top/bottom based on viewport)
  - [x] 8.4 Add action buttons with separator support
  - [x] 8.5 Ensure accessibility: role="toolbar", arrow key navigation

- [x] 9.0 Implement Badge Component (section 3.6)
  - [x] 9.1 Create `components/Badge/Badge.ts` with all variants
  - [x] 9.2 Create `components/Badge/Badge.css` with sizes
  - [x] 9.3 Add icon and removable (close button) support

- [x] 10.0 Implement Toast Component (section 3.7)
  - [x] 10.1 Create `components/Toast/Toast.ts` with all variants
  - [x] 10.2 Create `components/Toast/ToastManager.ts` for managing multiple toasts
  - [x] 10.3 Create `components/Toast/Toast.css` with enter/exit animations
  - [x] 10.4 Add timed auto-dismiss with progress bar
  - [x] 10.5 Implement pause on hover/focus
  - [x] 10.6 Ensure accessibility: role="alert" or "status", aria-live

- [x] 11.0 Implement Spinner Component (section 3.8)
  - [x] 11.1 Create `components/Spinner/Spinner.ts` with all sizes
  - [x] 11.2 Create `components/Spinner/Spinner.css` with spin animation
  - [x] 11.3 Add reduced motion support (static indicator)

- [x] 12.0 Implement Screen Reader Announcer (section 3.9)
  - [x] 12.1 Create `components/ScreenReaderAnnouncer/ScreenReaderAnnouncer.ts`
  - [x] 12.2 Add polite and assertive announcement regions
  - [x] 12.3 Add `.wc-sr-only` visually hidden utility class

### Phase 5: CSS Reset and Shared Styles

- [x] 13.0 Create CSS Reset (Appendix B)
  - [x] 13.1 Create Shadow DOM CSS reset for box-sizing, margins, focus styles
  - [x] 13.2 Ensure reset is automatically included in all Shadow DOM components

### Phase 6: Testing (Playwright)

- [x] 14.0 Playwright Component Tests
  - [x] 14.1 Create playwright.config.ts with multi-browser support
  - [x] 14.2 Create test fixtures and HTML harness
  - [x] 14.3 Write tests for Button (all variants, sizes, states, events)
  - [x] 14.4 Write tests for Progress Bar (linear, phased, value updates)
  - [x] 14.5 Write tests for Dialog (open/close, focus trap, escape key)
  - [x] 14.6 Write tests for Toast (show/dismiss, auto-dismiss, pause)
  - [x] 14.7 Write tests for Spinner (sizes, reduced motion)

- [x] 15.0 Playwright Accessibility Tests
  - [x] 15.1 Set up axe-core integration with @axe-core/playwright
  - [x] 15.2 Create a11y fixtures with reusable utilities
  - [x] 15.3 Write button.a11y.spec.ts (WCAG 2.1 AA compliance)
  - [x] 15.4 Write dialog.a11y.spec.ts (focus trap, ARIA attributes)
  - [x] 15.5 Write progress-bar.a11y.spec.ts (role, aria-valuenow)
  - [x] 15.6 Write toast.a11y.spec.ts (live regions, roles)
  - [x] 15.7 Write toolbar.a11y.spec.ts (keyboard navigation)

- [x] 16.0 Playwright Visual Regression Tests
  - [x] 16.1 Configure visual test projects (light/dark mode)
  - [x] 16.2 Create component-showcase.html fixture
  - [x] 16.3 Write button.visual.spec.ts (all variants, states)
  - [x] 16.4 Write progress-bar.visual.spec.ts (linear, phased)
  - [x] 16.5 Write dialog.visual.spec.ts (all variants)
  - [x] 16.6 Write badge.visual.spec.ts (all variants, sizes)
  - [x] 16.7 Write toast.visual.spec.ts (all variants)
  - [x] 16.8 Write spinner.visual.spec.ts (all sizes)

### Phase 7: Documentation and Export

- [x] 17.0 Create Public API
  - [x] 17.1 Create `ui/index.ts` with all public exports
  - [x] 17.2 Export types/interfaces for component props
  - [x] 17.3 Document usage examples in code comments

---

## Acceptance Criteria Checklist

### Functional (Section 8.1)
- [x] All components render correctly in Chrome 120+
- [x] Components work inside Shadow DOM
- [x] Dark mode automatically applies
- [x] Reduced motion respected
- [x] All interactive elements keyboard accessible
- [x] Focus visible on all focusable elements

### Accessibility (Section 8.2)
- [x] WCAG 2.1 AA color contrast (4.5:1 text, 3:1 UI)
- [x] All images/icons have alt text or aria-label
- [x] Screen reader announcements work
- [x] Focus trap works in dialogs
- [x] No keyboard traps

### Performance (Section 8.3)
- [x] Total CSS < 20KB (minified, uncompressed)
- [x] Total JS < 30KB (minified, uncompressed)
- [x] No layout thrashing in animations
- [x] Lazy-loadable per component

---

## Dependencies

- None for runtime (vanilla TypeScript)
- TypeScript 5.0+ (dev)
- Playwright for E2E/visual/a11y tests (dev)
- @axe-core/playwright for accessibility testing (dev)
- serve for test fixtures (dev)

---

## Implementation Summary

**Completed:** 2026-01-17

### Components Created (9)
| Component | Files | Features |
|-----------|-------|----------|
| Button | Button.ts, Button.css | 4 variants, 3 sizes, loading, icon support |
| ProgressBar | ProgressBar.ts, ProgressBar.css | Linear & phased variants, shimmer animation |
| Dialog | Dialog.ts, Dialog.css | 4 variants, focus trap, backdrop |
| Overlay | Overlay.ts, HighlightOverlay.ts, SelectionOverlay.ts | Fullscreen, highlight, canvas selection |
| FloatingToolbar | FloatingToolbar.ts, FloatingToolbar.css | Auto-positioning, arrow keys |
| Badge | Badge.ts, Badge.css | 5 variants, 2 sizes, removable |
| Toast | Toast.ts, ToastManager.ts, Toast.css | 4 variants, auto-dismiss, stacking |
| Spinner | Spinner.ts, Spinner.css | 3 sizes, reduced motion |
| ScreenReaderAnnouncer | ScreenReaderAnnouncer.ts | Polite/assertive regions |

### Design Tokens
- colors.css, typography.css, spacing.css, shadows.css, animations.css, layout.css
- Full dark mode support via `prefers-color-scheme`
- Reduced motion support via `prefers-reduced-motion`

### Utilities
- shadow-dom.ts (Shadow DOM creation and style injection)
- focus-trap.ts (Dialog focus management)
- position.ts (Floating element positioning)
- keyboard.ts (Arrow key navigation)
- theme.ts (Theme detection and animation preferences)

### Testing
- **Playwright Component Tests**: 5 test files covering core interactions
- **Playwright A11y Tests**: 5 test files with axe-core integration
- **Playwright Visual Tests**: 6 test files for light/dark mode screenshots

### Public API
- All components exported from `ui/index.ts`
- Full TypeScript type exports
- JSDoc documentation
