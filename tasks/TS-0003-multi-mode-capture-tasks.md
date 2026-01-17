# TS-0003: Multi-Mode Capture System - Implementation Tasks

Source: tech-specs/draft/TS-0003-multi-mode-capture.md
Generated: 2026-01-17
Total Tasks: 58
Completed: 0

---

## Tasks

### Phase 2a: Foundation Setup

- [ ] 1.0 Type Definitions
  - [ ] 1.1 Add `ClipMode` type to `extension/src/types/index.ts` (article, bookmark, screenshot, selection, fullpage)
  - [ ] 1.2 Add extended `MessageType` with CAPTURE_BOOKMARK, CAPTURE_SCREENSHOT, CAPTURE_SELECTION, CAPTURE_FULLPAGE, START_SELECTION_MODE, CANCEL_SELECTION_MODE
  - [ ] 1.3 Add `ScreenshotResult` interface (title, url, image with filename/data/width/height/format)
  - [ ] 1.4 Add `SelectionResult` interface (title, url, markdown, html, images, selector)
  - [ ] 1.5 Add `FullPageResult` interface (title, url, html, images, styles)
  - [ ] 1.6 Add `BookmarkResult` interface (title, url, excerpt, favicon)
  - [ ] 1.7 Add unified `CaptureResult` interface with mode-specific optional fields

- [ ] 2.0 Popup UI Mode Selector
  - [ ] 2.1 Add mode selector container HTML to `popup.html` (section 7.1)
  - [ ] 2.2 Add mode button styles to popup CSS (base, hover, active, disabled states)
  - [ ] 2.3 Create icons for each mode (Article, Bookmark, Screenshot, Selection)
  - [ ] 2.4 Add keyboard accessibility: Tab navigation, 1-4 shortcuts, Arrow keys
  - [ ] 2.5 Add ARIA attributes: role="tablist", aria-selected, aria-controls
  - [ ] 2.6 Wire up mode selection event handlers in `popup.ts`
  - [ ] 2.7 Add `updateUIForMode()` function to change button text per mode
  - [ ] 2.8 Persist selected mode in chrome.storage.local

- [ ] 3.0 Bookmark Mode Implementation
  - [ ] 3.1 Create `extension/src/capture/bookmark.ts` module
  - [ ] 3.2 Implement `captureBookmark()` function (returns title, url, excerpt, favicon)
  - [ ] 3.3 Implement `getExcerpt()` - try meta description, og:description, then first paragraph
  - [ ] 3.4 Implement `getFavicon()` - check apple-touch-icon, favicon link, default /favicon.ico
  - [ ] 3.5 Add CAPTURE_BOOKMARK message handler to content script
  - [ ] 3.6 Generate bookmark markdown with frontmatter (section 3.2 format)

### Phase 2b: Screenshot Mode

- [ ] 4.0 Screenshot Capture (Background Script)
  - [ ] 4.1 Add `captureScreenshot()` function to background.ts using `chrome.tabs.captureVisibleTab()`
  - [ ] 4.2 Extract base64 data from data URL
  - [ ] 4.3 Implement `getImageDimensions()` to decode image and get width/height
  - [ ] 4.4 Add CAPTURE_SCREENSHOT message handler in background script

- [ ] 5.0 Screenshot Compression
  - [ ] 5.1 Create `extension/src/capture/screenshot.ts` module
  - [ ] 5.2 Implement `compressScreenshot()` with configurable maxSizeBytes and maxDimensionPx
  - [ ] 5.3 Use OffscreenCanvas for image resizing
  - [ ] 5.4 Implement quality reduction loop (PNG to JPEG conversion if needed)
  - [ ] 5.5 Return compressed base64 with format indicator

- [ ] 6.0 Screenshot Server Handling
  - [ ] 6.1 Update `ClipRequest` struct in `server/actions/clips.go` to include `Mode` field
  - [ ] 6.2 Add `generateScreenshotMarkdown()` function for screenshot clips (section 9.1)
  - [ ] 6.3 Handle screenshot image storage in media folder
  - [ ] 6.4 Test screenshot clip creation end-to-end

