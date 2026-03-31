# Database

Supabase Postgres. Schema managed with Prisma. Client exported from `@bookshelf/db`.

## Connection

```
DATABASE_URL   → pooled (pgBouncer) — used by all runtime queries
DIRECT_URL     → direct — used only by prisma migrate
```

## Model Map

```
Profile ──────────────────────────────────────── (mirrors auth.users)
  │
  ├── Shelf[]           (isDefault shelves seeded on signup via trigger)
  │
  ├── UserBook[]        ──── Book (global cache, shared across users)
  │     │
  │     ├── ReadingProgress    (current position, updated in place)
  │     ├── ProgressHistory[]  (time series — drives heatmap + stats)
  │     ├── Rating?
  │     └── Note?
  │
  ├── ReadingGoal[]     (one per year, @@unique [profileId, year])
  └── UserPreference?
```

## Models

### Profile

Mirrors `auth.users`. Created automatically by a Supabase trigger on signup.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK — matches `auth.users.id` |
| email | String? | @unique |
| displayName | String? | |
| avatarUrl | String? | |

### Book

Global book cache — one row per unique edition, shared across all users. No user data lives here.

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid() PK |
| openLibraryId | String? | @unique |
| googleBooksId | String? | @unique |
| title | String | |
| authors | String[] | |
| coverUrl | String? | |
| pageCount | Int? | |
| publishYear | Int? | |
| isbn10 | String? | NOT @unique — use findFirst, not upsert |
| isbn13 | String? | NOT @unique — use findFirst, not upsert |

> **Important:** `isbn10` and `isbn13` are **not** `@unique` in the schema. Use `findFirst + create` patterns when looking up by ISBN. Do not use `upsert({ where: { isbn13 } })` — this will produce a Prisma type error.

### Shelf

Per-user shelves. Default shelves (`isDefault: true`) are "Want to Read", "Currently Reading", and "Read".

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid() PK |
| profileId | UUID | FK → Profile |
| name | String | |
| position | Int | lower = higher in list |
| isDefault | Boolean | default shelves cannot be deleted |

### UserBook

A book in a user's library. One row per `(profileId, bookId)` pair — `@@unique([profileId, bookId])`.

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid() PK |
| profileId | UUID | FK → Profile |
| bookId | String | FK → Book |
| shelfId | String | FK → Shelf |
| dateAdded | DateTime | defaults to now() |
| dateFinished | DateTime? | null unless book is finished |

### ReadingProgress

Current reading position — one row per UserBook, updated in place.

| Field | Type | Notes |
|-------|------|-------|
| userBookId | String | @unique FK → UserBook |
| currentPage | Int | |
| percentage | Float | 0–100; used when pageCount is null |
| lastUpdated | DateTime | @updatedAt |

### ProgressHistory

Append-only log of all progress updates. Used to build the reading heatmap and pace statistics.

### Rating

| Field | Type | Notes |
|-------|------|-------|
| userBookId | String | @unique FK → UserBook |
| stars | Int | 1–5 |

### Note

| Field | Type | Notes |
|-------|------|-------|
| userBookId | String | @unique FK → UserBook |
| content | String | |

### ReadingGoal

Annual reading target. `@@unique([profileId, year])` — one goal per user per year.

| Field | Type | Notes |
|-------|------|-------|
| profileId | UUID | FK → Profile |
| year | Int | |
| targetCount | Int | |
| isCompleted | Boolean | set to true when count ≥ target |

### UserPreference

| Field | Type | Notes |
|-------|------|-------|
| profileId | UUID | @unique FK → Profile |
| theme | String | "light" \| "dark" \| "system" |
| defaultShelf | String? | shelf ID for "Add book" default |
| displayMode | String | "grid" \| "list" |

## Query Conventions

- Always scope queries to `profileId: user.id` — never trust client-supplied profile IDs
- Use `findFirst` (not `upsert`) for ISBN lookups — isbn10/isbn13 are not `@unique`
- Use `$transaction` for multi-step writes (import route, seed-guest)
- Use `createMany` with `skipDuplicates: true` for bulk inserts
- Prefer `select` to avoid over-fetching when returning to the client

## Migrations

```bash
# From packages/db/
pnpm prisma migrate dev --name describe_the_change
pnpm prisma generate
```

Supabase trigger for auto-creating profiles on signup lives in `supabase/migrations/`.
