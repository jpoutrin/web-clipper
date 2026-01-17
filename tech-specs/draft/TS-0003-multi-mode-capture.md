# TS-0003: Multi-Mode Capture System

## Metadata

| Field | Value |
|-------|-------|
| Tech Spec ID | TS-0003 |
| Title | Multi-Mode Capture System |
| Status | DRAFT |
| Author | |
| Created | 2026-01-17 |
| Last Updated | 2026-01-17 |
| Related RFC | - |
| Phase | 2 - Enhanced Capture |
| Reviews | CTO Architecture, UX Expert, UI Product Expert |
| Depends On | TS-0001 |
| Location | tech-specs/draft/TS-0003-multi-mode-capture.md |

## Executive Summary

Extend the Web Clipper extension to support multiple capture modes beyond the current article extraction. Users will be able to choose how they want to clip content: as a cleaned article (current), full page with styles, selected element, screenshot, or simple bookmark.

## Scope

| Component | Included | Notes |
|-----------|----------|-------|
| Clip Mode Selector UI | Yes | Popup mode selection |
| Article Mode | Yes | Existing Readability-based extraction |
| Bookmark Mode | Yes | URL + title + excerpt only |
| Screenshot Mode | Yes | Visible viewport capture |
| Selection Mode | Yes | User-selected element capture |
| Full Page Mode | Yes | DOM clone with inlined styles |
| Area Screenshot | No | Phase 3 - user-drawn rectangle |
| Full Page Stitched Screenshot | No | Phase 3 - scroll and stitch |

---

## 1. Clip Modes Overview

### 1.1 Mode Definitions

| Mode | Output | Use Case |
|------|--------|----------|
| **Article** | Markdown + images | Blog posts, news articles |
| **Bookmark** | Markdown link only | Quick saves, reference links |
| **Screenshot** | PNG/JPEG image | Visual content, charts, UI |
| **Selection** | HTML/Markdown of element | Specific sections, code blocks |
| **Full Page** | Complete HTML with styles | Preserving exact layout |

### 1.2 Mode Selection Flow

```
┌─────────────────────────────────────┐
│           Web Clipper Popup          │
├─────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ 📄  │ │ 🔖  │ │ 📷  │ │ ✂️  │   │
│  │Article│Bookmark│Screenshot│Select│ │
│  └─────┘ └─────┘ └─────┘ └─────┘   │
│                                      │
│  Title: [Page Title Here    ]       │
│  Tags:  [                   ]       │
│  Notes: [                   ]       │
│                                      │
│  [        Clip This Page        ]   │
└─────────────────────────────────────┘
```

---

## 2. Type Definitions

### 2.1 Extended Types

**src/types/index.ts** (additions):
```typescript
// Clip modes
export type ClipMode = 'article' | 'bookmark' | 'screenshot' | 'selection' | 'fullpage';

// Extended message types
export type MessageType =
  | 'GET_STATE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'FETCH_CONFIG'
  | 'CAPTURE_PAGE'
  | 'CAPTURE_SCREENSHOT'
  | 'CAPTURE_SELECTION'
  | 'CAPTURE_FULLPAGE'
  | 'START_SELECTION_MODE'
  | 'CANCEL_SELECTION_MODE'
  | 'SUBMIT_CLIP'
  | 'AUTH_CALLBACK'
  | 'DEV_LOGIN';

// Screenshot result
export interface ScreenshotResult {
  title: string;
  url: string;
  image: {
    filename: string;
    data: string; // base64
    width: number;
    height: number;
    format: 'png' | 'jpeg';
  };
}

// Selection result
export interface SelectionResult {
  title: string;
  url: string;
  markdown: string;
  html: string;
  images: ImagePayload[];
  selector: string; // CSS selector of captured element
}

// Full page result
export interface FullPageResult {
  title: string;
  url: string;
  html: string;
  images: ImagePayload[];
  styles: string; // Inlined CSS
}

// Bookmark result
export interface BookmarkResult {
  title: string;
  url: string;
  excerpt: string;
  favicon?: string;
}

// Unified capture result
export interface CaptureResult {
  mode: ClipMode;
  title: string;
  url: string;
  markdown?: string;
  html?: string;
  images: ImagePayload[];
  screenshot?: {
    filename: string;
    data: string;
    width: number;
    height: number;
  };
}
```

---

## 3. Bookmark Mode

### 3.1 Implementation

Simplest mode - captures URL, title, and a brief excerpt.

**src/capture/bookmark.ts**:
```typescript
export interface BookmarkCapture {
  title: string;
  url: string;
  excerpt: string;
  favicon?: string;
}

export function captureBookmark(): BookmarkCapture {
  // Get page title
  const title = document.title || 'Untitled';

  // Get URL
  const url = window.location.href;

  // Extract excerpt from meta description or first paragraph
  const excerpt = getExcerpt();

  // Get favicon
  const favicon = getFavicon();

  return { title, url, excerpt, favicon };
}

function getExcerpt(): string {
  // Try meta description first
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc?.getAttribute('content')) {
    return metaDesc.getAttribute('content')!.slice(0, 300);
  }

  // Try og:description
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc?.getAttribute('content')) {
    return ogDesc.getAttribute('content')!.slice(0, 300);
  }

  // Fall back to first paragraph
  const firstP = document.querySelector('article p, main p, .content p, p');
  if (firstP?.textContent) {
    return firstP.textContent.trim().slice(0, 300);
  }

  return '';
}

function getFavicon(): string | undefined {
  // Check for apple-touch-icon (higher quality)
  const apple = document.querySelector('link[rel="apple-touch-icon"]');
  if (apple?.getAttribute('href')) {
    return new URL(apple.getAttribute('href')!, window.location.href).href;
  }

  // Check for standard favicon
  const favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
  if (favicon?.getAttribute('href')) {
    return new URL(favicon.getAttribute('href')!, window.location.href).href;
  }

  // Default favicon path
  return new URL('/favicon.ico', window.location.origin).href;
}
```

### 3.2 Markdown Output

```markdown
---
title: "Article Title"
url: https://example.com/article
clipped_at: 2026-01-17T10:30:00Z
type: bookmark
---

# [Article Title](https://example.com/article)

> Brief excerpt from the page description or first paragraph...

*Bookmarked from example.com*
```

---

## 4. Screenshot Mode

### 4.1 Visible Viewport Capture

Uses `chrome.tabs.captureVisibleTab()` from background script.

