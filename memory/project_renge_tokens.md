---
name: @renge-ui/tokens design system
description: Vanessa's own npm package for design tokens — to be used alongside Bookshelf's brand kit
type: project
---

@renge-ui/tokens (v1.0.0) is Vanessa's own design system package. It provides:
- Golden-ratio (φ) based typography scale
- Fibonacci-based spacing (4px base unit, up to 356px)
- OKLCH perceptually-uniform color system with named profiles (ocean, earth, twilight, fire, void, leaf)
- Natural motion (Fibonacci-based durations, cubic-bezier easing curves)
- Usage: `import { createRengeTheme } from '@renge-ui/tokens'`

**How to apply:** To be used alongside/integrated with the Bookshelf brand kit tokens (warm, literary palette in starter/tokens.css). The brand kit colors/typography take precedence for brand identity; @renge-ui/tokens may provide the structural/spacing/motion foundations or additional tokens.
