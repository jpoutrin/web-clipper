# TS-0005: Area Screenshot Capture - Implementation Tasks

Source: tech-specs/draft/TS-0005-area-screenshot-capture.md
Generated: 2026-01-17
Total Tasks: 38
Completed: 0

---

## Tasks

### Phase 3a: Foundation

- [ ] 1.0 Add Type Definitions
  - [ ] 1.1 Add `AreaBounds` interface to `src/types/index.ts` (section 2.1)
  - [ ] 1.2 Add `AreaSelectionState` type union (idle, drawing, selected, capturing, complete, cancelled)
  - [ ] 1.3 Add `AreaSelectionEvent` and `AreaScreenshotResult` interfaces
  - [ ] 1.4 Extend `MessageType` with `CAPTURE_AREA_SCREENSHOT`, `AREA_SELECTION_COMPLETE`, `AREA_SELECTION_CANCELLED`
  - [ ] 1.5 Extend `ClipMode` to include `area-screenshot`
  - [ ] 1.6 Add `AreaSelectionConfig` interface with default configuration (section 2.2)

### Phase 3b: Overlay Component

> **Note**: Use shared `SelectionOverlay` component from TS-0007 (`src/ui/components/Overlay/SelectionOverlay.ts`) as the foundation. Adapt to area screenshot requirements.

- [ ] 2.0 Create Area Selection Overlay Integration
  - [ ] 2.1 Create `src/capture/area-selection-overlay.ts` wrapper around SelectionOverlay
  - [ ] 2.2 Configure SelectionOverlay with area screenshot callbacks (onSelectionComplete, onCancel)
  - [ ] 2.3 Add Shadow DOM host with maximum z-index positioning
  - [ ] 2.4 Create floating toolbar with instructions, dimensions, and buttons (section 3.1)

- [ ] 3.0 Implement Toolbar UI
  - [ ] 3.1 Create toolbar HTML structure with instructions, capture, and cancel buttons
  - [ ] 3.2 Add toolbar CSS with light/dark mode support (section 3.1 styles)
  - [ ] 3.3 Add keyboard shortcut hints (`Esc` for cancel, `Enter` for capture)
  - [ ] 3.4 Implement responsive toolbar positioning (top on desktop, bottom on mobile)

### Phase 3c: Mouse and Touch Interaction

- [ ] 4.0 Implement Mouse Event Handling
  - [ ] 4.1 Handle mousedown to start drawing (left click only)
  - [ ] 4.2 Handle mousemove to update selection bounds
  - [ ] 4.3 Handle mouseup to finish drawing
  - [ ] 4.4 Calculate bounds correctly when dragging in any direction

- [ ] 5.0 Implement Touch Event Handling
  - [ ] 5.1 Handle touchstart with preventDefault to block scrolling
  - [ ] 5.2 Handle touchmove to update selection
  - [ ] 5.3 Handle touchend to complete selection
  - [ ] 5.4 Test on touch devices with larger touch targets (44x44px minimum)

### Phase 3d: Keyboard and Accessibility

- [ ] 6.0 Implement Keyboard Controls
  - [ ] 6.1 Add Escape key handler to cancel selection at any time
  - [ ] 6.2 Add Enter key handler to confirm selection when valid
  - [ ] 6.3 Enable Tab navigation between toolbar buttons
  - [ ] 6.4 Add focus visible styling on all interactive elements

- [ ] 7.0 Implement Accessibility Features
  - [ ] 7.1 Add screen reader announcements for mode activation, selection, errors (section 9.2)
  - [ ] 7.2 Add ARIA attributes to toolbar (role="dialog", aria-label)
  - [ ] 7.3 Add aria-live region for dimension updates
  - [ ] 7.4 Implement aria-disabled on capture button when selection invalid

### Phase 3e: Visual Feedback

- [ ] 8.0 Implement Selection Visual Feedback
  - [ ] 8.1 Render dimmed overlay (rgba(0,0,0,0.5)) outside selection area
  - [ ] 8.2 Draw dashed border during drawing, solid border when selected
  - [ ] 8.3 Display dimensions label (width x height) in real-time
  - [ ] 8.4 Draw corner/edge resize handles when selection confirmed

- [ ] 9.0 Implement Minimum Size Constraint
  - [ ] 9.1 Enforce 10px minimum width and height (matches SelectionOverlay)
  - [ ] 9.2 Show error feedback when selection too small
  - [ ] 9.3 Announce to screen reader when selection rejected

### Phase 3f: Cropping Implementation

- [ ] 10.0 Implement Screenshot Cropping Utility
  - [ ] 10.1 Create `src/capture/area-screenshot.ts` with `cropScreenshot()` function
  - [ ] 10.2 Load full screenshot into ImageBitmap
  - [ ] 10.3 Scale bounds by device pixel ratio for high-DPI displays
  - [ ] 10.4 Use OffscreenCanvas to crop to selection bounds
  - [ ] 10.5 Clamp bounds to stay within image dimensions
  - [ ] 10.6 Implement `resizeIfNeeded()` to enforce max dimension limits
  - [ ] 10.7 Implement `compressToBlob()` with PNG fallback to JPEG