**src/background.ts** (additions):
```typescript
async function captureScreenshot(): Promise<ScreenshotResult> {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.id) {
    throw new Error('No active tab');
  }

  // Capture visible area
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
    format: 'png',
    quality: 100
  });

  // Extract base64 data
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');

  // Get dimensions from the image
  const dimensions = await getImageDimensions(dataUrl);

  return {
    title: tab.title || 'Screenshot',
    url: tab.url || '',
    image: {
      filename: `screenshot-${Date.now()}.png`,
      data: base64,
      width: dimensions.width,
      height: dimensions.height,
      format: 'png'
    }
  };
}

async function getImageDimensions(dataUrl: string): Promise<{width: number; height: number}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.src = dataUrl;
  });
}
```

### 4.2 Screenshot Compression

**src/capture/screenshot.ts**:
```typescript
export async function compressScreenshot(
  base64Data: string,
  config: { maxSizeBytes: number; maxDimensionPx: number }
): Promise<{ data: string; format: 'png' | 'jpeg' }> {
  // Decode base64 to blob
  const blob = await fetch(`data:image/png;base64,${base64Data}`).then(r => r.blob());

  // Create image bitmap
  const img = await createImageBitmap(blob);
  const { width, height } = img;

  // Calculate new dimensions if needed
  let newWidth = width;
  let newHeight = height;
  const maxDim = config.maxDimensionPx;

  if (width > maxDim || height > maxDim) {
    if (width > height) {
      newWidth = maxDim;
      newHeight = Math.round((height / width) * maxDim);
    } else {
      newHeight = maxDim;
      newWidth = Math.round((width / height) * maxDim);
    }
  }

  // Draw to canvas
  const canvas = new OffscreenCanvas(newWidth, newHeight);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, newWidth, newHeight);

  // Try PNG first
  let resultBlob = await canvas.convertToBlob({ type: 'image/png' });

  // If too large, convert to JPEG with quality reduction
  let quality = 0.92;
  while (resultBlob.size > config.maxSizeBytes && quality > 0.5) {
    resultBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    quality -= 0.1;
  }

  // Convert to base64
  const arrayBuffer = await resultBlob.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  return {
    data: base64,
    format: resultBlob.type === 'image/jpeg' ? 'jpeg' : 'png'
  };
}
```

### 4.3 Markdown Output

```markdown
---
title: "Page Title - Screenshot"
url: https://example.com/page
clipped_at: 2026-01-17T10:30:00Z
type: screenshot
dimensions: 1920x1080
---

# Page Title

![Screenshot](media/screenshot-1705487400000.png)

*Screenshot captured from example.com*
```

---

## 5. Selection Mode

### 5.1 Element Selection UI

Inject an overlay that allows users to hover and click to select elements.

**src/capture/selection-overlay.ts**:
```typescript
export class SelectionOverlay {
  private overlay: HTMLDivElement;
  private highlightBox: HTMLDivElement;
  private selectedElement: HTMLElement | null = null;
  private onSelect: (element: HTMLElement) => void;
  private onCancel: () => void;

  constructor(onSelect: (el: HTMLElement) => void, onCancel: () => void) {
    this.onSelect = onSelect;
    this.onCancel = onCancel;
    this.overlay = this.createOverlay();
    this.highlightBox = this.createHighlightBox();

    this.attachEventListeners();
  }

  private createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.id = 'web-clipper-selection-overlay';
    overlay.innerHTML = `
      <style>
        #web-clipper-selection-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2147483647;
          pointer-events: none;
        }
        #web-clipper-highlight-box {
          position: absolute;
          border: 2px solid #3b82f6;
          background: rgba(59, 130, 246, 0.1);
          pointer-events: none;
          transition: all 0.1s ease;
        }
        #web-clipper-toolbar {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          padding: 12px 20px;
          display: flex;
          gap: 12px;
          align-items: center;
          pointer-events: auto;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          z-index: 2147483647;
        }
        #web-clipper-toolbar button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        #web-clipper-toolbar .confirm {
          background: #3b82f6;
          color: white;
        }
        #web-clipper-toolbar .cancel {
          background: #f3f4f6;
          color: #374151;
        }
      </style>
      <div id="web-clipper-highlight-box"></div>
      <div id="web-clipper-toolbar">
        <span>Click an element to select it</span>
        <button class="confirm" id="web-clipper-confirm" disabled>Clip Selection</button>
        <button class="cancel" id="web-clipper-cancel">Cancel</button>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  private createHighlightBox(): HTMLDivElement {
    return this.overlay.querySelector('#web-clipper-highlight-box') as HTMLDivElement;
  }

  private attachEventListeners(): void {
    // Mouse move - highlight hovered element
    document.addEventListener('mousemove', this.handleMouseMove, true);

    // Click - select element
    document.addEventListener('click', this.handleClick, true);

    // Keyboard - Escape to cancel
    document.addEventListener('keydown', this.handleKeyDown, true);

    // Toolbar buttons
    this.overlay.querySelector('#web-clipper-confirm')?.addEventListener('click', () => {
      if (this.selectedElement) {
        this.cleanup();
        this.onSelect(this.selectedElement);
      }
    });

    this.overlay.querySelector('#web-clipper-cancel')?.addEventListener('click', () => {
      this.cleanup();
      this.onCancel();
    });
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;

    // Ignore our own overlay elements
    if (target?.closest('#web-clipper-selection-overlay')) return;

    // Ignore tiny elements
    if (target && target.offsetWidth > 20 && target.offsetHeight > 20) {
      this.highlightElement(target);
    }
  };

  private handleClick = (e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();

    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;

    // Ignore our own overlay elements
    if (target?.closest('#web-clipper-selection-overlay')) return;

    if (target) {
      this.selectedElement = target;
      this.highlightBox.style.borderColor = '#22c55e';
      this.highlightBox.style.background = 'rgba(34, 197, 94, 0.1)';

      const confirmBtn = this.overlay.querySelector('#web-clipper-confirm') as HTMLButtonElement;
      confirmBtn.disabled = false;
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.cleanup();
      this.onCancel();
    }
  };

  private highlightElement(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    this.highlightBox.style.top = `${rect.top + window.scrollY}px`;
    this.highlightBox.style.left = `${rect.left + window.scrollX}px`;
    this.highlightBox.style.width = `${rect.width}px`;
    this.highlightBox.style.height = `${rect.height}px`;
  }

  private cleanup(): void {
    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
    this.overlay.remove();
  }
}
```

### 5.2 Element Capture

**src/capture/selection.ts**:
```typescript
import TurndownService from 'turndown';
import { ImagePayload } from '../types';

