# Testing

## Stack

- **Vitest** — unit test runner (node environment, no jsdom)
- **Playwright** — E2E tests against a live dev server
- `vi.fn()`, `vi.mock()`, `vi.useFakeTimers()`, `vi.stubGlobal()` — mocking

> `@testing-library/react` and `jsdom` are intentionally not installed. All logic under test is extracted into pure functions or Zustand stores so it can be tested without a DOM.

## Running Tests

```bash
# From apps/web/
pnpm test            # run once
pnpm test --watch    # watch mode
pnpm test --coverage # coverage report
```

## Test Layout

```
apps/web/
├── src/__tests__/
│   ├── api/                       ← Route Handler tests (HTTP-level)
│   │   ├── books-search.test.ts
│   │   ├── goals.test.ts
│   │   ├── import-goodreads.test.ts
│   │   ├── library-books-id.test.ts
│   │   ├── library-books-note.test.ts
│   │   ├── library-books-progress.test.ts
│   │   ├── library-books-rating.test.ts
│   │   ├── seed-guest.test.ts
│   │   ├── shelves.test.ts
│   │   └── shelves-id.test.ts
│   ├── lib/                       ← Pure function unit tests
│   │   ├── goals-calculations.test.ts
│   │   ├── goodreads-csv.test.ts
│   │   ├── heatmap.test.ts
│   │   ├── library-mappers.test.ts
│   │   ├── theme-persistence.test.ts
│   │   └── validate.test.ts
│   └── stores/                    ← Zustand store tests
│       ├── library.store.test.ts
│       └── ui.store.test.ts
└── e2e/                           ← Playwright E2E specs
    ├── auth.spec.ts
    ├── auth.setup.ts
    ├── book-detail.spec.ts
    ├── goals.spec.ts
    ├── guest.spec.ts
    ├── import.spec.ts
    ├── landing.spec.ts
    ├── library.spec.ts
    ├── stats.spec.ts
    └── theme.spec.ts
```

## Conventions

### Mocking Prisma

Prisma has complex generic types. `vi.mock('@bookshelf/db')` works, but accessing `mockResolvedValue` on typed mock methods requires a `as never` cast because TypeScript can't unify the Prisma client generics with the Vitest mock shape:

```typescript
vi.mock('@bookshelf/db', () => ({
  prisma: {
    book: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// In the test:
vi.mocked(prisma.book.findFirst).mockResolvedValue(mockBook as never);
```

This is a known Prisma + Vitest limitation. The cast is intentional, not a type error in the business logic.

### Mocking `fetch` (Open Library proxy)

The books search route proxies to Open Library. Tests use `vi.stubGlobal` to intercept the `fetch` call:

```typescript
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

mockFetch.mockResolvedValue(
  new Response(JSON.stringify({ docs: [] }), { status: 200 })
);
```

### Deterministic Dates

Tests that depend on the current date use `vi.useFakeTimers()`:

```typescript
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-06-15'));
});
afterEach(() => vi.useRealTimers());
```

### `noUncheckedIndexedAccess`

This tsconfig option is enabled. Array index access returns `T | undefined`. In tests, use an assertion helper rather than `result[0]`:

```typescript
function first<T>(arr: T[]): T {
  const item = arr[0];
  if (!item) throw new Error('Expected at least one item');
  return item;
}

// Usage:
expect(first(result).title).toBe('Dune');
```

For typed tuple destructuring:
```typescript
const [a, b] = result as [ParsedBook, ParsedBook];
```

### CSV Test Helpers

The Goodreads CSV parser tests use a `makeRow()` helper that builds a correctly-formatted CSV row from a partial `defaults` object. A `quoteCsvField()` function wraps any value containing commas in double-quotes to prevent column-shift bugs:

```typescript
function quoteCsvField(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}
```

This is critical — the default `Author l-f` value is `"Author, Test"` which contains a comma. Without quoting, `splitCsvLine` shifts all subsequent columns by one.

## What We Test

### API routes

- Authentication: unauthenticated → 401
- Input validation: missing/invalid fields → 400
- Happy path: correct input → correct DB calls + 200 response
- Error handling: DB errors, upstream errors
- Security: response allow-lists, no data leakage

### Pure functions (`lib/`)

- Edge cases (empty input, null values, boundary conditions)
- Deterministic output given deterministic input
- Security: SQL injection inputs return null, not throw
- Date-sensitive logic tested with fake timers

### Stores

- State transitions: optimistic updates, rollback on error
- Selector correctness
- No side effects outside store boundaries

---

## Theme Tests

### Unit tests — `src/__tests__/lib/theme-persistence.test.ts`

Tests the four pure functions in `lib/theme-persistence.ts` using a dependency-injected `Storage` mock (Map-backed object) and a plain `{ matches: boolean }` object in place of `MediaQueryList`. No DOM, no jsdom, no `vi.stubGlobal` required.

Coverage:
- `getStoredTheme`: returns `'light'` / `'dark'` / `null` for valid, invalid, and missing values
- `setStoredTheme`: writes value, overwrites previous value
- `getSystemTheme`: dark when `mql.matches`, light otherwise
- `resolveInitialTheme`: stored value wins; falls back to system; ignores invalid stored values

### E2E tests — `e2e/theme.spec.ts`

Assigned to the `public` Playwright project (no auth required). Uses:
- `page.emulateMedia({ colorScheme })` to simulate OS preference
- `page.addInitScript()` to pre-seed `localStorage` before the page loads
- `html[data-theme]` attribute as the assertion target

Coverage:
- Default theme matches OS preference (dark + light)
- Stored value overrides OS preference (both directions)
- No flash: `data-theme` is set before `DOMContentLoaded`
- Toggle switches theme in both directions
- Choice persists across client-side navigation
- Choice persists across full page reload
