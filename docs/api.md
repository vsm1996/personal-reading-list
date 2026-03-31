# API Reference

All routes are under `apps/web/src/app/api/`. Authentication is handled by `lib/api-auth.ts` — unauthenticated requests receive `401 Unauthorized`.

## Books

### `GET /api/books/search`

Search for books via the Open Library API. Acts as a server-side proxy to avoid exposing the upstream URL, enable caching, and provide a stable contract.

**Query params:**

| Param | Required | Description |
|-------|----------|-------------|
| `q` | Yes | Search query (min 2 characters) |

**Response:**
```json
{
  "results": [
    {
      "openLibraryId": "/works/OL1W",
      "title": "The Name of the Wind",
      "authors": ["Patrick Rothfuss"],
      "coverUrl": "https://covers.openlibrary.org/…",
      "publishYear": 2007,
      "isbn10": "0756404746",
      "isbn13": "9780756404741",
      "pageCount": 662,
      "publisher": "DAW Books"
    }
  ]
}
```

**Error codes:**

| Status | Cause |
|--------|-------|
| `400` | Missing or too-short query |
| `502` | Upstream Open Library returned an error |
| `503` | Network error reaching Open Library |

**Security:** `normalizeDoc()` is a field allow-list — only the 9 fields above are forwarded regardless of what Open Library returns.

---

## Library — Books

### `GET /api/library/books/[id]`

Fetch a single book from the authenticated user's library.

**Response:** `UserBook` with nested `Book`, `Shelf`, `Rating`, `Note`, `ReadingProgress`.

**Error codes:** `401`, `404`

---

### `PATCH /api/library/books/[id]`

Update a book in the user's library (move shelf, update date finished).

**Request body:**
```json
{ "shelfId": "clxxx", "dateFinished": "2024-06-01" }
```

**Error codes:** `400`, `401`, `404`

---

### `DELETE /api/library/books/[id]`

Remove a book from the user's library.

**Error codes:** `401`, `404`

---

### `POST /api/library/books/[id]/note`

Create, update, or delete the reading note for a book.

**Request body:**
```json
{ "content": "Loved this book" }
```

Sending `{ "content": "" }` or `{ "content": null }` deletes the note.

**Error codes:** `400`, `401`, `404`

---

### `POST /api/library/books/[id]/progress`

Log a reading progress update.

**Request body:**
```json
{ "currentPage": 150, "percentage": 22.7 }
```

**Error codes:** `400`, `401`, `404`

---

## Goals

### `GET /api/goals`

Return the authenticated user's reading goal for the current year (or a specified year).

**Query params:** `year` (optional, defaults to current year)

**Response:**
```json
{
  "goal": { "id": "clxxx", "year": 2024, "targetCount": 24, "isCompleted": false }
}
```

---

### `POST /api/goals`

Create a new reading goal.

**Request body:** `{ "year": 2024, "targetCount": 24 }`

---

### `PUT /api/goals`

Update an existing reading goal.

**Request body:** `{ "year": 2024, "targetCount": 30 }`

---

## Shelves

### `GET /api/shelves`

List all shelves for the authenticated user, ordered by `position`.

**Response:** `{ "shelves": Shelf[] }`

---

### `POST /api/shelves`

Create a new custom shelf.

**Request body:** `{ "name": "Favourites" }`

**Error codes:** `400` (duplicate name), `401`

---

### `PATCH /api/shelves/[id]`

Rename a shelf.

**Request body:** `{ "name": "New Name" }`

**Error codes:** `400`, `401`, `404`

---

### `DELETE /api/shelves/[id]`

Delete a custom shelf. Books on the shelf are moved to "Want to Read" before deletion.

**Error codes:** `401`, `404`, `409` (cannot delete default shelves)

---

## Import

### `POST /api/import/goodreads`

Bulk import books from a parsed Goodreads CSV export.

**Request body:**
```json
{
  "books": [
    {
      "title": "Dune",
      "authors": ["Frank Herbert"],
      "isbn13": "9780441013593",
      "isbn10": "0441013597",
      "pageCount": 604,
      "shelf": "read",
      "rating": 5,
      "dateFinished": "2024-01-15",
      "dateAdded": "2024-01-01"
    }
  ]
}
```

`shelf` must be one of: `"want-to-read"`, `"currently-reading"`, `"read"`.

**Response:** `{ "imported": 12, "skipped": 3 }`

Processes in batches of 20 inside a Prisma transaction. Duplicate books (same `profileId` + `bookId`) are silently skipped. Books without any ISBN identifier are skipped.

---

## Guest

### `POST /api/seed-guest`

Seed a guest demo library with sample books. Called from the guest page on first load.

Uses `createMany` with `skipDuplicates: true` so it is safe to call repeatedly.

**Response:** `{ "profileId": "…" }` — the newly seeded guest profile ID.
