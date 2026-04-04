# Developer Setup Guide

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 20 | Use `nvm` or `fnm` to manage versions |
| pnpm | ≥ 10 | `npm install -g pnpm` |
| Git | any | — |

A Supabase project is required for the database and authentication. Create one at [supabase.com](https://supabase.com) — the free tier is sufficient for development.

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd personal-reading-list
pnpm install        # installs all workspace packages from repo root

# 2. Environment variables
cp apps/web/.env.local.example apps/web/.env.local
# Edit apps/web/.env.local — see Environment Variables below

# 3. Apply database schema
pnpm --filter @bookshelf/db db:push    # first-time setup (no migration history)
# or, if migrations are already bootstrapped:
pnpm --filter @bookshelf/db db:migrate

# 4. Start dev server
pnpm --filter @bookshelf/web dev
# App available at http://localhost:3000
```

---

## Environment Variables

### `apps/web/.env.local`

Copy `.env.local.example` and fill in your values. **Never commit `.env.local`.**

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Yes | Supabase anonymous public key (Settings → API) |
| `DATABASE_URL` | Yes | Pooled connection string — use the **Transaction pooler** (port 6543). Append `?pgbouncer=true` |
| `DIRECT_URL` | Yes | Direct connection string — use port 5432. Required for Prisma migrations |
| `GOOGLE_BOOKS_API_KEY` | No | Leave blank to use Open Library (no key needed). Set to use Google Books instead |

> **Security note:** `NEXT_PUBLIC_*` variables are embedded in the browser bundle. They are intentionally public (Supabase's anon key is designed to be client-visible and is protected by Row-Level Security). `DATABASE_URL` and `DIRECT_URL` are server-only — never prefix them with `NEXT_PUBLIC_`.

### `apps/web/e2e/.env.test` (E2E tests only)

Copy `apps/web/e2e/.env.test.example` and fill in your values. **Never commit `.env.test`.**

| Variable | Required | Description |
|----------|----------|-------------|
| `E2E_EMAIL` | Yes | Test user email — created fresh before each E2E run |
| `E2E_PASSWORD` | Yes | Test user password |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Same value as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Admin key from Supabase Settings → API. Has full DB access — keep secret |
| `E2E_BASE_URL` | No | Defaults to `http://localhost:3000` |

> **Security note:** The service role key bypasses Row-Level Security. Never expose it client-side, in logs, or in version control.

---

## Running Tests

### Unit tests (Vitest)

```bash
# From apps/web/ or use --filter from repo root
pnpm --filter @bookshelf/web test           # run once
pnpm --filter @bookshelf/web test:watch     # watch mode
pnpm --filter @bookshelf/web test:coverage  # coverage report (v8)
```

Tests run in the `node` environment — no DOM globals. See `docs/testing.md` for conventions.

### E2E tests (Playwright)

Requires a running dev server (started automatically) and `e2e/.env.test` to be populated.

```bash
pnpm --filter @bookshelf/web test:e2e         # headless
pnpm --filter @bookshelf/web test:e2e:ui      # Playwright interactive UI
pnpm --filter @bookshelf/web test:e2e:headed  # visible browser
pnpm --filter @bookshelf/web test:e2e:debug   # step debugger
```

The global setup creates a fresh test user via the Supabase admin API before each run and tears it down afterwards.

---

## Monorepo Commands

All turbo tasks can be run from the repo root:

```bash
pnpm build                                # build all packages
pnpm --filter @bookshelf/web dev          # dev server
pnpm --filter @bookshelf/web lint         # ESLint
pnpm --filter @bookshelf/web typecheck    # tsc --noEmit

# Database (runs from packages/db context)
pnpm --filter @bookshelf/db db:push       # sync schema without migration files
pnpm --filter @bookshelf/db db:migrate    # apply pending migrations (production)
pnpm --filter @bookshelf/db db:generate   # regenerate Prisma client after schema changes
pnpm --filter @bookshelf/db db:studio     # open Prisma Studio (visual DB browser)
```

---

## Database Setup

### First-time (no migrations yet)

```bash
pnpm --filter @bookshelf/db db:push
```

Pushes the Prisma schema directly to the database. Does not create migration files. Safe for early development.

### Ongoing development

```bash
# After editing packages/db/prisma/schema.prisma:
pnpm exec prisma migrate dev --name describe_your_change
# → creates a migration file in packages/db/prisma/migrations/
# → applies it to your local dev DB
# → regenerates the Prisma client
```

Run this from `packages/db/` or use `pnpm exec prisma` from the repo root.

### Applying to production

```bash
pnpm --filter @bookshelf/db db:migrate
# runs: prisma migrate deploy (uses DATABASE_URL, not DIRECT_URL)
```

Always run migrations against `DIRECT_URL` (direct connection, port 5432), not the pgBouncer pooler. The `DIRECT_URL` in `schema.prisma` handles this automatically.

---

## Theme System

The app supports light and dark mode with zero configuration:

- **Default:** follows the OS preference (`prefers-color-scheme`)
- **Toggle:** sun/moon button in the sidebar footer (desktop) or header (mobile)
- **Persistence:** stored in `localStorage` under the key `bookshelf-theme`
- **No flash:** an inline `<script>` in `layout.tsx` sets `data-theme` on `<html>` synchronously before first paint

No environment variable is needed for the theme system.

---

## Known Gotchas

| Issue | Detail |
|-------|--------|
| **Vitest runs in `node` env** | No DOM APIs by default. Add `// @vitest-environment jsdom` to a test file only if truly needed. Theme persistence tests avoid this by using dependency injection (pure functions with injected `Storage` and MQL objects). |
| **`noUncheckedIndexedAccess` is enabled** | `array[0]` returns `T \| undefined`. Use a typed `first()` helper in tests rather than direct index access. |
| **Zustand stores are module singletons** | Reset state in `beforeEach` for isolated store tests. |
| **Prisma mock types need `as never`** | `vi.mocked(prisma.book.findFirst).mockResolvedValue(x as never)` — Prisma's deep generics don't unify with Vitest's mock types. See `docs/testing.md`. |
| **Inline `<script>` and CSP** | If a Content-Security-Policy header is added later, the theme init script will be blocked unless `'unsafe-inline'` or a nonce is allowed in `script-src`. |
| **`suppressHydrationWarning` on `<html>`** | Intentional. The inline script sets `data-theme` before React hydrates, so the server-rendered HTML won't have it. The suppression is scoped to `<html>` only. |