### Phase 2c: Selection Mode

- [ ] 7.0 Selection Overlay UI (using TS-0007 components)
  - [ ] 7.1 Create `extension/src/capture/selection-overlay.ts` wrapping HighlightOverlay from UI library
  - [ ] 7.2 Use FloatingToolbar component for "Clip Selection" / "Cancel" toolbar
  - [ ] 7.3 Use Button component for toolbar actions
  - [ ] 7.4 Create Shadow DOM host for overlay isolation (section 17.2)
  - [ ] 7.5 Add mousemove handler to highlight hovered elements
  - [ ] 7.6 Add click handler to select element (change highlight color to green)
  - [ ] 7.7 Add keyboard handler for Escape to cancel
  - [ ] 7.8 Filter out small elements (<20px) and overlay elements from selection
  - [ ] 7.9 Enable "Clip Selection" button only after element is selected

- [ ] 8.0 Element Capture Logic
  - [ ] 8.1 Create `extension/src/capture/selection.ts` module
  - [ ] 8.2 Implement `captureSelection()` function (clone element, extract images, convert to markdown)
  - [ ] 8.3 Implement `getUniqueSelector()` for CSS selector generation
  - [ ] 8.4 Implement `getImageExtension()` utility
  - [ ] 8.5 Use TurndownService for HTML-to-Markdown conversion
  - [ ] 8.6 Implement image fetching with CORS handling via background script

- [ ] 9.0 Selection State Management
  - [ ] 9.1 Add `pendingSelection` state in background.ts (section 17.3)
  - [ ] 9.2 Handle START_SELECTION_MODE message (store tabId and config)
  - [ ] 9.3 Handle SELECTION_COMPLETE message (submit clip automatically)
  - [ ] 9.4 Handle SELECTION_CANCELLED message (clear pending state)
  - [ ] 9.5 Close popup when selection mode starts

### Phase 2d: Full Page Mode

- [ ] 10.0 DOM Cloning
  - [ ] 10.1 Create `extension/src/capture/fullpage.ts` module
  - [ ] 10.2 Implement `captureFullPage()` function
  - [ ] 10.3 Clone `document.documentElement` deep
  - [ ] 10.4 Implement `removeUnwantedElements()` (scripts, noscript, ads, etc.)

- [ ] 11.0 Style Inlining
  - [ ] 11.1 Implement `inlineStyles()` function with batch processing
  - [ ] 11.2 Use comprehensive CSS property list (section 17.5)
  - [ ] 11.3 Add yielding (setTimeout) to prevent blocking UI on large pages
  - [ ] 11.4 Handle computed style extraction for all essential properties

- [ ] 12.0 Full Page Image Processing
  - [ ] 12.1 Implement `processImages()` for img elements
  - [ ] 12.2 Handle background-image URLs in inline styles
  - [ ] 12.3 Resolve relative URLs to absolute
  - [ ] 12.4 Implement `fetchImagesForFullPage()` with SVG handling
  - [ ] 12.5 Remove srcset and data-src attributes

- [ ] 13.0 Full Page Server Handling
  - [ ] 13.1 Handle HTML content type in server clip creation
  - [ ] 13.2 Save full page clips as `.html` files instead of `.md`
  - [ ] 13.3 Test full page clip creation end-to-end

### Phase 2e: Integration and Error Handling

- [ ] 14.0 Content Script Message Router
  - [ ] 14.1 Update content script to import all capture modules
  - [ ] 14.2 Implement `handleMessage()` with switch on message type
  - [ ] 14.3 Add CAPTURE_PAGE handler (existing article mode)
  - [ ] 14.4 Add CAPTURE_BOOKMARK handler
  - [ ] 14.5 Add CAPTURE_FULLPAGE handler
  - [ ] 14.6 Add START_SELECTION_MODE handler
  - [ ] 14.7 Add CANCEL_SELECTION_MODE handler

