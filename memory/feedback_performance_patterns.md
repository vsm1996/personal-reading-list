---
name: Performance patterns for this project
description: Established patterns for rendering, caching, and data fetching performance
type: feedback
---

Use React `cache()` from 'react' for all Prisma queries in the data layer (`src/lib/data/`). Server Components that share data (e.g. layout sidebar + page body both needing shelves) deduplicate automatically — only one DB query fires per request.

Use `getAuthenticatedUser()` from `src/lib/data/user.ts` everywhere in Server Components instead of calling Supabase directly — same deduplication benefit.

**Why:** Without cache(), the layout and page each fire their own Prisma/Supabase calls for the same data in the same render pass.

**How to apply:** Any new Server Component that needs shared data (user, shelves, goals) should import from `src/lib/data/` not query Prisma directly.

Rendering split:
- Server Components → initial data fetching (library page, shelf detail, book detail)
- Client Components → interactivity (modals, forms, sort controls, progress updates)
- Zustand → optimistic client state after mutations
- PPR (`cacheLife`) on data-heavy routes for static shell + streamed content

URL-based pagination preferred over infinite scroll for shelf/book list views — simpler, bookmarkable, server-rendered, back-button safe.
