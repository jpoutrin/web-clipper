# Design Tokens Changelog

All notable changes to the Web Clipper design tokens will be documented in this file.

## [1.0.0] - 2026-01-17

### Added

#### Core Token Files
- `colors.css` - Complete color system with light/dark mode support
  - Primary color scale (blue, 50-950)
  - Semantic colors (success, warning, error)
  - Neutral gray scale (50-950)
  - Semantic aliases for text, backgrounds, borders
  - Interactive state colors
  - Full dark mode support via prefers-color-scheme

- `typography.css` - Typography system
  - Font families (sans, mono)
  - Font size scale (xs to 5xl)
  - Font weight scale (thin to black)
  - Line height scale (none to loose)
  - Letter spacing scale (tighter to widest)
  - Complete presets for headings (h1-h6)
  - Body text presets (xs, sm, base, lg)
  - Label and UI text presets
  - Code/monospace presets
  - Caption and overline presets

- `spacing.css` - Spacing system
  - Base spacing scale (0-32, 8px grid)
  - Component padding aliases
  - Layout gap aliases
  - Section spacing aliases
  - Container padding aliases
  - Input/button spacing presets
  - Stack and inline spacing

- `layout.css` - Layout utilities
  - Border radius scale (none to full)
  - Semantic radius aliases (button, card, modal, etc.)
  - Z-index scale (base to max, well-defined layers)
  - Border width scale
  - Max width scale for containers
  - Component-specific widths (modal, popover, dropdown)
  - Height presets (input, button)
  - Opacity scale (0-100)
  - Breakpoint references
  - Icon and avatar size scales

- `shadows.css` - Shadow system
  - Shadow elevation scale (xs to 2xl)
  - Dark mode shadow variants
  - Focus ring shadows (default, error, success)
  - Semantic shadow aliases (card, dropdown, modal, etc.)
  - Special bordered card shadow for dark mode

- `animations.css` - Animation system
  - Duration scale (instant to slower)
  - Easing function presets
  - Semantic transition aliases
  - Component-specific transitions
  - Keyframe animations (spin, pulse, bounce, fade, slide, scale)
  - Full reduced motion support

#### Supporting Files
- `index.css` - Central import file combining all tokens
- `reset.css` - Shadow DOM CSS reset (pre-existing)
- `README.md` - Comprehensive documentation
- `QUICK_REFERENCE.md` - Quick lookup guide
- `examples.html` - Visual examples and demos
- `CHANGELOG.md` - This file

### Features

- **Shadow DOM Compatible**: All tokens use `:host, :root` selector
- **Dark Mode**: Automatic adaptation via `@media (prefers-color-scheme: dark)`
- **Accessibility**: Reduced motion support built-in
- **Semantic Tokens**: High-level tokens that adapt to context
- **Comprehensive Coverage**: 200+ design tokens
- **Type-Safe**: Consistent naming convention for IDE autocomplete
- **Well Documented**: README, quick reference, and visual examples

### Design Decisions

- 8px base spacing unit for consistent rhythm
- Blue as primary brand color (customizable)
- Sans-serif system font stack for performance
- Shadow elevation for depth perception
- Focus rings for accessibility
- Reduced motion respects user preferences

### Browser Support

- Modern browsers with CSS custom properties support
- Automatic fallback for older browsers via cascade
- Shadow DOM compatible
- Works in Chrome extensions

### Breaking Changes

None - Initial release

---

## Version Guidelines

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes to token names or values
- **MINOR**: New tokens added (backwards compatible)
- **PATCH**: Documentation updates, bug fixes