export interface SelectionCapture {
  html: string;
  markdown: string;
  images: ImagePayload[];
  selector: string;
}

export async function captureSelection(
  element: HTMLElement,
  config: { maxDimensionPx: number; maxSizeBytes: number }
): Promise<SelectionCapture> {
  // Clone the element
  const clone = element.cloneNode(true) as HTMLElement;

  // Get unique selector for reference
  const selector = getUniqueSelector(element);

  // Extract images
  const imageMap = new Map<string, string>();
  const imgElements = clone.querySelectorAll('img');
  let imageIndex = 0;

  imgElements.forEach((img) => {
    const src = img.getAttribute('src');
    if (src && !src.startsWith('data:')) {
      // Resolve relative URLs
      const absoluteUrl = new URL(src, window.location.href).href;
      const ext = getImageExtension(absoluteUrl);
      const filename = `image${++imageIndex}${ext}`;
      imageMap.set(absoluteUrl, filename);
      img.setAttribute('src', `media/${filename}`);
    }
  });

  // Get HTML
  const html = clone.outerHTML;

  // Convert to Markdown
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  });
  const markdown = turndown.turndown(html);

  // Fetch images
  const images = await fetchImages(imageMap, config);

  return { html, markdown, images, selector };
}

function getUniqueSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`;
  }

  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.className) {
      const classes = current.className.split(' ')
        .filter(c => c && !c.startsWith('web-clipper'))
        .slice(0, 2)
        .join('.');
      if (classes) selector += `.${classes}`;
    }

    // Add nth-child if needed for uniqueness
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        c => c.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

function getImageExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return '.' + ext;
    }
  } catch {
    // Invalid URL
  }
  return '.jpg';
}

async function fetchImages(
  imageMap: Map<string, string>,
  config: { maxDimensionPx: number; maxSizeBytes: number }
): Promise<ImagePayload[]> {
  const images: ImagePayload[] = [];

  for (const [url, filename] of imageMap) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;

      const blob = await response.blob();
      const img = await createImageBitmap(blob);

      // Resize if needed
      let { width, height } = img;
      const maxDim = config.maxDimensionPx;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height / width) * maxDim);
          width = maxDim;
        } else {
          width = Math.round((width / height) * maxDim);
          height = maxDim;
        }
      }

      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      let resultBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });

      // Compress if too large
      let quality = 0.85;
      while (resultBlob.size > config.maxSizeBytes && quality > 0.3) {
        quality -= 0.1;
        resultBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
      }

      const arrayBuffer = await resultBlob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      images.push({ filename, data: base64, originalUrl: url });
    } catch (err) {
      console.warn(`Failed to fetch image: ${url}`, err);
    }
  }

  return images;
}
```

---

## 6. Full Page Mode

### 6.1 DOM Cloning with Style Inlining

Captures the entire page with computed styles inlined for self-contained HTML.

**src/capture/fullpage.ts**:
```typescript
import { ImagePayload } from '../types';

export interface FullPageCapture {
  html: string;
  images: ImagePayload[];
}

export async function captureFullPage(
  config: { maxDimensionPx: number; maxSizeBytes: number }
): Promise<FullPageCapture> {
  // Clone the entire document
  const docClone = document.documentElement.cloneNode(true) as HTMLElement;

  // Remove scripts and other unwanted elements
  removeUnwantedElements(docClone);

  // Inline all computed styles
  await inlineStyles(document.documentElement, docClone);

  // Process images
  const imageMap = new Map<string, string>();
  await processImages(docClone, imageMap, config);

  // Get final HTML
  const html = `<!DOCTYPE html>\n${docClone.outerHTML}`;

  // Fetch images
  const images = await fetchImagesForFullPage(imageMap, config);

  return { html, images };
}

function removeUnwantedElements(root: HTMLElement): void {
  const selectorsToRemove = [
    'script',
    'noscript',
    'style[data-styled]', // Styled-components runtime
    'link[rel="preload"]',
    'link[rel="prefetch"]',
    'iframe[src*="ads"]',
    '[aria-hidden="true"]',
    '.ad, .ads, .advertisement',
    '#web-clipper-selection-overlay'
  ];

  selectorsToRemove.forEach(selector => {
    root.querySelectorAll(selector).forEach(el => el.remove());
  });
}

async function inlineStyles(
  originalRoot: HTMLElement,
  cloneRoot: HTMLElement
): Promise<void> {
  const originalElements = originalRoot.querySelectorAll('*');
  const cloneElements = cloneRoot.querySelectorAll('*');

  // Process in batches to avoid blocking
  const batchSize = 100;
  for (let i = 0; i < originalElements.length; i += batchSize) {
    const batch = Array.from(originalElements).slice(i, i + batchSize);

    batch.forEach((originalEl, j) => {
      const cloneEl = cloneElements[i + j] as HTMLElement;
      if (!cloneEl || !(originalEl instanceof HTMLElement)) return;

      // Get computed styles
      const computed = window.getComputedStyle(originalEl);

      // Only inline essential styles
      const essentialProps = [
        'display', 'position', 'top', 'left', 'right', 'bottom',
        'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
        'margin', 'padding', 'border', 'border-radius',
        'background', 'background-color', 'background-image',
        'color', 'font-family', 'font-size', 'font-weight', 'line-height',
        'text-align', 'text-decoration', 'white-space',
        'flex', 'flex-direction', 'justify-content', 'align-items',
        'grid', 'grid-template-columns', 'grid-template-rows', 'gap',
        'overflow', 'opacity', 'visibility', 'z-index',
        'box-shadow', 'transform'
      ];

      const styles: string[] = [];
      essentialProps.forEach(prop => {
        const value = computed.getPropertyValue(prop);
        if (value && value !== 'none' && value !== 'auto' && value !== 'normal') {
          styles.push(`${prop}: ${value}`);
        }
      });

      if (styles.length > 0) {
        cloneEl.setAttribute('style', styles.join('; '));
      }
    });

    // Yield to prevent blocking
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

async function processImages(
  root: HTMLElement,
  imageMap: Map<string, string>,
  config: { maxDimensionPx: number; maxSizeBytes: number }
): Promise<void> {
  const images = root.querySelectorAll('img');
  let index = 0;

  images.forEach(img => {
    const src = img.getAttribute('src') || img.getAttribute('data-src');
    if (src && !src.startsWith('data:')) {
      try {
        const absoluteUrl = new URL(src, window.location.href).href;
        const ext = src.match(/\.(png|jpg|jpeg|gif|webp|svg)/i)?.[1] || 'jpg';
        const filename = `image${++index}.${ext}`;
        imageMap.set(absoluteUrl, filename);
        img.setAttribute('src', `media/${filename}`);
        img.removeAttribute('srcset');
        img.removeAttribute('data-src');
      } catch {
        // Invalid URL
      }
    }
  });

  // Also handle background images in inline styles
  root.querySelectorAll('[style*="background"]').forEach(el => {
    const style = el.getAttribute('style') || '';
    const urlMatch = style.match(/url\(['"]?([^'"()]+)['"]?\)/);
    if (urlMatch && !urlMatch[1].startsWith('data:')) {
      try {
        const absoluteUrl = new URL(urlMatch[1], window.location.href).href;
        const ext = urlMatch[1].match(/\.(png|jpg|jpeg|gif|webp|svg)/i)?.[1] || 'jpg';
        const filename = `bg${++index}.${ext}`;
        imageMap.set(absoluteUrl, filename);
        const newStyle = style.replace(urlMatch[0], `url('media/${filename}')`);
        el.setAttribute('style', newStyle);
      } catch {
        // Invalid URL
      }
    }
  });
}

async function fetchImagesForFullPage(
  imageMap: Map<string, string>,
  config: { maxDimensionPx: number; maxSizeBytes: number }
): Promise<ImagePayload[]> {
  const images: ImagePayload[] = [];

  for (const [url, filename] of imageMap) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;

      const blob = await response.blob();

      // For SVGs, just convert to base64 without processing
      if (blob.type === 'image/svg+xml') {
        const text = await blob.text();
        const base64 = btoa(unescape(encodeURIComponent(text)));
        images.push({ filename, data: base64, originalUrl: url });
        continue;
      }

      const img = await createImageBitmap(blob);
      let { width, height } = img;
      const maxDim = config.maxDimensionPx;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height / width) * maxDim);
          width = maxDim;
        } else {
          width = Math.round((width / height) * maxDim);
          height = maxDim;
        }
      }

      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      const resultBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
      const arrayBuffer = await resultBlob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      images.push({ filename, data: base64, originalUrl: url });
    } catch (err) {
      console.warn(`Failed to process image: ${url}`, err);
    }
  }

  return images;
}
```

