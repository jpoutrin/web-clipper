# TS-0004: Embedded Content Capture - Implementation Tasks

Source Tech Spec: ../tech-specs/draft/TS-0004-embedded-content-capture.md
Generated: 2026-01-17
Total Tasks: 30
Completed: 0

## Overview

Screenshot-based capture system for embedded content (charts, graphs, social media posts) using an extensible provider registry pattern.

## Dependencies

- TS-0001: Core Extension Architecture (prerequisite)
- TS-0003: Multi-Mode Capture System (prerequisite - shares CAPTURE_EMBED infrastructure)
- TS-0007: Shared UI Component Library (for progress/feedback components)

---

## Phase 1: Types and Provider Registry

- [ ] 1.0 Types and Provider Registry Setup
  - [ ] 1.1 Review tech spec sections 2.1 and 2.2 (Core Types and Message Types)
  - [ ] 1.2 Create `extension/src/embeds/types.ts` with core interfaces
    - [ ] 1.2.1 Define `EmbedProvider` interface
    - [ ] 1.2.2 Define `EmbedMetadata` interface
    - [ ] 1.2.3 Define `DetectedEmbed` interface
    - [ ] 1.2.4 Define `CapturedEmbed` interface
    - [ ] 1.2.5 Define `EmbedCaptureConfig` interface and `DEFAULT_EMBED_CONFIG` constant
  - [ ] 1.3 Add CAPTURE_EMBED message types to `extension/src/types/index.ts`
    - [ ] 1.3.1 Add `CAPTURE_EMBED` to `MessageType` union
    - [ ] 1.3.2 Define `CaptureEmbedPayload` interface
    - [ ] 1.3.3 Define `CaptureEmbedResponse` interface
  - [ ] 1.4 Create `extension/src/embeds/providers/index.ts` with registry implementation
    - [ ] 1.4.1 Implement `ProviderRegistry` class with register/getAll/getById methods
    - [ ] 1.4.2 Add `getAllSelectors()` and `getAllIframePatterns()` utility methods
  - [ ] 1.5 Implement built-in providers
    - [ ] 1.5.1 Datawrapper provider (priority: 100)
    - [ ] 1.5.2 Flourish provider (priority: 100)
    - [ ] 1.5.3 Infogram provider (priority: 100)
    - [ ] 1.5.4 Twitter/X provider (priority: 90)
    - [ ] 1.5.5 YouTube provider (priority: 80)
    - [ ] 1.5.6 Generic iframe fallback provider (priority: 0)
  - [ ] 1.6 Register all built-in providers in singleton instance

---

## Phase 2: Detection and Preparation

- [ ] 2.0 Embed Detection Implementation
  - [ ] 2.1 Review tech spec section 4.1 (Embed Detection)
  - [ ] 2.2 Create `extension/src/embeds/detector.ts`
  - [ ] 2.3 Implement `detectEmbeds()` function
    - [ ] 2.3.1 Query DOM using provider selectors in priority order
    - [ ] 2.3.2 Check iframes by src pattern matching
    - [ ] 2.3.3 Validate element bounds against `minWidth`/`minHeight` config
  - [ ] 2.4 Implement deduplication logic
    - [ ] 2.4.1 Track processed elements in Set
    - [ ] 2.4.2 Mark related elements (parents/children) to avoid nested captures
    - [ ] 2.4.3 Implement `isEmbedWrapper()` helper for common wrapper detection
  - [ ] 2.5 Sort detected embeds by document position

- [ ] 3.0 Embed Preparation Implementation
  - [ ] 3.1 Review tech spec section 4.2 (Embed Preparation)
  - [ ] 3.2 Create `extension/src/embeds/preparer.ts`
  - [ ] 3.3 Implement `prepareEmbed()` async function
  - [ ] 3.4 Implement `scrollIntoView()` helper with requestAnimationFrame wait
  - [ ] 3.5 Implement `waitForSelector()` with timeout and cross-origin iframe handling
  - [ ] 3.6 Return updated bounds after preparation

---

## Phase 3: Screenshot Capture

