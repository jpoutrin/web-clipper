# Web Clipper Design Guidelines

> Formalized design system for the Web Clipper Chrome extension and related UI components.

## 1. Design Principles

### 1.1 Core Values

| Principle | Description |
|-----------|-------------|
| **Clarity** | UI should be instantly understandable. Every element has a clear purpose. |
| **Speed** | Interactions feel snappy. Target < 100ms for visual feedback. |
| **Non-intrusive** | Extension overlays blend with page content, never disrupt browsing. |
| **Accessible** | WCAG 2.1 AA compliant. Keyboard navigable. Screen reader friendly. |
| **Consistent** | Same patterns across popup, overlay, and options pages. |

### 1.2 Design Philosophy

- Minimal chrome, maximum content
- System font stack for native feel
- Subtle animations, never distracting
- Dark mode respects system preference

---

## 2. Color System

### 2.1 Primary Palette (Blue)

| Token | Value | Usage |
|-------|-------|-------|
| `primary-50` | `#eff6ff` | Hover backgrounds, selected states |
| `primary-100` | `#dbeafe` | Focus rings |
| `primary-200` | `#bfdbfe` | Light accents |
| `primary-300` | `#93c5fd` | Secondary highlights |
| `primary-400` | `#60a5fa` | Hover borders |
| `primary-500` | `#3b82f6` | **Primary actions, active states** |
| `primary-600` | `#2563eb` | Hover state for primary buttons |
| `primary-700` | `#1d4ed8` | Active/pressed state |
| `primary-800` | `#1e40af` | Dark accents |
| `primary-900` | `#1e3a8a` | Darkest primary |

### 2.2 Semantic Colors

#### Success (Green)
| Token | Value | Usage |
|-------|-------|-------|
| `success-50` | `#f0fdf4` | Success message background |
| `success-100` | `#dcfce7` | Success highlight |
| `success-500` | `#22c55e` | **Success icons, confirmed states** |
| `success-600` | `#16a34a` | Success hover |
| `success-700` | `#15803d` | Success text |

#### Warning (Amber)
| Token | Value | Usage |
|-------|-------|-------|
| `warning-50` | `#fffbeb` | Warning message background |
| `warning-100` | `#fef3c7` | Warning highlight |
| `warning-500` | `#f59e0b` | **Warning icons** |
| `warning-600` | `#d97706` | Warning text |

#### Error (Red)
| Token | Value | Usage |
|-------|-------|-------|
| `error-50` | `#fef2f2` | Error message background |
| `error-100` | `#fee2e2` | Error highlight |
| `error-500` | `#ef4444` | **Error icons, destructive states** |
| `error-600` | `#dc2626` | Error hover |
| `error-700` | `#b91c1c` | Error text |

### 2.3 Neutral Palette (Gray)

| Token | Value | Usage |
|-------|-------|-------|
| `neutral-50` | `#f9fafb` | Page backgrounds |
| `neutral-100` | `#f3f4f6` | Card backgrounds, hover states |
| `neutral-200` | `#e5e7eb` | Default borders |
| `neutral-300` | `#d1d5db` | Input borders, dividers |
| `neutral-400` | `#9ca3af` | Placeholder text, disabled icons |
| `neutral-500` | `#6b7280` | Secondary text, labels |
| `neutral-600` | `#4b5563` | Icons |
| `neutral-700` | `#374151` | Body text |
| `neutral-800` | `#1f2937` | Headings |
| `neutral-900` | `#111827` | Primary text |

### 2.4 Dark Mode

When `prefers-color-scheme: dark`:

| Light Token | Dark Equivalent |
|-------------|-----------------|
| `neutral-50` (bg) | `neutral-900` |
| `neutral-100` (surface) | `neutral-800` |
| `neutral-200` (border) | `neutral-700` |
| `neutral-900` (text) | `neutral-100` |
| `neutral-700` (text-secondary) | `neutral-400` |

---

## 3. Typography

### 3.1 Font Stack

```css
/* Primary */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

/* Monospace (code, technical) */
font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Consolas', monospace;
```