---

## 7. Popup UI Updates

### 7.1 Mode Selector Component

**src/popup/popup.html** (updated):
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      width: 360px;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
    }

    /* Mode selector */
    .mode-selector {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    .mode-btn {
      flex: 1;
      padding: 12px 8px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
    }
    .mode-btn:hover {
      border-color: #3b82f6;
      background: #eff6ff;
    }
    .mode-btn.active {
      border-color: #3b82f6;
      background: #eff6ff;
    }
    .mode-btn .icon {
      font-size: 24px;
      display: block;
      margin-bottom: 4px;
    }
    .mode-btn .label {
      font-size: 11px;
      color: #6b7280;
    }
    .mode-btn.active .label {
      color: #3b82f6;
      font-weight: 500;
    }

    /* Rest of styles unchanged... */
    .header { display: flex; align-items: center; margin-bottom: 16px; }
    .header h1 { margin: 0; font-size: 18px; flex: 1; }
    .status { font-size: 12px; color: #666; }
    .status.connected { color: #22c55e; }
    .form-group { margin-bottom: 12px; }
    label { display: block; margin-bottom: 4px; font-weight: 500; }
    input, textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
    }
    .btn {
      width: 100%;
      padding: 10px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }
    .btn-primary { background: #3b82f6; color: white; }
    .btn-primary:hover { background: #2563eb; }
    .btn-primary:disabled { background: #9ca3af; cursor: not-allowed; }
    .message { margin-top: 12px; padding: 8px; border-radius: 4px; font-size: 13px; }
    .message.success { background: #dcfce7; color: #166534; }
    .message.error { background: #fee2e2; color: #991b1b; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Web Clipper</h1>
    <span id="status" class="status">Not connected</span>
  </div>

  <!-- Login Section -->
  <div id="login-section" class="hidden">
    <div class="form-group">
      <label for="server-url">Server URL</label>
      <input type="url" id="server-url" placeholder="https://clipper.example.com">
    </div>
    <button id="login-btn" class="btn btn-primary">Connect & Login</button>
  </div>

  <!-- Clip Section -->
  <div id="clip-section" class="hidden">
    <!-- Mode Selector -->
    <div class="mode-selector">
      <button class="mode-btn active" data-mode="article">
        <span class="icon">📄</span>
        <span class="label">Article</span>
      </button>
      <button class="mode-btn" data-mode="bookmark">
        <span class="icon">🔖</span>
        <span class="label">Bookmark</span>
      </button>
      <button class="mode-btn" data-mode="screenshot">
        <span class="icon">📷</span>
        <span class="label">Screenshot</span>
      </button>
      <button class="mode-btn" data-mode="selection">
        <span class="icon">✂️</span>
        <span class="label">Selection</span>
      </button>
    </div>

    <div class="form-group">
      <label for="title">Title</label>
      <input type="text" id="title">
    </div>
    <div class="form-group" id="tags-group">
      <label for="tags">Tags (comma-separated)</label>
      <input type="text" id="tags" placeholder="tech, tutorial">
    </div>
    <div class="form-group" id="notes-group">
      <label for="notes">Notes</label>
      <textarea id="notes" rows="2" placeholder="Optional notes..."></textarea>
    </div>

    <button id="clip-btn" class="btn btn-primary">Clip This Page</button>
    <button id="logout-btn" class="btn" style="margin-top: 8px; background: #f3f4f6;">Logout</button>
  </div>

  <div id="message" class="message hidden"></div>

  <script src="popup.js"></script>
</body>
</html>
```

### 7.2 Mode Handling Logic

**src/popup/popup.ts** (updated sections):
```typescript
import { ClipMode, CaptureResult, ClipPayload } from '../types';

let currentMode: ClipMode = 'article';

// Mode selector handlers
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Update active state
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    currentMode = btn.getAttribute('data-mode') as ClipMode;

    // Update UI based on mode
    updateUIForMode(currentMode);
  });
});

function updateUIForMode(mode: ClipMode): void {
  const tagsGroup = document.getElementById('tags-group')!;
  const notesGroup = document.getElementById('notes-group')!;
  const clipBtn = document.getElementById('clip-btn')!;

  switch (mode) {
    case 'bookmark':
      clipBtn.textContent = 'Save Bookmark';
      break;
    case 'screenshot':
      clipBtn.textContent = 'Capture Screenshot';
      break;
    case 'selection':
      clipBtn.textContent = 'Select Element';
      break;
    case 'fullpage':
      clipBtn.textContent = 'Capture Full Page';
      break;
    default:
      clipBtn.textContent = 'Clip Article';
  }
}

// Updated clip handler
clipBtn.addEventListener('click', async () => {
  clipBtn.setAttribute('disabled', 'true');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) throw new Error('No active tab');

    let result: CaptureResult;

    switch (currentMode) {
      case 'bookmark':
        result = await chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_BOOKMARK' });
        break;

      case 'screenshot':
        result = await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' });
        break;

      case 'selection':
        // Close popup and start selection mode
        await chrome.tabs.sendMessage(tab.id, { type: 'START_SELECTION_MODE' });
        window.close();
        return;

      case 'fullpage':
        result = await chrome.tabs.sendMessage(tab.id, {
          type: 'CAPTURE_FULLPAGE',
          config: captureConfig
        });
        break;

      default: // article
        result = await chrome.tabs.sendMessage(tab.id, {
          type: 'CAPTURE_PAGE',
          payload: captureConfig
        });
    }

    // Build and submit payload
    const payload: ClipPayload = {
      title: titleInput.value || result.title,
      url: result.url,
      markdown: result.markdown || '',
      tags: tagsInput.value.split(',').map(t => t.trim()).filter(Boolean),
      notes: notesInput.value.trim(),
      images: result.images || []
    };

    // Add screenshot as image if present
    if (result.screenshot) {
      payload.images.push({
        filename: result.screenshot.filename,
        data: result.screenshot.data,
        originalUrl: ''
      });
    }

    const response = await chrome.runtime.sendMessage({
      type: 'SUBMIT_CLIP',
      payload
    });

    if (response.success) {
      showMessage(`Saved to: ${response.path}`, 'success');
    } else {
      showMessage(response.error || 'Failed to save', 'error');
    }
  } catch (err) {
    showMessage(`Error: ${err}`, 'error');
  } finally {
    clipBtn.removeAttribute('disabled');
  }
});
```

---

## 8. Content Script Updates

### 8.1 Message Router

**src/content.ts** (updated):
```typescript
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { captureBookmark } from './capture/bookmark';
import { captureSelection, SelectionOverlay } from './capture/selection';
import { captureFullPage } from './capture/fullpage';
import { CaptureResult, Message } from './types';

let selectionOverlay: SelectionOverlay | null = null;

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch(err => {
    sendResponse({ error: err.message });
  });
  return true; // Async response
});