- [ ] 4.0 Background Script Handler
  - [ ] 4.1 Review tech spec section 5.1 (Background Script Handler)
  - [ ] 4.2 Add CAPTURE_EMBED case to message handler switch in `extension/src/background.ts`
  - [ ] 4.3 Implement `handleCaptureEmbed()` function
    - [ ] 4.3.1 Get current window and tab
    - [ ] 4.3.2 Call `chrome.tabs.captureVisibleTab()` with PNG format
    - [ ] 4.3.3 Pass result to `cropImage()` function
  - [ ] 4.4 Implement `cropImage()` function using OffscreenCanvas
    - [ ] 4.4.1 Load image as ImageBitmap
    - [ ] 4.4.2 Scale bounds by devicePixelRatio
    - [ ] 4.4.3 Clamp bounds to image dimensions
    - [ ] 4.4.4 Draw cropped region to OffscreenCanvas
    - [ ] 4.4.5 Convert to base64

- [ ] 5.0 Content Script Capturer
  - [ ] 5.1 Review tech spec section 5.2 (Content Script Capturer)
  - [ ] 5.2 Create `extension/src/embeds/capturer.ts`
  - [ ] 5.3 Implement `captureEmbed()` function
    - [ ] 5.3.1 Call `prepareEmbed()` for scroll/wait
    - [ ] 5.3.2 Send CAPTURE_EMBED message to background
    - [ ] 5.3.3 Generate filename using `generateEmbedFilename()`
    - [ ] 5.3.4 Return `CapturedEmbed` or null on failure
  - [ ] 5.4 Implement `captureAllEmbeds()` with timeout handling
    - [ ] 5.4.1 Track start time for total timeout
    - [ ] 5.4.2 Use Promise.race for per-embed timeout
    - [ ] 5.4.3 Return array of successfully captured embeds

---

## Phase 4: Markdown Integration

- [ ] 6.0 Turndown Rules Implementation
  - [ ] 6.1 Review tech spec section 6.1 (Turndown Rules)
  - [ ] 6.2 Create `extension/src/embeds/integrator.ts`
  - [ ] 6.3 Implement `addEmbedRules()` function
    - [ ] 6.3.1 Add rule for captured embeds (replace with image markdown)
    - [ ] 6.3.2 Add rule for uncaptured embeds (link fallback)
  - [ ] 6.4 Implement `generateEmbedMarkdown()` helper
    - [ ] 6.4.1 Generate image markdown with alt text
    - [ ] 6.4.2 Add source attribution if available
  - [ ] 6.5 Implement `generateFallbackMarkdown()` helper
  - [ ] 6.6 Implement parent/child lookup helpers for nested elements

- [ ] 7.0 Content Script Integration
  - [ ] 7.1 Review tech spec section 6.2 (Content Script Integration)
  - [ ] 7.2 Modify `capturePage()` in `extension/src/content.ts`
    - [ ] 7.2.1 Add embed detection BEFORE document clone
    - [ ] 7.2.2 Capture all embeds and create lookup map
    - [ ] 7.2.3 Add embed rules to Turndown instance
    - [ ] 7.2.4 Merge embed images with regular images in result

---

## Phase 5: Error Handling and Fallbacks

- [ ] 8.0 Error Handling Implementation
  - [ ] 8.1 Review tech spec section 7 (Error Handling and Fallback Cascade)
  - [ ] 8.2 Implement `captureEmbedWithFallback()` with 3-level cascade
    - [ ] 8.2.1 Level 1: Full capture with preparation
    - [ ] 8.2.2 Level 2: Immediate capture without preparation
    - [ ] 8.2.3 Level 3: Return null for metadata-only fallback
  - [ ] 8.3 Implement `safeDetectEmbeds()` wrapper (never throws)
  - [ ] 8.4 Implement `safeCaptureAllEmbeds()` wrapper (never throws)
  - [ ] 8.5 Verify embed failures don't break article clipping

---

## Phase 6: UX and Progress Feedback