### Phase 3g: Background Script Integration

- [ ] 11.0 Add Background Script Message Handlers
  - [ ] 11.1 Add `CAPTURE_AREA_SCREENSHOT` handler to initiate capture
  - [ ] 11.2 Store pending capture state (tabId, windowId)
  - [ ] 11.3 Add `AREA_SELECTION_COMPLETE` handler to capture and crop
  - [ ] 11.4 Add `AREA_SELECTION_CANCELLED` handler to clean up state
  - [ ] 11.5 Use `chrome.tabs.captureVisibleTab()` to capture full viewport
  - [ ] 11.6 Apply cropping and return `AreaScreenshotResult`

### Phase 3h: Content Script Integration

- [ ] 12.0 Add Content Script Message Handlers
  - [ ] 12.1 Add `START_AREA_SELECTION` handler to create overlay
  - [ ] 12.2 Add `CANCEL_AREA_SELECTION` handler to destroy overlay
  - [ ] 12.3 Send `AREA_SELECTION_COMPLETE` with bounds on confirm
  - [ ] 12.4 Send `AREA_SELECTION_CANCELLED` on cancel
  - [ ] 12.5 Clean up overlay instance on completion or cancel

### Phase 3i: Popup Integration

- [ ] 13.0 Add Area Mode to Popup
  - [ ] 13.1 Add "Area" mode button with dashed rectangle icon to popup.html
  - [ ] 13.2 Add `area-screenshot` case to mode handler in popup.ts
  - [ ] 13.3 Send `CAPTURE_AREA_SCREENSHOT` message to background
  - [ ] 13.4 Close popup on successful initiation (selection happens on page)
  - [ ] 13.5 Show error message if initiation fails

### Phase 3j: Quality and Polish

- [ ] 14.0 Dark Mode Support
  - [ ] 14.1 Add `@media (prefers-color-scheme: dark)` styles for toolbar
  - [ ] 14.2 Adjust button colors for dark mode
  - [ ] 14.3 Test contrast ratios meet WCAG AA (4.5:1 for text)

- [ ] 15.0 Reduced Motion Support
  - [ ] 15.1 Add `@media (prefers-reduced-motion: reduce)` to disable animations
  - [ ] 15.2 Remove overlay fade-in/out transitions when reduced motion preferred

- [ ] 16.0 Window Resize Handling
  - [ ] 16.1 Update canvas dimensions on window resize
  - [ ] 16.2 Reset selection state on resize (invalidates previous bounds)
  - [ ] 16.3 Re-render overlay after resize

---

## Acceptance Criteria Checklist (Section 8)

- [ ] AC1: User can initiate area selection from popup "Area" mode button
- [ ] AC2: Rectangle can be drawn by click-and-drag
- [ ] AC3: Selection shows dashed border while drawing
- [ ] AC4: Outside area is dimmed with 50% opacity overlay
- [ ] AC5: Dimensions displayed in real-time during drag
- [ ] AC6: Minimum size constraint (10x10px) enforced
- [ ] AC7: Escape key cancels selection and closes overlay
- [ ] AC8: Enter key confirms selection and triggers capture
- [ ] AC9: Cancel button closes overlay
- [ ] AC10: Capture button enabled only when valid selection exists
- [ ] AC11: Screenshot cropped to exact selection bounds
- [ ] AC12: High-DPI displays produce correctly scaled captures
- [ ] AC13: Touch input supported for drawing selection
- [ ] AC14: Screen reader announcements work (VoiceOver/NVDA)
- [ ] AC15: Dark mode styling applies correctly
- [ ] AC16: Image compression applies when exceeding size limits

---

## Dependencies

### Browser APIs Required
- `chrome.tabs.captureVisibleTab` (activeTab permission)
- `OffscreenCanvas` (no permission needed)
- `createImageBitmap` (no permission needed)

### Internal Dependencies
- TS-0003: Multi-Mode Capture (screenshot infrastructure)
- TS-0007: Shared UI Component Library (SelectionOverlay component)

---

## Testing Checklist

### Unit Tests
- [ ] `cropScreenshot()` crops image to specified bounds
- [ ] `cropScreenshot()` handles DPR scaling correctly
- [ ] `cropScreenshot()` enforces maximum dimensions
- [ ] `cropScreenshot()` falls back to JPEG when PNG too large

### Integration Tests
- [ ] Overlay creates in Shadow DOM
- [ ] Mouse down/move/up sequence creates valid selection
- [ ] Minimum selection size enforced
- [ ] onConfirm callback receives correct bounds
- [ ] onCancel callback triggered on Escape

### Manual Testing
- [ ] Draw selection on various page types (text, images, complex layouts)
- [ ] Test on high-DPI (Retina) display
- [ ] Test on standard DPI display
- [ ] Test with dark mode enabled
- [ ] Test with reduced motion preference
- [ ] Test keyboard-only navigation
- [ ] Test with screen reader (VoiceOver, NVDA)
- [ ] Test touch input on tablet/phone
- [ ] Test selection near page edges
- [ ] Test very large selection (full viewport)
- [ ] Test very small selection (near minimum)
- [ ] Test on page with high z-index elements