async function handleMessage(message: Message): Promise<unknown> {
  const config = (message.payload as any)?.config || {
    maxDimensionPx: 2048,
    maxSizeBytes: 5242880
  };

  switch (message.type) {
    case 'CAPTURE_PAGE':
      return captureArticle(config);

    case 'CAPTURE_BOOKMARK':
      return {
        mode: 'bookmark',
        ...captureBookmark(),
        images: []
      };

    case 'CAPTURE_FULLPAGE':
      const fullPage = await captureFullPage(config);
      return {
        mode: 'fullpage',
        title: document.title,
        url: window.location.href,
        html: fullPage.html,
        images: fullPage.images
      };

    case 'START_SELECTION_MODE':
      startSelectionMode(config);
      return { started: true };

    case 'CANCEL_SELECTION_MODE':
      if (selectionOverlay) {
        selectionOverlay = null;
      }
      return { cancelled: true };

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

function startSelectionMode(config: { maxDimensionPx: number; maxSizeBytes: number }): void {
  selectionOverlay = new SelectionOverlay(
    async (element) => {
      const result = await captureSelection(element, config);

      // Send result back to background/popup
      chrome.runtime.sendMessage({
        type: 'SELECTION_COMPLETE',
        payload: {
          mode: 'selection',
          title: document.title,
          url: window.location.href,
          markdown: result.markdown,
          html: result.html,
          images: result.images,
          selector: result.selector
        }
      });

      selectionOverlay = null;
    },
    () => {
      chrome.runtime.sendMessage({ type: 'SELECTION_CANCELLED' });
      selectionOverlay = null;
    }
  );
}

// Existing captureArticle function remains unchanged
async function captureArticle(config: { maxDimensionPx: number; maxSizeBytes: number }): Promise<CaptureResult> {
  // ... existing Readability-based implementation
}
```

---

## 9. Server Updates

### 9.1 Extended Clip Payload

**actions/clips.go** (updates):
```go
type ClipRequest struct {
    Title    string        `json:"title"`
    URL      string        `json:"url"`
    Markdown string        `json:"markdown"`
    HTML     string        `json:"html,omitempty"`     // For fullpage mode
    Tags     []string      `json:"tags"`
    Notes    string        `json:"notes"`
    Images   []ImageUpload `json:"images"`
    Mode     string        `json:"mode"`               // article, bookmark, screenshot, selection, fullpage
}

func createClip(c buffalo.Context) error {
    var req ClipRequest
    if err := c.Bind(&req); err != nil {
        return c.Render(400, r.JSON(ClipResponse{
            Success: false,
            Error:   "Invalid request body",
        }))
    }

    // Set default mode
    if req.Mode == "" {
        req.Mode = "article"
    }

    // ... existing validation ...

    // Generate content based on mode
    var content string
    var fileExt string

    switch req.Mode {
    case "fullpage":
        content = req.HTML
        fileExt = ".html"
    case "screenshot":
        content = generateScreenshotMarkdown(req)
        fileExt = ".md"
    default:
        content = generateFrontmatter(req) + "\n" + req.Markdown
        fileExt = ".md"
    }

    // ... rest of file saving logic with fileExt ...
}

func generateScreenshotMarkdown(req ClipRequest) string {
    var sb strings.Builder
    sb.WriteString("---\n")
    sb.WriteString(fmt.Sprintf("title: %q\n", req.Title))
    sb.WriteString(fmt.Sprintf("url: %s\n", req.URL))
    sb.WriteString(fmt.Sprintf("clipped_at: %s\n", time.Now().Format(time.RFC3339)))
    sb.WriteString("type: screenshot\n")
    sb.WriteString("---\n\n")
    sb.WriteString(fmt.Sprintf("# %s\n\n", req.Title))

    if len(req.Images) > 0 {
        sb.WriteString(fmt.Sprintf("![Screenshot](media/%s)\n\n", req.Images[0].Filename))
    }

    sb.WriteString(fmt.Sprintf("*Screenshot captured from %s*\n", extractDomain(req.URL)))
    return sb.String()
}
```

---

## 10. Acceptance Criteria

| ID | Criterion | Test |
|----|-----------|------|
| AC1 | Mode selector visible in popup | 4 mode buttons shown, article active by default |
| AC2 | Bookmark mode captures URL + excerpt | Only URL, title, excerpt saved (no images) |
| AC3 | Screenshot captures visible viewport | PNG/JPEG image saved in media folder |
| AC4 | Selection mode shows overlay | Hover highlights elements, click selects |
| AC5 | Selected element captured as Markdown | HTML converted, images extracted |
| AC6 | Full page includes inlined styles | HTML renders correctly when opened standalone |
| AC7 | Screenshot compressed if oversized | Images reduced to meet size limits |
| AC8 | Server accepts all clip modes | Mode field stored, appropriate file extension used |

---

## 11. Implementation Order

### Phase 2a: Foundation
1. Add `ClipMode` types and message types
2. Update popup UI with mode selector
3. Implement bookmark mode (simplest)

### Phase 2b: Screenshot
4. Add `captureVisibleTab` in background script
5. Implement screenshot compression
6. Update server to handle screenshot clips

### Phase 2c: Selection
7. Create selection overlay UI
8. Implement element capture with style extraction
9. Handle selection completion flow

### Phase 2d: Full Page
10. Implement DOM cloning
11. Add style inlining
12. Process images and background images

### Phase 2e: Integration
13. Update content script message router
14. Test all modes end-to-end
15. Add error handling and edge cases

---

## 12. Dependencies

### New Extension Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| (none new) | - | All existing deps sufficient |

### Browser APIs Used

| API | Permission | Purpose |
|-----|------------|---------|
| `chrome.tabs.captureVisibleTab` | `activeTab` | Screenshot capture |
| `chrome.scripting.executeScript` | `scripting` | Inject selection overlay |
| `OffscreenCanvas` | (none) | Image processing |

---

## 13. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| CORS blocks image fetching | Images missing in clips | Use background script fetch with `webRequest` |
| Style inlining slow on large pages | Poor UX | Batch processing, progress indicator |
| Selection overlay conflicts with page JS | Broken selection | Use Shadow DOM for overlay |
| Full page HTML too large | Server rejection | Compress/truncate, set reasonable limits |
| `captureVisibleTab` fails on some pages | No screenshot | Fallback to DOM-to-image approach |

---

## 14. Design System

### 14.1 Design Tokens

#### Colors

```typescript
const colors = {
  // Primary - Blue
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',  // Main action color
    600: '#2563eb',  // Hover state
    700: '#1d4ed8',  // Active state
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Success - Green
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',  // Selection confirmed
    600: '#16a34a',
    700: '#15803d',
  },

  // Warning - Amber
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
  },

  // Error - Red
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },

  // Neutral - Gray
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};

