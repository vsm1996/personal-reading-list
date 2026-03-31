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
| `theme.ts` | Build Renge CSS token string; called once at startup |
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
