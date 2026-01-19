---
description: Apply Web Clipper design system for UI development and review
user-invocable: true
---

# /design

Apply the Web Clipper design system when creating or reviewing UI components.

## Instructions

### Step 1: Load Project Design Guidelines

Read the project design guidelines:

```
docs/design-guidelines.md
```

This contains the complete design system including colors, typography, spacing, components, and accessibility requirements.

### Step 2: Determine Task Type

Ask the user what they need:

1. **Create new component** - Use design tokens to build new UI
2. **Review existing code** - Check CSS against design system
3. **Implement dark mode** - Add dark mode support
4. **Accessibility audit** - Validate WCAG 2.1 AA compliance
5. **Extract patterns** - Analyze external site for inspiration

### Step 3: Leverage Specialized Agents

Based on the task, spawn the appropriate agent:

**For UI implementation and visual review:**
```
Task with subagent_type: product-design:ui-product-expert
```

**For component patterns and design tokens:**
```
Task with subagent_type: product-design:design-system
```

**For UX flow and interaction design:**
```
Task with subagent_type: product-design:ux-expert
```

**For extracting design from external sites:**
```
Skill: design-audit
```

### Step 4: Apply Design Tokens

When writing CSS, use the project tokens:

| Category | Key Values |
|----------|------------|
| Primary | `#3b82f6` (action), `#2563eb` (hover), `#1d4ed8` (active) |
| Success | `#22c55e` |
| Error | `#ef4444` |
| Text | `#111827` (primary), `#6b7280` (secondary) |
| Border | `#d1d5db` |
| Radius | `8px` (buttons), `6px` (inputs) |
| Shadow | `0 4px 12px rgba(0,0,0,0.15)` |

### Step 5: Validate Accessibility

Ensure all UI changes meet:

- [ ] 4.5:1 color contrast for text
- [ ] Focus visible (`outline: 2px solid #3b82f6`)
- [ ] Keyboard navigable
- [ ] ARIA labels on icon-only buttons
- [ ] `prefers-reduced-motion` respected
- [ ] `prefers-color-scheme: dark` supported

## Example Usage

- `/design` - Interactive design assistance
- `/design review popup.css` - Review specific file against design system
- `/design create button` - Create new component with design tokens
- `/design dark-mode` - Implement dark mode for component
