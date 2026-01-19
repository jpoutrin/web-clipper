# TS-0008: Full Page Screenshot Capture - Implementation Tasks

Source: tech-specs/draft/TS-0008-full-page-screenshot-capture.md
Generated: 2026-01-17
Total Tasks: 45
Completed: 0

---

## Tasks

### Phase 4a: Foundation

- [ ] 1.0 Add Type Definitions
  - [ ] 1.1 Add `FullPageCaptureConfig` interface to `src/types/index.ts` (section 2.1)
  - [ ] 1.2 Add `DEFAULT_FULL_PAGE_CONFIG` constant with default values
  - [ ] 1.3 Add `FullPageCaptureState` type union (preparing, loading, capturing, stitching, complete, cancelled, error)
  - [ ] 1.4 Add `FullPageCaptureProgress` interface for progress tracking
  - [ ] 1.5 Add `CaptureSegment` interface for individual captures
  - [ ] 1.6 Add `FullPageScreenshotResult` interface
  - [ ] 1.7 Add `FixedElementInfo` interface for element hiding/restoring
  - [ ] 1.8 Extend `MessageType` with `CAPTURE_FULL_PAGE`, `FULL_PAGE_PROGRESS`, `FULL_PAGE_CANCEL`, etc.
  - [ ] 1.9 Extend `ClipMode` to include `full-page`

### Phase 4b: Core Capture Algorithm

- [ ] 2.0 Implement Full Page Capture Class
  - [ ] 2.1 Create `src/capture/full-page-capture.ts` with `FullPageCapture` class
  - [ ] 2.2 Implement `measurePage()` to get scroll height and viewport dimensions
  - [ ] 2.3 Implement `triggerLazyLoading()` to pre-scroll and load lazy content
  - [ ] 2.4 Implement `hideFixedElements()` to find and hide fixed/sticky elements
  - [ ] 2.5 Implement `restoreFixedElements()` to restore original element styles
  - [ ] 2.6 Implement capture loop with scroll, delay, and viewport capture
  - [ ] 2.7 Implement `requestViewportCapture()` to communicate with background script
  - [ ] 2.8 Implement `cancel()` method with proper cleanup
  - [ ] 2.9 Save and restore original scroll position

- [ ] 3.0 Implement Fixed Element Detection
  - [ ] 3.1 Query all elements and check computed `position` style
  - [ ] 3.2 Identify `fixed` and `sticky` positioned elements
  - [ ] 3.3 Store original styles before hiding
  - [ ] 3.4 Set `visibility: hidden` to hide during capture
  - [ ] 3.5 Restore all original styles after capture

### Phase 4c: Image Stitching

- [ ] 4.0 Implement Stitch Utility
  - [ ] 4.1 Create `src/capture/stitch-captures.ts` with `stitchCaptures()` function
  - [ ] 4.2 Create OffscreenCanvas with total page dimensions
  - [ ] 4.3 Load each segment as ImageBitmap
  - [ ] 4.4 Draw segments at correct Y offsets with overlap handling
  - [ ] 4.5 Handle scaling if dimensions exceed maximum
  - [ ] 4.6 Implement compression with PNG-first, JPEG fallback
  - [ ] 4.7 Convert final blob to base64

### Phase 4d: Progress Overlay

- [ ] 5.0 Implement Progress Overlay Component
  - [ ] 5.1 Create `src/capture/full-page-progress-overlay.ts`
  - [ ] 5.2 Create Shadow DOM host with maximum z-index
  - [ ] 5.3 Build modal UI with icon, title, status text
  - [ ] 5.4 Add progress bar with percentage display
  - [ ] 5.5 Add section counter (e.g., "Section 3 of 10")
  - [ ] 5.6 Add Cancel button with click handler
  - [ ] 5.7 Implement `update()` method for progress updates
  - [ ] 5.8 Implement `showComplete()` with auto-close
  - [ ] 5.9 Implement `showError()` for failure state
  - [ ] 5.10 Add screen reader announcements (aria-live region)

- [ ] 6.0 Progress Overlay Styling
  - [ ] 6.1 Style modal with centered layout and shadow
  - [ ] 6.2 Style progress bar with fill animation
  - [ ] 6.3 Add dark mode support via `prefers-color-scheme`
  - [ ] 6.4 Add reduced motion support for progress bar
  - [ ] 6.5 Style Cancel button with hover/focus states

### Phase 4e: Background Script Integration

- [ ] 7.0 Add Background Script Message Handlers
  - [ ] 7.1 Add `CAPTURE_FULL_PAGE` handler to initiate capture
  - [ ] 7.2 Store pending capture state (tabId, windowId)
  - [ ] 7.3 Add `CAPTURE_VIEWPORT_FOR_FULLPAGE` handler for individual viewport captures
  - [ ] 7.4 Add `FULL_PAGE_SEGMENTS_READY` handler to receive segments
  - [ ] 7.5 Call `stitchCaptures()` to combine segments
  - [ ] 7.6 Return `FullPageScreenshotResult` on success
  - [ ] 7.7 Add `FULL_PAGE_CANCEL` handler to clean up state