// Dark mode mappings
const darkColors = {
  background: colors.neutral[900],
  surface: colors.neutral[800],
  border: colors.neutral[700],
  textPrimary: colors.neutral[100],
  textSecondary: colors.neutral[400],
};
```

#### Typography

```typescript
const typography = {
  fontFamily: {
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'SF Mono', Monaco, 'Cascadia Code', monospace",
  },

  fontSize: {
    xs: '11px',
    sm: '12px',
    base: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '24px',
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};
```

#### Spacing

```typescript
const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
};

// Component-specific spacing
const componentSpacing = {
  popup: {
    padding: spacing[4],     // 16px
    width: '360px',
    maxHeight: '500px',
  },
  modeButton: {
    padding: `${spacing[3]} ${spacing[2]}`,  // 12px 8px
    gap: spacing[2],
  },
  formGroup: {
    marginBottom: spacing[3],  // 12px
  },
  overlay: {
    toolbarPadding: `${spacing[3]} ${spacing[5]}`,  // 12px 20px
  },
};
```

#### Shadows

```typescript
const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 4px 12px rgba(0, 0, 0, 0.15)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
};

// Dark mode shadows
const darkShadows = {
  lg: '0 4px 12px rgba(0, 0, 0, 0.4)',
};
```

#### Border Radius

```typescript
const borderRadius = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
};
```

### 14.2 Component Specifications

#### Mode Selector Buttons

```css
/* Base state */
.mode-btn {
  flex: 1;
  padding: 12px 8px;
  border: 2px solid var(--neutral-200);
  border-radius: 8px;
  background: white;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s ease;
  min-width: 72px;
}

/* Hover state */
.mode-btn:hover {
  border-color: var(--primary-400);
  background: var(--primary-50);
}

/* Focus state - Accessibility */
.mode-btn:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}

/* Active/Selected state */
.mode-btn.active {
  border-color: var(--primary-500);
  background: var(--primary-50);
}

/* Disabled state */
.mode-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* Icon */
.mode-btn .icon {
  font-size: 20px;
  display: block;
  margin-bottom: 4px;
}

/* Label */
.mode-btn .label {
  font-size: 11px;
  color: var(--neutral-500);
  font-weight: 500;
}

.mode-btn.active .label {
  color: var(--primary-600);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .mode-btn {
    background: var(--neutral-800);
    border-color: var(--neutral-700);
    color: var(--neutral-200);
  }
  .mode-btn:hover {
    background: var(--neutral-700);
  }
}
```

#### Primary Button States

| State | Background | Border | Text | Cursor |
|-------|-----------|--------|------|--------|
| Default | primary-500 | none | white | pointer |
| Hover | primary-600 | none | white | pointer |
| Active | primary-700 | none | white | pointer |
| Focus | primary-500 | 2px primary-300 ring | white | pointer |
| Disabled | neutral-300 | none | neutral-500 | not-allowed |
| Loading | primary-500 + spinner | none | hidden | wait |

#### Input Fields

```css
input, textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--neutral-300);
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--neutral-900);
  background: white;
  transition: border-color 0.15s, box-shadow 0.15s;
}