- [ ] 15.0 Popup Clip Handler Updates
  - [ ] 15.1 Update clip button click handler for mode switching
  - [ ] 15.2 Handle bookmark mode (send CAPTURE_BOOKMARK)
  - [ ] 15.3 Handle screenshot mode (send CAPTURE_SCREENSHOT to background)
  - [ ] 15.4 Handle selection mode (send START_SELECTION_MODE, close popup)
  - [ ] 15.5 Handle fullpage mode (send CAPTURE_FULLPAGE)
  - [ ] 15.6 Build unified ClipPayload with mode-specific fields

- [ ] 16.0 CORS Image Proxy
  - [ ] 16.1 Add FETCH_IMAGE message handler in background.ts (section 17.1)
  - [ ] 16.2 Implement `fetchImage()` proxy function
  - [ ] 16.3 Use background proxy in content script image fetching

- [ ] 17.0 Capture Lock
  - [ ] 17.1 Add `captureInProgress` state in background.ts
  - [ ] 17.2 Implement `withCaptureLock()` wrapper (section 17.4)
  - [ ] 17.3 Prevent concurrent captures with user-friendly error

- [ ] 18.0 Error Handling and UX
  - [ ] 18.1 Add loading states to popup buttons (spinner animation)
  - [ ] 18.2 Implement error message component (section 15.4)
  - [ ] 18.3 Add retry functionality for failed captures
  - [ ] 18.4 Add screen reader announcements for state changes (section 16.3)
  - [ ] 18.5 Handle timeout for long-running captures

### Phase 2f: Testing

- [ ] 19.0 Unit Tests
  - [ ] 19.1 Test `captureBookmark()` with various meta tag configurations
  - [ ] 19.2 Test `compressScreenshot()` with different image sizes
  - [ ] 19.3 Test `getUniqueSelector()` with various DOM structures
  - [ ] 19.4 Test `inlineStyles()` property extraction
  - [ ] 19.5 Test image URL resolution and extension detection

- [ ] 20.0 E2E Tests (Playwright)
  - [ ] 20.1 Test bookmark mode captures URL and excerpt
  - [ ] 20.2 Test screenshot mode captures viewport
  - [ ] 20.3 Test selection overlay appears and highlights elements
  - [ ] 20.4 Test element selection and capture
  - [ ] 20.5 Test full page capture includes styles
  - [ ] 20.6 Test mode switching updates UI correctly
  - [ ] 20.7 Test keyboard navigation in mode selector
  - [ ] 20.8 Test error states and retry

---

## Acceptance Criteria Checklist (Section 10)

- [ ] AC1: Mode selector visible in popup - 4 mode buttons shown, article active by default
- [ ] AC2: Bookmark mode captures URL + excerpt - Only URL, title, excerpt saved (no images)
- [ ] AC3: Screenshot captures visible viewport - PNG/JPEG image saved in media folder
- [ ] AC4: Selection mode shows overlay - Hover highlights elements, click selects
- [ ] AC5: Selected element captured as Markdown - HTML converted, images extracted
- [ ] AC6: Full page includes inlined styles - HTML renders correctly when opened standalone
- [ ] AC7: Screenshot compressed if oversized - Images reduced to meet size limits
- [ ] AC8: Server accepts all clip modes - Mode field stored, appropriate file extension used

---

## Dependencies

### Required Before Starting
- TS-0001: Core Extension Infrastructure (complete)
- TS-0007: Shared UI Component Library (complete - provides HighlightOverlay, FloatingToolbar, Button)

### Browser APIs Used
| API | Permission | Purpose |
|-----|------------|---------|
| `chrome.tabs.captureVisibleTab` | `activeTab` | Screenshot capture |
| `chrome.scripting.executeScript` | `scripting` | Inject selection overlay |
| `OffscreenCanvas` | (none) | Image processing |

---

## Notes

- Selection overlay MUST use Shadow DOM for style isolation (prevents conflicts with page CSS)
- Image fetching MUST route through background script to avoid CORS issues
- Full page style inlining uses batch processing with yields to prevent UI blocking
- Screenshot compression attempts PNG first, falls back to JPEG with quality reduction