- [ ] 9.0 Progress Indication Implementation
  - [ ] 9.1 Review tech spec sections 15.2-15.3 (Progress Indication)
  - [ ] 9.2 Define `EmbedCaptureProgress` interface in types
  - [ ] 9.3 Use TS-0007 `ProgressBar` component with `variant: 'phased'`
  - [ ] 9.4 Implement progress state updates during capture
    - [ ] 9.4.1 Phase 1: "Detecting embedded content..."
    - [ ] 9.4.2 Phase 2: "Capturing chart X of Y..."
    - [ ] 9.4.3 Phase 3: "Processing markdown..."
  - [ ] 9.5 Add cancel/skip functionality during capture

- [ ] 10.0 Error UX Implementation
  - [ ] 10.1 Review tech spec section 15.3 (Error Handling UX)
  - [ ] 10.2 Implement error severity levels
  - [ ] 10.3 Use TS-0007 `Toast` component for success/warning messages
  - [ ] 10.4 Use TS-0007 `Badge` component for embed status badges
  - [ ] 10.5 Show retry option for partial failures

---

## Phase 7: UI Components

- [ ] 11.0 Embed Highlight Overlay
  - [ ] 11.1 Review tech spec section 16.1 (Embed Highlight Overlay)
  - [ ] 11.2 Implement `.embed-highlight` CSS with pulse animation
  - [ ] 11.3 Add overlay to detected embeds during capture

- [ ] 12.0 Embed Badge and Panel
  - [ ] 12.1 Review tech spec sections 16.2-16.3 (Embed Badge, Popup Panel)
  - [ ] 12.2 Implement embed status badges using TS-0007 Badge component
  - [ ] 12.3 Implement expandable embed panel in popup (if needed)

- [ ] 13.0 Dark Mode and Accessibility
  - [ ] 13.1 Review tech spec sections 16.6-16.7 (Dark Mode, Animation)
  - [ ] 13.2 Add dark mode CSS overrides
  - [ ] 13.3 Implement ARIA attributes per section 15.5
  - [ ] 13.4 Respect `prefers-reduced-motion` for all animations

---

## Phase 8: Testing and Verification

- [ ] 14.0 Unit Testing
  - [ ] 14.1 Write tests for provider registry (register, getAll, getById)
  - [ ] 14.2 Write tests for embed detection logic
  - [ ] 14.3 Write tests for metadata extraction per provider
  - [ ] 14.4 Write tests for fallback cascade

- [ ] 15.0 Manual Testing - Acceptance Criteria
  - [ ] 15.1 AC1: Datawrapper charts captured (Le Figaro article test)
  - [ ] 15.2 AC2: Flourish visualizations captured
  - [ ] 15.3 AC3: Twitter/X posts captured as screenshots
  - [ ] 15.4 AC4: YouTube thumbnails captured
  - [ ] 15.5 AC5: Multiple providers on same page
  - [ ] 15.6 AC6: Lazy-loaded embeds handled
  - [ ] 15.7 AC7: Fallback to metadata on capture failure
  - [ ] 15.8 AC8: Maximum 10 embeds limit enforced
  - [ ] 15.9 AC9: 30s total timeout respected
  - [ ] 15.10 AC10: Failed embeds don't break article clip
  - [ ] 15.11 AC11-AC15: UX/accessibility criteria verified

---

## File Structure Summary

### New Files to Create

| File | Phase |
|------|-------|
| `extension/src/embeds/types.ts` | 1 |
| `extension/src/embeds/providers/index.ts` | 1 |
| `extension/src/embeds/detector.ts` | 2 |
| `extension/src/embeds/preparer.ts` | 2 |
| `extension/src/embeds/capturer.ts` | 3 |
| `extension/src/embeds/integrator.ts` | 4 |

### Files to Modify

| File | Phase |
|------|-------|
| `extension/src/types/index.ts` | 1 |
| `extension/src/background.ts` | 3 |
| `extension/src/content.ts` | 4 |

---

## Notes

- All embed capture failures should be non-blocking (article clipping continues)
- Use TS-0007 shared components where specified (ProgressBar, Badge, Toast, Spinner)
- Cross-origin iframe content cannot be inspected - rely on external selectors/attributes
- Test on real pages with actual embedded content from each provider
