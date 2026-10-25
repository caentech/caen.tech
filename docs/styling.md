---
title: Styling Conventions
summary: CSS architecture — design tokens, Pleasant BEM blocks, responsive breakpoints, and scoped styles.
read_when:
  - writing or modifying CSS
  - creating a new component
  - looking for available utility classes
---

# Styling Conventions

## File Structure

All stylesheets live in `src/styles/`. `global.css` is the entry point and imports the others:

```
global.css      CSS custom properties, reset, base typography (imports all below)
├── blocks.css      Reusable Pleasant BEM blocks (.Wrap, .Section, .Grid, .Card…)
├── hero.css        .Hero block (homepage photo hero)
├── modal.css       .TalkModal dialog
└── calendar.css    .Calendar schedule grid
```

## Design Tokens

Defined as CSS custom properties in `:root` (see `global.css`):

- **Colors** — `--color-primary` (#ffdd00), `--color-bg`, `--color-bg-alt`, `--color-bg-dark`, `--color-text`, `--color-text-light`, `--color-border`.
- **Typography** — `--text-xs` through `--text-3xl`, all using `clamp()` for fluid scaling. Font: Outfit.
- **Spacing** — `--space-xs` (0.25rem) through `--space-2xl` (6rem).
- **Misc** — `--radius-sm/md/lg`, `--shadow-sm/md/lg`, `--transition`, `--max-width` (1200px).

## Pleasant BEM

Class naming follows the Pleasant BEM convention (see pleasant-bem-css skill). Key global blocks:

| Block | Purpose | Modifiers |
|-------|---------|-----------|
| `.Wrap` | Centered max-width container | — |
| `.Section` | Page section with vertical padding | `.alt` (alt bg), `.dark` (dark bg) |
| `.Grid` | Responsive grid | `.cols2`, `.cols3`, `.cols4` |
| `.Btn` | Button / CTA | `.primary`, `.outline` |
| `.Card` | Content card wrapper | — |
| `.Tag` | Badge / label | `.theme`, `.level`, `.type` |
| `.SocialLinks` | Icon link row | — |

## Responsive Breakpoints

- Mobile: default (< 768px)
- Tablet: `@media (min-width: 768px)`
- Desktop: `@media (min-width: 1024px)`

## No Inline Styles

Never use `style="..."` attributes. Use global Pleasant BEM blocks, modifiers, or scoped `<style>` blocks instead. The only exception is styles set dynamically by JavaScript for animations.

## Styling a New Component

1. Use global blocks (`.Section`, `.Grid`, `.Card`) for layout.
2. Add component-specific styles in a scoped `<style>` block inside the `.astro` file.
3. Name component classes with Pleasant BEM: `.ComponentName-element`.
4. Use design tokens (`var(--color-primary)`, `var(--space-lg)`) — avoid hard-coded values.

## Interaction Conventions

- **Do not animate on hover for non-interactive elements.** Hover effects (transforms, shadow changes, scale) should only be applied to elements that are clickable as a whole (links, buttons). Use `a.Card:hover` instead of `.Card:hover`.
