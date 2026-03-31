# Testing

## Stack

- **Vitest** — test runner
- **Testing Library** — React component tests
- `vi.fn()`, `vi.mock()`, `vi.useFakeTimers()` — mocking

## Running Tests

```bash
# From apps/web/
pnpm test            # run once
pnpm test --watch    # watch mode
pnpm test --coverage # coverage report
```

## Test Layout

```
apps/web/src/__tests__/
├── api/                     ← Route Handler tests (HTTP-level)
│   ├── books-search.test.ts
│   ├── goals.test.ts
│   ├── import-goodreads.test.ts
│   ├── library-books-id.test.ts
│   ├── library-books-note.test.ts
│   ├── library-books-progress.test.ts
│   ├── seed-guest.test.ts
│   └── shelves-id.test.ts
├── lib/                     ← Pure function unit tests
│   ├── goals-calculations.test.ts
│   ├── goodreads-csv.test.ts
│   ├── heatmap.test.ts
│   └── library-mappers.test.ts
└── stores/                  ← Zustand store tests
    ├── library.store.test.ts
    └── ui.store.test.ts
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
