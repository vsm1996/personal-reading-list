---
name: Project architecture conventions
description: Layer conventions, file locations, and patterns established during build
type: project
---

**Data layer** (`src/lib/data/`): React cache()-wrapped Prisma queries. Import here — never query Prisma directly in pages/layouts.

**API routes** (`src/app/api/`): Always use `getAuthUser()` from `api-auth.ts`. Always validate input with `validate.ts`. Always do ownership checks (IDOR prevention) before any mutation.

**Stores** (`src/stores/`): Zustand. `library.store.ts` for book/shelf state, `ui.store.ts` for modal/sidebar state. Stores are hydrated from Server Component props, not from API calls on mount.

**Hooks** (`src/hooks/`): Client-only logic extracted from components. Must not have `"use client"` directive (that belongs on the consuming component).

**Mappers** (`src/lib/library-mappers.ts`): Pure Prisma → UI type transforms. Unit-testable without rendering.

**Validation** (`src/lib/validate.ts`): All API route input validated here. Throws `ValidationError` caught at route boundary.

**Why:** Separation lets each layer be tested independently. Routes mock `api-auth.ts`. Components mock stores. Mappers tested as pure functions.
