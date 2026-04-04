# Architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | [Turborepo](https://turbo.build/) + pnpm workspaces |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (`strict`, `noUncheckedIndexedAccess`) |
| Database | Supabase Postgres (hosted) |
| ORM | Prisma 6 |
| Auth | Supabase Auth + `@supabase/ssr` |
| Styling | Tailwind CSS v4 + Renge design token system |
| State | Zustand (client state only) |
| Testing | Vitest + Testing Library |
| CI | — |

---

## Monorepo Layout

```
personal-reading-list/
├── apps/
│   └── web/                    ← Next.js application
│       └── src/
│           ├── app/            ← App Router pages & API routes
│           │   ├── (app)/      ← Authenticated layout group
│           │   ├── (auth)/     ← Auth pages (sign-in, sign-up, …)
│           │   ├── api/        ← Route Handlers (REST endpoints)
│           │   ├── auth/       ← Supabase Auth callback pages
│           │   └── guest/      ← Guest-mode demo
│           ├── components/     ← Shared React components
│           │   ├── auth/
│           │   ├── goals/
│           │   ├── import/
│           │   ├── library/
│           │   ├── nav/
│           │   └── ui/         ← Generic primitives (Toaster, Spinner)
│           ├── hooks/          ← Custom React hooks
│           ├── lib/            ← Pure utilities, no React
│           │   ├── parsers/    ← CSV / data parsers
│           │   └── supabase/   ← Supabase client factories
│           ├── stores/         ← Zustand stores
│           └── styles/         ← globals.css (Tailwind + Renge)
├── packages/
│   ├── db/                     ← Prisma schema, client, migrations
│   └── tsconfig/               ← Shared tsconfig bases
├── guidance/                   ← Brand kit, UI patterns, accessibility guide
├── spec/                       ← Product & technical requirements
└── docs/                       ← This documentation
```

---

## Application Layers

### 1. Data layer (`packages/db`)

- Single Prisma client exported from `@bookshelf/db`
- `packages/db/prisma/schema.prisma` is the source of truth for all models
- Migrations live in `packages/db/prisma/migrations/`
- Connection uses pooled URL (`DATABASE_URL`) for runtime, direct URL (`DIRECT_URL`) for migrations

### 2. API layer (`apps/web/src/app/api/`)

Route Handlers provide a thin REST boundary between the client and the database. Each route:

- Authenticates via `getAuthUser()` from `lib/api-auth.ts`
- Validates input with `lib/validate.ts`
- Returns `NextResponse.json(...)` with appropriate status codes
- Never exposes raw Prisma errors to the client

Key route groups:

| Route | Purpose |
|-------|---------|
| `GET /api/books/search` | Proxy to Open Library — search by title/author |
| `GET/PATCH/DELETE /api/library/books/[id]` | Single book in user's library |
| `POST /api/library/books/[id]/note` | Add/update/delete a reading note |
| `POST /api/library/books/[id]/progress` | Log reading progress |
| `GET/POST/PUT /api/goals` | Annual reading goal CRUD |
| `GET/POST /api/shelves` | Shelf list and creation |
| `PATCH/DELETE /api/shelves/[id]` | Rename/delete a shelf |
| `POST /api/seed-guest` | Seed demo data for unauthenticated guest session |
| `POST /api/import/goodreads` | Bulk import from Goodreads CSV export |

### 3. Library layer (`apps/web/src/lib/`)

Pure functions — no React, no side effects, importable in Server Components and tests alike.

| Module | Responsibility |
|--------|---------------|
| `theme.ts` | Build Renge CSS token string with light/dark `[data-theme]` selectors; called once at startup |
| `theme-persistence.ts` | Pure functions for reading/writing theme preference; dependency-injected for testability |
| `validate.ts` | Input validation at API boundaries |
| `goals-calculations.ts` | Derive pace info from goal + current count |
| `heatmap.ts` | Build 52-week grid for the reading heatmap |
| `library-mappers.ts` | Map Prisma query results to UI-friendly shapes |
| `parsers/goodreads-csv.ts` | Parse Goodreads CSV export into `ParsedBook[]` |
| `env.ts` | Type-safe environment variable access |
| `api-auth.ts` | `getAuthUser()` + standard error response helpers |
| `urls.ts` | Centralised internal URL constants |

### 4. Component layer (`apps/web/src/components/`)

Follows the **Container/Presentational** split:

- **Containers** own data-fetching/mutation logic and pass data down
- **Presentational** components render UI from props, no direct DB access

Key components:

| Component | Pattern |
|-----------|---------|
| `library/library-client.tsx` | Container — wires store to shelf display |
| `library/book-detail-panel.tsx` | Presentational — renders full book view |
| `library/shelf-section.tsx` | Presentational — renders one shelf row |
| `library/add-book-modal.tsx` | Modal — search + add to shelf |
| `goals/goal-setter.tsx` | Form — set/update annual goal |
| `goals/progress-ring.tsx` | Pure display — SVG ring progress indicator |
| `ui/theme-toggle.tsx` | Client — sun/moon toggle button; hydration-safe placeholder before mount |
| `import/goodreads-importer.tsx` | Multi-step import wizard |
| `nav/shelf-nav.tsx` | Sidebar shelf list with active state |

### 5. State layer (`apps/web/src/stores/`)