### Phase 4f: Content Script Integration

- [ ] 8.0 Add Content Script Message Handlers
  - [ ] 8.1 Add `START_FULL_PAGE_CAPTURE` handler
  - [ ] 8.2 Create progress overlay instance
  - [ ] 8.3 Create `FullPageCapture` instance with progress callback
  - [ ] 8.4 Execute capture and send segments to background
  - [ ] 8.5 Handle completion and error states
  - [ ] 8.6 Add `CANCEL_FULL_PAGE_CAPTURE` handler
  - [ ] 8.7 Implement cleanup function for capture state

### Phase 4g: Popup Integration

- [ ] 9.0 Add Full Page Mode to Popup
  - [ ] 9.1 Add "Full Page" mode button with icon to popup.html
  - [ ] 9.2 Add `full-page` case to mode handler in popup.ts
  - [ ] 9.3 Send `CAPTURE_FULL_PAGE` message to background
  - [ ] 9.4 Close popup on successful initiation
  - [ ] 9.5 Show error message if initiation fails

### Phase 4h: Edge Case Handling

- [ ] 10.0 Implement Safety Limits
  - [ ] 10.1 Enforce maximum page height (32,000px default)
  - [ ] 10.2 Enforce maximum capture count (50 segments default)
  - [ ] 10.3 Add memory usage estimation
  - [ ] 10.4 Log warning when limits are reached

- [ ] 11.0 Infinite Scroll Handling
  - [ ] 11.1 Implement basic infinite scroll detection
  - [ ] 11.2 Compare page height before/after scroll
  - [ ] 11.3 Warn user or apply max height limit

### Phase 4i: Accessibility

- [ ] 12.0 Implement Accessibility Features
  - [ ] 12.1 Add ARIA attributes to progress modal (role="dialog", aria-labelledby)
  - [ ] 12.2 Add aria-valuenow/min/max to progress bar
  - [ ] 12.3 Implement screen reader announcements for state changes
  - [ ] 12.4 Add Escape key handler to cancel capture
  - [ ] 12.5 Ensure focus management on modal

### Phase 4j: Testing

- [ ] 13.0 Unit Tests
  - [ ] 13.1 Test `stitchCaptures()` combines segments correctly
  - [ ] 13.2 Test maximum dimension enforcement
  - [ ] 13.3 Test overlap handling between segments
  - [ ] 13.4 Test compression fallback logic

- [ ] 14.0 Integration Tests
  - [ ] 14.1 Test full capture flow on mock page
  - [ ] 14.2 Test fixed element hiding and restoration
  - [ ] 14.3 Test cancel mid-capture
  - [ ] 14.4 Test progress callback updates

---

## Acceptance Criteria Checklist (Section 9)

- [ ] AC1: User can initiate full page capture from popup "Full Page" mode button
- [ ] AC2: Progress overlay shows during capture with percentage
- [ ] AC3: Progress updates in real-time (section count and percentage)
- [ ] AC4: Cancel button stops capture and cleans up
- [ ] AC5: Fixed headers/footers not duplicated in final image
- [ ] AC6: Lazy-loaded content is captured (pre-scroll triggers loading)
- [ ] AC7: Final output is single stitched image
- [ ] AC8: Scroll position restored after capture
- [ ] AC9: Very long pages truncated at max height (32k px)
- [ ] AC10: Memory limits respected (no crash on long pages)
- [ ] AC11: Screen reader announces progress and completion
- [ ] AC12: Dark mode styling for progress overlay
- [ ] AC13: Escape key cancels capture
- [ ] AC14: Error state shown on failure
- [ ] AC15: Capture works on various page types (news, docs, social)

---

## Dependencies

### Browser APIs Required
- `chrome.tabs.captureVisibleTab` (activeTab permission)
- `OffscreenCanvas` (no permission needed)
- `createImageBitmap` (no permission needed)

### Internal Dependencies
- TS-0003: Multi-Mode Capture (screenshot infrastructure)
- TS-0007: Shared UI Component Library (optional, for progress UI)

---

## Manual Testing Checklist

- [ ] Capture short page (single viewport, ~1000px)
- [ ] Capture medium page (~5 viewports, ~5000px)
- [ ] Capture long page (~20 viewports, ~20000px)
- [ ] Capture page with sticky header (verify no duplication)
- [ ] Capture page with sticky footer (verify no duplication)
- [ ] Capture page with lazy-loaded images (verify all loaded)
- [ ] Cancel capture mid-progress (verify cleanup)
- [ ] Test on high-DPI (Retina) display
- [ ] Test dark mode progress overlay
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Verify scroll position restored after capture
- [ ] Test memory usage on very long page (30k+ px)
- [ ] Test on news site (CNN, BBC, etc.)
- [ ] Test on documentation site (MDN, docs.github.com)
- [ ] Test on social media feed (Twitter, Reddit)
