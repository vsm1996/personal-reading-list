# Renge Design Token System

Bookshelf uses **[Renge](https://www.npmjs.com/package/@renge-ui/tokens)** — a design token library that ships semantic CSS custom properties for colour, spacing, and animation. We use the **earth profile**, a palette of warm browns, terracottas, and muted naturals chosen to match the literary aesthetic.

---

## How It Works (Three-Layer Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1 — Renge runtime injection (lib/theme.ts)               │
│                                                                   │
│  createRengeTheme({ profile: 'earth', baseUnit: 6, mode })      │
│  → outputs CSS vars: --renge-color-accent, --renge-color-fg, …  │
│  → injected into <head> via <style> in root layout.tsx          │
│  → both light and dark variants generated                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 2 — Brand aliases (lib/theme.ts → brandAliases())        │
│                                                                   │
│  Maps Renge internal names → Bookshelf brand names in :root:    │
│    --color-accent:       var(--renge-color-accent)               │
│    --color-text-primary: var(--renge-color-fg)                   │
│    --color-error:        var(--renge-color-danger)               │
│    --color-rating:       var(--renge-color-warning)  ← reused   │
│    --color-progress:     var(--renge-color-accent)   ← reused   │
│  Dark mode wrapped in @media (prefers-color-scheme: dark)        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3 — Tailwind v4 @theme inline (styles/globals.css)       │
│                                                                   │
│  @theme inline {                                                  │
│    --color-accent: var(--color-accent);                          │
│  }                                                               │
│                                                                   │
│  → Tailwind generates utility classes:                           │
│      text-accent, bg-accent, border-accent,                      │
│      fill-accent, stroke-accent, ring-accent …                   │
│  → All opacity modifiers work: bg-accent/10, bg-success/15 …    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Naming Convention (IMPORTANT)

Always use the **Tailwind utility shorthand**. Never use the verbose `[var(--)]` arbitrary-value syntax.

```tsx
// ✅ Correct — registered Tailwind v4 utilities
<div className="bg-bg-secondary text-text-primary border border-border" />
<button className="bg-accent text-text-on-accent hover:bg-accent-hover" />
<span className="text-success bg-success/15" />
<div className="shadow-md" />

// ❌ Wrong — verbose, bypasses Tailwind's utility system
<div className="bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]" />
<div className="shadow-[var(--shadow-md)]" />
```

**Why?** `@theme inline` registers these CSS variables as first-class Tailwind utilities. The short form is idiomatic Tailwind v4, enables purging, and supports opacity modifiers natively (`bg-accent/10`).

---

## Colour Token Reference

### Backgrounds

| Utility | CSS Variable | Description |
|---------|-------------|-------------|
| `bg-bg-primary` | `--color-bg-primary` | Page canvas — lightest background |
| `bg-bg-secondary` | `--color-bg-secondary` | Sidebar, section headers, subtle insets |
| `bg-bg-tertiary` | `--color-bg-tertiary` | More recessed — empty states, muted cards |
| `bg-surface` | `--color-surface` | Elevated surfaces: modals, cards, dropdowns |

### Borders

| Utility | CSS Variable | Description |
|---------|-------------|-------------|
| `border-border` | `--color-border` | Standard border for inputs and cards |
| `border-border-subtle` | `--color-border-subtle` | Light dividers, whisper-weight lines |

### Text

| Utility | CSS Variable | Description |
|---------|-------------|-------------|
| `text-text-primary` | `--color-text-primary` | Default body text |
| `text-text-secondary` | `--color-text-secondary` | Supporting labels, metadata |
| `text-text-tertiary` | `--color-text-tertiary` | Placeholders, disabled, hint text |
| `text-text-on-accent` | `--color-text-on-accent` | High-contrast text on accent backgrounds |

### Accent (brand / interactive colour)

The earth profile's accent is a warm terracotta — used for buttons, links, active states, and focus rings.

| Utility | CSS Variable | Description |
|---------|-------------|-------------|
| `text-accent` / `bg-accent` / `border-accent` | `--color-accent` | Primary interactive colour |
| `hover:bg-accent-hover` / `hover:text-accent-hover` | `--color-accent-hover` | Hover state (slightly darker) |
| `bg-accent-subtle` / `border-accent-subtle` | `--color-accent-subtle` | Very light tint — badge backgrounds, highlights |

### Semantic

| Utility | CSS Variable | When to use |
|---------|-------------|-------------|
| `text-success` / `bg-success` | `--color-success` | Positive feedback, "Read" shelf indicator |
| `text-warning` / `bg-warning` | `--color-warning` | Caution states |
| `text-error` / `bg-error` | `--color-error` | Validation errors, destructive actions |

### Derived Roles

These reuse other Renge tokens for domain-specific roles:

| Utility | Resolves to | Domain meaning |
|---------|-------------|----------------|
| `bg-progress` / `text-progress` | `--color-accent` | Progress bar fill |
| `bg-rating` / `text-rating` / `fill-rating` | `--color-warning` | Star rating colour |

### Special

| Utility | CSS Variable | Description |
|---------|-------------|-------------|
| `bg-overlay` | `--color-overlay` | Semi-transparent modal backdrop (oklch 0% 0 0 / 0.40) |

---

## Opacity Modifiers

All colour tokens support Tailwind's opacity modifier syntax. Tailwind generates `color-mix(in oklch, …)` under the hood:

```tsx
bg-accent/10     // 10% opacity accent background
bg-success/15    // success badge background
bg-error/20      // error highlight  
border-text-on-accent/40  // subtle border on accent surface
```

---

## Shadow Token Reference

Shadows are defined in `globals.css` with warm earth-tinted umbras that complement the palette.

| Utility | CSS Variable | Description |
|---------|-------------|-------------|
| `shadow-sm` | `--shadow-sm` | Subtle lift — secondary cards, inputs |
| `shadow-md` | `--shadow-md` | Moderate elevation — modals, auth cards |
| `shadow-lg` | `--shadow-lg` | High elevation — overlays, floating panels |
| `shadow-book` | `--shadow-book` | Warm-tinted depth shadow for book covers |

---

## Animation Token Reference

Animation timing is CSS custom properties — use them in inline styles or Tailwind arbitrary values where the transition/animation needs to reference them directly.

### Durations

| CSS Variable | Value | Use for |
|-------------|-------|---------|
| `--renge-duration-2` | `200ms` | Hover states, focus rings, micro-interactions |
| `--renge-duration-3` | `300ms` | Modals, slide panels, standard transitions |
| `--renge-duration-4` | `500ms` | Page entrances, book flip, deliberate animations |

### Easing

| CSS Variable | Value | Character |
|-------------|-------|-----------|
| `--renge-easing-ease-out` | `cubic-bezier(0.382, 1, 0.618, 1)` | Golden-ratio ease — quick start, gentle landing |

### Named Animation Utility Classes

These are defined in `globals.css`. Add the class to a React element to trigger the animation:

| Class | Animation | Duration |
|-------|-----------|----------|
| `.page-enter` | Scale 0.95 + fade in | `--renge-duration-4` |
| `.page-flip-enter` | Perspective flip from left | `--renge-duration-4` |
| `.shelf-entrance` | Scale + fade (stagger via `animation-delay`) | `--renge-duration-4` |
| `.modal-entrance` | Scale + fade | `--renge-duration-3` |
| `.book-card` | `@starting-style` entrance on mount | `--renge-duration-2` |
| `.sort-item` | Slide up + fade on mount | `--renge-duration-3` |
| `.book-cover-3d` | 3D perspective tilt on hover | `--renge-duration-2` |
| `.star-pop` | Bounce scale sequence | `--renge-duration-3` |
| `.goal-complete` | Shimmer sweep + glow pulse | `3s / 2.5s` |
| `.cover-placeholder-bloom` | Gentle scale bloom | `--renge-duration-4` |
| `.hero-slide` | Translate Y + fade | `--renge-duration-4` |
| `.spine-rise` | Translate Y + scale Y | `--renge-duration-4` |
| `.confetti-particle` | Burst trajectory via `--dx/--dy/--dr` custom props | `700ms` |
| `.progress-fill` | Width transition | `--renge-duration-4` |
| `.shelf-drop-target` | Static — dashed accent outline on drag hover | — |

All animations are stripped to `none` (or `transition: none`) inside `@media (prefers-reduced-motion: reduce)`.

---

## Confetti Colour Palette

`GoalConfetti` uses a dedicated CSS custom property palette rather than hardcoded hex values. Three colours delegate to semantic tokens (so they shift in dark mode); blue and violet are fixed celebratory hues.

```css
/* globals.css :root */
--color-confetti-gold:   var(--color-rating);    /* adapts to theme */
--color-confetti-red:    var(--color-error);     /* adapts to theme */
--color-confetti-green:  var(--color-success);   /* adapts to theme */
--color-confetti-blue:   oklch(60% 0.18 250);    /* fixed celebratory */
--color-confetti-violet: oklch(58% 0.20 300);    /* fixed celebratory */
```

In the component these are referenced as `var(--color-confetti-gold)` etc. via the `C` constant object.

---

## Typography Tokens

Registered in `@theme` (not `@theme inline`), so Tailwind generates utilities directly:

| Token | Value | Utility |
|-------|-------|---------|
| `--font-heading` | Lora, Georgia, serif | `font-heading` |
| `--font-sans` | Inter, system-ui, sans-serif | `font-sans` |
| `--font-serif` | Lora, Georgia, serif | `font-serif` |
| `--font-mono` | JetBrains Mono, monospace | `font-mono` |

Type scale (1.25 major-third ratio, anchored at 16px):

| Token | Value | Utility |
|-------|-------|---------|
| `--text-xs` | 11px | `text-xs` |
| `--text-sm` | 13px | `text-sm` |
| `--text-base` | 16px | `text-base` |
| `--text-lg` | 20px | `text-lg` |
| `--text-xl` | 25px | `text-xl` |
| `--text-2xl` | 31px | `text-2xl` |
| `--text-3xl` | 39px | `text-3xl` |

---

## Dark Mode

Dark mode is fully automatic. `lib/theme.ts` generates both light and dark Renge earth profiles and wraps the dark one in `@media (prefers-color-scheme: dark)`. All `--color-*` brand alias variables resolve to the correct values automatically.

**No `dark:` prefix is needed in component className strings.** The colour switch happens at the CSS variable level, invisible to component code.

---

## Adding New Tokens

1. **Define the CSS custom property** in `globals.css :root` (or in `lib/theme.ts` if it maps to a Renge semantic value).

2. **Register in `@theme inline`** so Tailwind generates utilities:
   ```css
   @theme inline {
     --color-my-new-token: var(--color-my-new-token);
   }
   ```

3. **Use the utility class** in components:
   ```tsx
   <div className="bg-my-new-token text-my-new-token/80" />
   ```

4. **Document it** in the colour reference table above.

---

## Files

| File | Role |
|------|------|
| `apps/web/src/lib/theme.ts` | Renge client factory, brand alias map, `buildTokenCSS()` |
| `apps/web/src/styles/globals.css` | `@theme inline` registration, shadow definitions, animation keyframes and utilities |
| `apps/web/src/app/layout.tsx` | Injects `tokenCSS` into `<head>` before Tailwind |