Zustand stores hold **ephemeral client state only** — nothing that needs to survive a page reload.

| Store | State |
|-------|-------|
| `library.store.ts` | Book list, shelf list, optimistic updates |
| `ui.store.ts` | Modal open/close flags, toast queue, sidebar open |

Zustand was chosen over React Context to avoid context provider nesting and because it handles optimistic updates cleanly without extra machinery.

### 6. Hooks layer (`apps/web/src/hooks/`)

Custom hooks encapsulate mutation logic that would otherwise bloat component files.

| Hook | Responsibility |
|------|---------------|
| `use-book-mutations.ts` | Shelf move, rating, note, progress, delete — all with optimistic UI |
| `use-book-search.ts` | Debounced search with loading/error state |
| `use-theme.ts` | Read/toggle active theme; listens for OS changes when no stored preference |

### 7. Theme system

The theme system has three layers, each with a distinct responsibility:

#### Token CSS generation (`lib/theme.ts`)

`buildTokenCSS()` produces a single CSS string injected into `<head>` at startup. It emits six selector blocks in specificity order:

1. `:root { … }` — Renge light vars (from `lightTheme.css`)
2. `:root { … }` — brand alias mappings for light
3. `@media (prefers-color-scheme: dark) { :root { … } }` — Renge dark vars (system fallback)
4. `@media (prefers-color-scheme: dark) { :root { … } }` — brand aliases for dark (system fallback)
5. `[data-theme="light"] { … }` — explicit light override (light Renge vars + aliases)
6. `[data-theme="dark"] { … }` — explicit dark override (dark Renge vars + aliases)

Blocks 5 and 6 come last, so setting `data-theme` on `<html>` always wins over the media query — regardless of system preference.

#### Persistence (`lib/theme-persistence.ts`)

Pure functions with no React dependency. Designed for testability via dependency injection:

```typescript
getStoredTheme(storage: Storage): Theme | null
setStoredTheme(storage: Storage, theme: Theme): void
getSystemTheme(mql: { matches: boolean }): Theme
resolveInitialTheme(storage, mql): Theme  // stored → system fallback
```

Storage key: `bookshelf-theme` (constant `THEME_KEY`). No environment variable needed.

#### Runtime (`hooks/use-theme.ts` + layout inline script)

The root layout (`app/layout.tsx`) injects a synchronous `<script>` into `<head>` that sets `data-theme` on `<html>` before first paint, preventing a flash of the wrong theme. The script mirrors the logic in `resolveInitialTheme`.

`useTheme()` reads the attribute the script already set on mount, then provides a `toggleTheme()` function that updates the DOM attribute, persists the choice to `localStorage`, and re-renders only the toggle component.

`suppressHydrationWarning` on `<html>` is required because the server renders the element without `data-theme` (the inline script hasn't run yet), while the client immediately sets it. The suppression is scoped to `<html>` only.

---

## Rendering Strategy

| Page | Strategy | Why |
|------|----------|-----|
| `/` (landing) | RSC (static) | No auth, fully static |
| `/(app)/library` | RSC → streams | Fetches shelf+book data on server, no client waterfall |
| `/(app)/shelf/[id]` | RSC | Same pattern as library |
| `/(app)/goals` | RSC | Goal data fetched on server |
| `/(app)/stats` | RSC | Reads heatmap data server-side |
| `/(auth)/*` | Client Component | Form validation, redirect logic |
| Modal components | Client Component | Interactivity required |

Rule: **Server Component by default; add `"use client"` only when interactivity is required.**

---

## Authentication Flow

```
Browser → /sign-in → Supabase Auth → callback → middleware sets session cookie
                                                     ↓
                                          Every request: middleware validates
                                          session, refreshes if expired
```

- `lib/supabase/server.ts` — server-side client (reads/writes cookies via `next/headers`)
- `lib/supabase/middleware.ts` — middleware client (refreshes session on every request)
- `getAuthUser()` in `lib/api-auth.ts` — used inside every Route Handler

Guest mode: unauthenticated users can view a pre-seeded demo library. The `POST /api/seed-guest` route creates a temporary profile and seeds it with sample books.

---

## Data Flow Example: Adding a Book

```
User clicks "Add" in AddBookModal
       ↓
useBookMutations.addBook(bookData, shelfId)
       ↓
Optimistic update → library.store.addBook(optimistic)
       ↓
POST /api/library/books  (route handler)
       ↓
getAuthUser() → validate input → prisma.book.upsert + prisma.userBook.create
       ↓
Return { userBook, book } → store.replaceOptimistic(real)
       ↓
(on error) store.rollback(optimistic)
```

---

## Patterns Applied

| Pattern | Where |
|---------|-------|
| **Module Pattern** | All of `lib/` — pure functions, no side effects |
| **Hooks Pattern** | `use-book-mutations.ts`, `use-book-search.ts` |
| **Container/Presentational** | `library-client.tsx` (container) + `book-detail-panel.tsx`, `shelf-section.tsx` (presentational) |
| **React Server Components** | All page-level components default to RSC |
| **Proxy Pattern** | `/api/books/search` hides Open Library URL, normalises response |
| **Optimistic UI** | Book mutations via Zustand + rollback on error |

See `guidance/patterns.md` for UI/UX patterns and `guidance/brand-kit.md` for visual design.