input:hover {
  border-color: var(--neutral-400);
}

input:focus {
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px var(--primary-100);
  outline: none;
}

input::placeholder {
  color: var(--neutral-400);
}

/* Error state */
input.error {
  border-color: var(--error-500);
}

input.error:focus {
  box-shadow: 0 0 0 3px var(--error-100);
}
```

### 14.3 Icon Specifications

| Mode | Icon | Alt Text | Size |
|------|------|----------|------|
| Article | 📄 or SVG doc icon | "Article mode" | 20px |
| Bookmark | 🔖 or SVG bookmark | "Bookmark mode" | 20px |
| Screenshot | 📷 or SVG camera | "Screenshot mode" | 20px |
| Selection | ✂️ or SVG selection | "Selection mode" | 20px |
| Full Page | 📃 or SVG full-page | "Full page mode" | 20px |

**SVG Icon Guidelines:**
- Stroke width: 1.5px
- Viewbox: 0 0 24 24
- Color: currentColor (inherits from parent)
- Accessible via aria-hidden="true" with adjacent text label

---

## 15. UX Flow Specifications

### 15.1 User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        POPUP OPENED                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                        │
│  │ 📄  │ │ 🔖  │ │ 📷  │ │ ✂️  │ │ 📃  │   ← Keyboard nav: 1-5   │
│  │ Art │ │Book │ │Shot │ │ Sel │ │Full │                        │
│  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘                        │
│     │       │       │       │       │                            │
│     ▼       ▼       ▼       ▼       ▼                            │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ [Title                                              ]│       │
│  │ [Tags                                               ]│       │
│  │ [Notes                                              ]│       │
│  │                                                      │       │
│  │ [████████████ Clip This Page ████████████████████████│       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
    ┌─────────┐         ┌─────────┐         ┌─────────┐
    │ CAPTURE │         │SELECTION│         │ ERROR   │
    │ LOADING │         │ OVERLAY │         │ STATE   │
    └────┬────┘         └────┬────┘         └────┬────┘
         │                   │                   │
         ▼                   ▼                   ▼
    ┌─────────┐         ┌─────────┐         ┌─────────┐
    │ SUCCESS │         │ CONFIRM │         │ RETRY   │
    │ MESSAGE │         │ CAPTURE │         │ OPTION  │
    └─────────┘         └─────────┘         └─────────┘
```

### 15.2 State Transitions

#### Popup States

| State | UI Display | Entry Condition | Exit Actions |
|-------|------------|-----------------|--------------|
| `idle` | Mode selector, form fields enabled | Popup opens | User clicks clip button |
| `capturing` | Spinner on button, form disabled | Clip initiated | Capture completes/fails |
| `success` | Green checkmark, success message | Capture + save successful | Auto-close after 2s or click |
| `error` | Red alert, error message, retry button | Any operation fails | Retry or close |
| `selection-active` | Popup closes, overlay on page | Selection mode chosen | Element selected/cancelled |

#### Selection Overlay States

| State | Visual Indicator | User Input | Next State |
|-------|-----------------|------------|------------|
| `hovering` | Blue dashed outline on hovered element | Mouse move | continues |
| `selected` | Green solid outline, confirm button enabled | Click on element | `ready` |
| `ready` | "Clip Selection" button highlighted | Click confirm | closes, captures |
| `cancelled` | Overlay fades out | Press ESC or Cancel | popup reopens |

### 15.3 Keyboard Accessibility

| Key | Action | Context |
|-----|--------|---------|
| `Tab` | Navigate between mode buttons and form fields | Popup |
| `1-5` | Select mode (Article=1, Bookmark=2, etc.) | Popup focused |
| `Enter` | Activate focused button, submit form | Popup |
| `Escape` | Close popup / Cancel selection mode | Popup / Overlay |
| `Space` | Toggle mode button | Mode button focused |
| `Arrow Keys` | Navigate between mode buttons | Mode selector focused |

### 15.4 Error Handling UX

#### Error Types and User Feedback

| Error Type | Message | Action Available |
|------------|---------|------------------|
| Network failure | "Connection failed. Check your network and try again." | Retry button |
| Auth expired | "Session expired. Please reconnect." | Reconnect button |
| Capture failed | "Unable to capture this page. Try a different mode." | Mode suggestions |
| Server error | "Server unavailable. Your clip was saved locally." | View local |
| Timeout | "Capture is taking longer than expected..." | Cancel / Wait |

#### Error Message Component

```html
<div class="message error" role="alert" aria-live="polite">
  <svg class="error-icon" aria-hidden="true">...</svg>
  <div class="error-content">
    <p class="error-title">Capture Failed</p>
    <p class="error-description">Unable to capture this page content.</p>
  </div>
  <button class="retry-btn" aria-label="Retry capture">
    Retry
  </button>
</div>
```

### 15.5 Loading States

#### Capture Progress Indicator

```css
/* Button loading state */
.btn-primary.loading {
  position: relative;
  color: transparent;
  pointer-events: none;
}

.btn-primary.loading::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  top: 50%;
  left: 50%;
  margin-left: -8px;
  margin-top: -8px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spinner 0.6s linear infinite;
}

@keyframes spinner {
  to { transform: rotate(360deg); }
}
```

#### Full Page Capture Progress

For full page mode which may take longer:

```html
<div class="progress-indicator">
  <div class="progress-bar" style="width: 45%"></div>
  <span class="progress-text">Processing styles... (45%)</span>
</div>
```

### 15.6 Animation Guidelines

| Animation | Duration | Easing | Purpose |
|-----------|----------|--------|---------|
| Mode button hover | 150ms | ease-out | Feedback |
| Selection highlight | 100ms | ease | Follow cursor |
| Success checkmark | 300ms | ease-out | Celebration |
| Error shake | 400ms | ease-in-out | Alert attention |
| Overlay fade in | 200ms | ease-out | Context switch |
| Toast slide in | 250ms | ease-out | Notification |

---

## 16. Accessibility Requirements

### 16.1 WCAG 2.1 Compliance