### 3.2 Scale

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xs` | 11px | 1.25 | Labels, badges, timestamps |
| `text-sm` | 12px | 1.25 | Secondary text, captions |
| `text-base` | 14px | 1.5 | **Body text, inputs, buttons** |
| `text-lg` | 16px | 1.5 | Subheadings |
| `text-xl` | 18px | 1.4 | Popup title |
| `text-2xl` | 24px | 1.25 | Page headings |

### 3.3 Weights

| Token | Value | Usage |
|-------|-------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Labels, button text, emphasis |
| `font-semibold` | 600 | Subheadings |
| `font-bold` | 700 | Headings, strong emphasis |

---

## 4. Spacing System

### 4.1 Base Scale

| Token | Value | Usage |
|-------|-------|-------|
| `space-0` | 0 | Reset |
| `space-1` | 4px | Tight spacing, icon gaps |
| `space-2` | 8px | Compact padding, small gaps |
| `space-3` | 12px | Standard padding, form gaps |
| `space-4` | 16px | **Default container padding** |
| `space-5` | 20px | Large gaps |
| `space-6` | 24px | Section spacing |
| `space-8` | 32px | Major sections |

### 4.2 Component-Specific

| Component | Property | Value |
|-----------|----------|-------|
| Popup | width | 360px |
| Popup | padding | 16px |
| Popup | max-height | 500px |
| Mode button | padding | 12px 8px |
| Mode button | gap | 8px |
| Form group | margin-bottom | 12px |
| Input | padding | 8px 12px |
| Button | padding | 10px 16px |
| Overlay toolbar | padding | 12px 20px |

---

## 5. Visual Effects

### 5.1 Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px 0 rgba(0,0,0,0.05)` | Subtle lift |
| `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` | Cards, dropdowns |
| `shadow-lg` | `0 4px 12px rgba(0,0,0,0.15)` | **Popup, floating UI** |
| `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)` | Modals |

**Dark mode:** Increase opacity (e.g., `shadow-lg` becomes `rgba(0,0,0,0.4)`)

### 5.2 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 4px | Badges, small elements |
| `rounded-md` | 6px | Inputs |
| `rounded-lg` | 8px | **Buttons, cards** |
| `rounded-xl` | 12px | Large cards, modals |
| `rounded-full` | 9999px | Circular elements, pills |

### 5.3 Borders

- Default border: `1px solid neutral-300`
- Active/focus border: `2px solid primary-500`
- Error border: `1px solid error-500`

---

## 6. Component Patterns

### 6.1 Buttons

#### Primary Button
```css
.btn-primary {
  background: var(--primary-500);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}
.btn-primary:hover { background: var(--primary-600); }
.btn-primary:active { background: var(--primary-700); }
.btn-primary:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}
.btn-primary:disabled {
  background: var(--neutral-300);
  color: var(--neutral-500);
  cursor: not-allowed;
}
```

#### Secondary Button
```css
.btn-secondary {
  background: var(--neutral-100);
  color: var(--neutral-700);
  border: 1px solid var(--neutral-300);
  /* Same padding/radius as primary */
}
.btn-secondary:hover { background: var(--neutral-200); }
```

#### Button States Table

| State | Primary BG | Primary Text | Secondary BG |
|-------|-----------|--------------|--------------|
| Default | primary-500 | white | neutral-100 |
| Hover | primary-600 | white | neutral-200 |
| Active | primary-700 | white | neutral-300 |
| Disabled | neutral-300 | neutral-500 | neutral-100 (0.5 opacity) |
| Loading | primary-500 + spinner | transparent | neutral-100 + spinner |

### 6.2 Inputs

```css
input, textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--neutral-300);
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.5;
  background: white;
  transition: border-color 0.15s, box-shadow 0.15s;
}
input:hover { border-color: var(--neutral-400); }
input:focus {
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px var(--primary-100);
  outline: none;
}
input::placeholder { color: var(--neutral-400); }
input.error { border-color: var(--error-500); }
input.error:focus { box-shadow: 0 0 0 3px var(--error-100); }
```

### 6.3 Mode Selector Buttons

```css
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
.mode-btn:hover {
  border-color: var(--primary-400);
  background: var(--primary-50);
}
.mode-btn.active {
  border-color: var(--primary-500);
  background: var(--primary-50);
}
.mode-btn .icon { font-size: 20px; margin-bottom: 4px; }
.mode-btn .label { font-size: 11px; color: var(--neutral-500); }
.mode-btn.active .label { color: var(--primary-600); font-weight: 500; }
```

### 6.4 Messages / Alerts

```css
.message {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.message.success {
  background: var(--success-50);
  color: var(--success-700);
  border: 1px solid var(--success-200);
}
.message.error {
  background: var(--error-50);
  color: var(--error-700);
  border: 1px solid var(--error-200);
}
.message.warning {
  background: var(--warning-50);
  color: var(--warning-700);
  border: 1px solid var(--warning-200);
}
```

---

## 7. Animation Guidelines

