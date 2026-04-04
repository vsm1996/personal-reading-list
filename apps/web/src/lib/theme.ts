import { createRengeTheme } from "@renge-ui/tokens";

// Earth profile, baseUnit: 6px (Fibonacci spacing base).
// Creates both light and dark variants for prefers-color-scheme support.
//
// The earth profile produces warm browns, terracottas, and natural tones that
// align with the Bookshelf brand kit's literary aesthetic.
//
// If you need to inspect available var names:
//   console.log(Object.keys(lightTheme.vars))
const lightTheme = createRengeTheme({ profile: "earth", baseUnit: 6, mode: "light" });
const darkTheme  = createRengeTheme({ profile: "earth", baseUnit: 6, mode: "dark"  });

// Maps Renge's semantic token names to the Bookshelf brand-kit CSS variable names
// (guidance/brand-kit.md). Component code uses var(--color-accent) etc.; values
// come from Renge's earth profile.
//
// Renge may prefix vars with '--renge-' — both forms are checked.
function resolveVar(vars: Record<string, string>, suffix: string): string {
  const prefixed = `--renge-${suffix}`;
  const bare     = `--${suffix}`;
  if (prefixed in vars) return `var(${prefixed})`;
  if (bare     in vars) return `var(${bare})`;
  return "";
}

function brandAliases(vars: Record<string, string>): string {
  // Renge semantic keys follow the pattern --renge-color-{name}
  const map: [string, string][] = [
    // Backgrounds
    ["--color-bg-primary",    resolveVar(vars, "color-bg")],
    ["--color-bg-secondary",  resolveVar(vars, "color-bg-subtle")],
    ["--color-bg-tertiary",   resolveVar(vars, "color-bg-muted")],
    ["--color-surface",       resolveVar(vars, "color-bg-inverse")],
    // Borders
    ["--color-border",        resolveVar(vars, "color-border")],
    ["--color-border-subtle", resolveVar(vars, "color-border-subtle")],
    // Text
    ["--color-text-primary",  resolveVar(vars, "color-fg")],
    ["--color-text-secondary",resolveVar(vars, "color-fg-subtle")],
    ["--color-text-tertiary", resolveVar(vars, "color-fg-muted")],
    // Accent
    ["--color-accent",        resolveVar(vars, "color-accent")],
    ["--color-accent-hover",  resolveVar(vars, "color-accent-hover")],
    ["--color-accent-subtle", resolveVar(vars, "color-accent-subtle")],
    // Semantic
    ["--color-success",       resolveVar(vars, "color-success")],
    ["--color-warning",       resolveVar(vars, "color-warning")],
    ["--color-error",         resolveVar(vars, "color-danger")],
    // Derived — reuse accent/warning for these brand-specific roles
    ["--color-progress",      resolveVar(vars, "color-accent")],
    ["--color-rating",        resolveVar(vars, "color-warning")],
  ];

  return map
    .filter(([, value]) => value)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
}

// Extracts the content inside the outermost { } of a CSS block.
function extractBody(css: string): string {
  const match = css.match(/\{([\s\S]*)\}/);
  return match?.[1] ?? "";
}

// Full CSS injected into the document <head> by the root layout.
//
// Selector precedence order (later wins at equal specificity):
//   1. :root { light renge vars }                        — lightTheme.css
//   2. :root { light brand aliases }                     — explicit light
//   3. @media dark { :root { dark renge vars } }         — system dark
//   4. @media dark { :root { dark brand aliases } }      — system dark aliases
//   5. [data-theme="light"] { light renge + aliases }    — JS explicit light
//   6. [data-theme="dark"]  { dark renge + aliases }     — JS explicit dark
//
// This ensures:
//   - No JS (SSR): system preference wins via media query
//   - data-theme="light": block 5 overrides 3+4 (comes later, equal specificity)
//   - data-theme="dark":  block 6 overrides 1+2 (comes later, equal specificity)
export function buildTokenCSS(): string {
  const lightAliases = brandAliases(lightTheme.vars);
  const darkAliases  = brandAliases(darkTheme.vars);

  const darkMediaBlock = darkAliases
    ? `@media (prefers-color-scheme: dark) {\n  :root {\n${darkAliases.replace(/^  /gm, "    ")}\n  }\n}`
    : "";

  const lightExplicit = lightAliases
    ? `[data-theme="light"] {\n${extractBody(lightTheme.css)}\n${lightAliases}\n}`
    : "";

  const darkExplicit = darkAliases
    ? `[data-theme="dark"] {\n${extractBody(darkTheme.css)}\n${darkAliases}\n}`
    : "";

  return [
    lightTheme.css,
    lightAliases ? `:root {\n${lightAliases}\n}` : "",
    darkTheme.css.replace(/:root\s*\{/, `@media (prefers-color-scheme: dark) {\n  :root {`).replace(/\}$/, "  }\n}"),
    darkMediaBlock,
    lightExplicit,
    darkExplicit,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// Evaluated once at module load — safe because the theme config is static.
export const tokenCSS = buildTokenCSS();