| Criterion | Level | Implementation |
|-----------|-------|----------------|
| 1.4.3 Contrast | AA | All text meets 4.5:1 ratio |
| 2.1.1 Keyboard | A | All functions keyboard accessible |
| 2.4.3 Focus Order | A | Logical tab order in popup |
| 2.4.7 Focus Visible | AA | Clear focus indicators |
| 4.1.2 Name, Role, Value | A | ARIA labels on interactive elements |

### 16.2 ARIA Attributes

```html
<!-- Mode selector -->
<div class="mode-selector" role="tablist" aria-label="Capture mode selection">
  <button
    role="tab"
    aria-selected="true"
    aria-controls="clip-options"
    tabindex="0"
    class="mode-btn active">
    <span class="icon" aria-hidden="true">📄</span>
    <span class="label">Article</span>
  </button>
  <!-- ... other buttons with aria-selected="false" tabindex="-1" -->
</div>

<!-- Selection overlay toolbar -->
<div
  id="web-clipper-toolbar"
  role="dialog"
  aria-label="Element selection toolbar"
  aria-describedby="selection-instructions">
  <p id="selection-instructions">Click an element to select it for clipping</p>
  <button class="confirm" disabled aria-disabled="true">Clip Selection</button>
  <button class="cancel">Cancel (Esc)</button>
</div>

<!-- Status messages -->
<div id="message" class="message" role="status" aria-live="polite" aria-atomic="true">
  <!-- Dynamic content -->
</div>
```

### 16.3 Screen Reader Announcements

| Event | Announcement |
|-------|--------------|
| Mode changed | "[Mode] mode selected" |
| Capture started | "Capturing page content, please wait" |
| Capture complete | "Clip saved successfully to [path]" |
| Error occurred | "Error: [message]. Press R to retry." |
| Selection active | "Selection mode active. Click an element to select it. Press Escape to cancel." |
| Element selected | "Selected [element type]. Press Enter to confirm or continue selecting." |

---

## 17. Architectural Recommendations

### 17.1 CORS-Safe Image Fetching

Route image fetching through background script to avoid CORS issues:

**src/background.ts** (addition):
```typescript
// Handle image proxy requests from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_IMAGE') {
    fetchImage(message.url)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true; // Async response
  }
});

async function fetchImage(url: string): Promise<{ data: string; contentType: string }> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    return {
      data: base64,
      contentType: blob.type
    };
  } catch (err) {
    throw new Error(`Failed to fetch image: ${url}`);
  }
}
```

**Content script usage:**
```typescript
// Instead of direct fetch, use background proxy
async function fetchImageViaBackground(url: string): Promise<string> {
  const response = await chrome.runtime.sendMessage({
    type: 'FETCH_IMAGE',
    url
  });

  if (response.error) throw new Error(response.error);
  return response.data;
}
```

### 17.2 Shadow DOM for Selection Overlay

Isolate overlay styles from page to prevent conflicts:

**src/capture/selection-overlay.ts** (updated):
```typescript
export class SelectionOverlay {
  private shadowHost: HTMLDivElement;
  private shadowRoot: ShadowRoot;

  constructor(onSelect: (el: HTMLElement) => void, onCancel: () => void) {
    // Create shadow host
    this.shadowHost = document.createElement('div');
    this.shadowHost.id = 'web-clipper-shadow-host';
    this.shadowHost.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      z-index: 2147483647 !important;
      pointer-events: none !important;
    `;

    // Attach shadow DOM
    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'closed' });

    // Add styles and elements to shadow DOM
    this.shadowRoot.innerHTML = `
      <style>
        /* All overlay styles here - completely isolated */
        .highlight-box { ... }
        .toolbar { ... }
      </style>
      <div class="highlight-box"></div>
      <div class="toolbar">...</div>
    `;

    document.body.appendChild(this.shadowHost);
  }

  cleanup(): void {
    this.shadowHost.remove();
  }
}
```

### 17.3 Selection Mode State Persistence

Handle popup closing during selection by persisting state:

**src/background.ts** (addition):
```typescript
// Store pending selection state
let pendingSelection: {
  tabId: number;
  config: CaptureConfig;
} | null = null;

// Handle selection mode initiation
case 'START_SELECTION_MODE':
  pendingSelection = {
    tabId: sender.tab?.id!,
    config: message.config
  };
  return { started: true };

// Handle selection completion
case 'SELECTION_COMPLETE':
  if (pendingSelection) {
    const result = message.payload;
    // Build and submit clip automatically
    await submitSelectionClip(result, pendingSelection.config);
    pendingSelection = null;
  }
  return { success: true };

// Handle selection cancellation
case 'SELECTION_CANCELLED':
  pendingSelection = null;
  return { cancelled: true };
```

### 17.4 Capture Lock for Concurrent Operations

Prevent multiple simultaneous captures:

```typescript
// In background.ts
let captureInProgress = false;

async function withCaptureLock<T>(operation: () => Promise<T>): Promise<T> {
  if (captureInProgress) {
    throw new Error('Capture already in progress');
  }

  captureInProgress = true;
  try {
    return await operation();
  } finally {
    captureInProgress = false;
  }
}

// Usage
case 'CAPTURE_SCREENSHOT':
  return withCaptureLock(() => captureScreenshot());
```

### 17.5 Extended Style Inlining Properties

Expand the list of inlined CSS properties for better fidelity:

```typescript
const essentialProps = [
  // Layout
  'display', 'position', 'top', 'left', 'right', 'bottom',
  'float', 'clear', 'z-index', 'overflow', 'overflow-x', 'overflow-y',

  // Box Model
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border', 'border-width', 'border-style', 'border-color', 'border-radius',
  'box-sizing',

  // Flexbox
  'flex', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
  'justify-content', 'align-items', 'align-self', 'align-content', 'order', 'gap',

  // Grid
  'grid', 'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row',
  'grid-area', 'grid-gap', 'grid-auto-flow',

  // Typography
  'font-family', 'font-size', 'font-weight', 'font-style', 'line-height',
  'letter-spacing', 'text-align', 'text-decoration', 'text-transform',
  'white-space', 'word-wrap', 'word-break', 'text-overflow',

  // Colors & Background
  'color', 'background', 'background-color', 'background-image',
  'background-position', 'background-size', 'background-repeat',

  // Visual Effects
  'opacity', 'visibility', 'box-shadow', 'text-shadow',
  'transform', 'filter', 'backdrop-filter',

  // Table
  'border-collapse', 'border-spacing', 'table-layout',

  // List
  'list-style', 'list-style-type', 'list-style-position',
];
```