### 7.1 Timing

| Type | Duration | Easing |
|------|----------|--------|
| Micro-interaction (hover, focus) | 100-150ms | `ease-out` |
| State change (toggle, select) | 150-200ms | `ease` |
| Entrance (fade in, slide) | 200-250ms | `ease-out` |
| Exit (fade out) | 150ms | `ease-in` |
| Complex (progress, loading) | 300-600ms | `linear` (loops) |

### 7.2 Common Animations

```css
/* Loading spinner */
@keyframes spinner {
  to { transform: rotate(360deg); }
}
.loading::after {
  animation: spinner 0.6s linear infinite;
}

/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slideUp {
  from { transform: translateY(8px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Error shake */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
```

### 7.3 Rules

- Never animate on `prefers-reduced-motion: reduce`
- Avoid animating layout properties (width, height) - use transforms
- Loading states should provide visual feedback within 100ms

---

## 8. Accessibility

### 8.1 WCAG 2.1 AA Requirements

| Requirement | Implementation |
|-------------|----------------|
| Color contrast (text) | 4.5:1 minimum for normal text |
| Color contrast (large text) | 3:1 minimum for 18px+ or 14px bold |
| Focus indicators | 2px solid outline, visible on all backgrounds |
| Keyboard navigation | All interactive elements reachable via Tab |
| Screen reader labels | ARIA labels on icons, buttons without text |

### 8.2 Focus States

```css
/* Default focus visible */
:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}

/* High contrast mode */
@media (forced-colors: active) {
  :focus-visible {
    outline: 3px solid CanvasText;
  }
}
```

### 8.3 ARIA Patterns

```html
<!-- Icon-only button -->
<button aria-label="Close dialog">
  <svg aria-hidden="true">...</svg>
</button>

<!-- Mode selector as tablist -->
<div role="tablist" aria-label="Capture mode">
  <button role="tab" aria-selected="true">Article</button>
  <button role="tab" aria-selected="false">Bookmark</button>
</div>

<!-- Status messages -->
<div role="status" aria-live="polite">Clip saved successfully</div>

<!-- Error messages -->
<div role="alert" aria-live="assertive">Failed to save clip</div>
```

---

## 9. Icons

### 9.1 Specifications

| Property | Value |
|----------|-------|
| Default size | 20px |
| Stroke width | 1.5px |
| Viewbox | 0 0 24 24 |
| Color | `currentColor` |

### 9.2 Mode Icons

| Mode | Icon | Emoji Fallback |
|------|------|----------------|
| Article | Document with lines | 📄 |
| Bookmark | Bookmark ribbon | 🔖 |
| Screenshot | Camera | 📷 |
| Selection | Scissors/crop | ✂️ |
| Full Page | Full document | 📃 |

### 9.3 Icon Guidelines

- Always pair with visible text label for accessibility
- Use `aria-hidden="true"` when decorative
- Consistent visual weight across icon set
- Test at multiple sizes (16px, 20px, 24px)

---

## 10. Responsive Considerations

### 10.1 Popup Constraints

| Property | Value |
|----------|-------|
| Min width | 300px |
| Max width | 400px |
| Default width | 360px |
| Max height | 600px (scrollable beyond) |

### 10.2 Overlay Constraints

| Property | Requirement |
|----------|-------------|
| Z-index | 2147483647 (max) |
| Position | Fixed, full viewport |
| Isolation | Shadow DOM to prevent style leaks |

---

## 11. Quick Reference

### CSS Variables Template

```css
:root {
  /* Primary */
  --primary-50: #eff6ff;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;

  /* Success */
  --success-50: #f0fdf4;
  --success-500: #22c55e;
  --success-700: #15803d;

  /* Error */
  --error-50: #fef2f2;
  --error-500: #ef4444;
  --error-700: #b91c1c;

  /* Neutral */
  --neutral-100: #f3f4f6;
  --neutral-200: #e5e7eb;
  --neutral-300: #d1d5db;
  --neutral-400: #9ca3af;
  --neutral-500: #6b7280;
  --neutral-700: #374151;
  --neutral-900: #111827;

  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --text-xs: 11px;
  --text-sm: 12px;
  --text-base: 14px;
  --text-lg: 16px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;

  /* Effects */
  --shadow-lg: 0 4px 12px rgba(0,0,0,0.15);
  --rounded-md: 6px;
  --rounded-lg: 8px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --neutral-100: #1f2937;
    --neutral-200: #374151;
    --neutral-900: #f3f4f6;
    /* ... other dark overrides */
  }
}
```
