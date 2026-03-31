import { describe, it, expect } from 'vitest'
import { parseGoodreadsCSV } from '@/lib/parsers/goodreads-csv'
import type { ParsedBook } from '@/lib/parsers/goodreads-csv'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Assert that the array has at least one item and return the first element.
 * Throws a clear error if the array is empty, which gives a better failure
 * message than a cryptic "Cannot read property of undefined".
 */
function first(books: ParsedBook[]): ParsedBook {
  const book = books[0]
  if (!book) throw new Error('Expected at least one parsed book but got none')
  return book
}

/**
 * Wraps a CSV field value in double-quotes when it contains a comma, quote, or
 * newline — mirrors the quoting rules expected by splitCsvLine in the parser.
 */
function quoteCsvField(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"'
  }
  return val
}

const HEADER =
  'Book Id,Title,Author,Author l-f,Additional Authors,ISBN,ISBN13,My Rating,Average Rating,Publisher,Binding,Number of Pages,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Bookshelves with positions,Exclusive Shelf,My Review,Spoiler,Private Notes,Read Count,Owned Copies'

function makeRow(overrides: Partial<Record<string, string>> = {}): string {
  const defaults: Record<string, string> = {
    'Book Id': '1',
    Title: 'Test Book',
    Author: 'Test Author',
    'Author l-f': 'Author, Test',
    'Additional Authors': '',
    ISBN: '="1234567890"',
    ISBN13: '="9781234567890"',
    'My Rating': '0',
    'Average Rating': '4.00',
    Publisher: 'Test Publisher',
    Binding: 'Paperback',
    'Number of Pages': '300',
    'Year Published': '2020',
    'Original Publication Year': '2020',
    'Date Read': '',
    'Date Added': '2024/01/15',
    Bookshelves: 'want-to-read',
    'Bookshelves with positions': 'want-to-read (#1)',
    'Exclusive Shelf': 'want-to-read',
    'My Review': '',
    Spoiler: '',
    'Private Notes': '',
    'Read Count': '0',
    'Owned Copies': '0',
    ...overrides,
  }
  const colOrder = [
    'Book Id','Title','Author','Author l-f','Additional Authors','ISBN','ISBN13',
    'My Rating','Average Rating','Publisher','Binding','Number of Pages',
    'Year Published','Original Publication Year','Date Read','Date Added',
    'Bookshelves','Bookshelves with positions','Exclusive Shelf','My Review',
    'Spoiler','Private Notes','Read Count','Owned Copies',
  ]
  return colOrder.map((col) => quoteCsvField(defaults[col] ?? '')).join(',')
}

function makeCsv(...rows: string[]): string {
  return [HEADER, ...rows].join('\n')
}

// ─── parseGoodreadsCSV ─────────────────────────────────────────────────────────

describe('parseGoodreadsCSV', () => {
  // ── Empty / malformed input ──────────────────────────────────────────────────

  it('returns [] for an empty string', () => {
    expect(parseGoodreadsCSV('')).toEqual([])
  })

  it('returns [] for header-only CSV (no data rows)', () => {
    expect(parseGoodreadsCSV(HEADER)).toEqual([])
  })

  it('returns [] for a string with no newlines', () => {
    expect(parseGoodreadsCSV('not,a,real,csv')).toEqual([])
  })

  it('skips blank lines between data rows', () => {
    const csv = [HEADER, makeRow(), '', makeRow({ Title: 'Second Book', 'Book Id': '2' })].join('\n')
    const result = parseGoodreadsCSV(csv)
    expect(result).toHaveLength(2)
  })

  it('handles Windows-style CRLF line endings', () => {
    const csv = [HEADER, makeRow()].join('\r\n')
    const result = parseGoodreadsCSV(csv)
    expect(result).toHaveLength(1)
    expect(first(result).title).toBe('Test Book')
  })

  // ── Title and authors ────────────────────────────────────────────────────────

  it('parses title correctly', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ Title: 'My Great Book' })))
    expect(first(result).title).toBe('My Great Book')
  })

  it('parses author into authors array', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ Author: 'Jane Austen' })))
    expect(first(result).authors).toEqual(['Jane Austen'])
  })

  it('produces empty authors array when Author field is blank', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ Author: '' })))
    expect(first(result).authors).toEqual([])
  })

  it('skips rows with blank title', () => {
    const csv = makeCsv(makeRow({ Title: '' }), makeRow({ Title: 'Real Book', 'Book Id': '2' }))
    const result = parseGoodreadsCSV(csv)
    expect(result).toHaveLength(1)
    expect(first(result).title).toBe('Real Book')
  })

  it('handles titles with commas inside double-quotes', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ Title: 'Hello, World' })))
    expect(first(result).title).toBe('Hello, World')
  })

  it('handles escaped double-quotes inside a quoted field', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ Title: 'It"s a Test' })))
    expect(first(result).title).toBe('It"s a Test')
  })

  // ── ISBN parsing ─────────────────────────────────────────────────────────────

  it('strips the ="..." wrapper from ISBN10', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ ISBN: '="1234567890"' })))
    expect(first(result).isbn10).toBe('1234567890')
  })

  it('strips the ="..." wrapper from ISBN13', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ ISBN13: '="9781234567890"' })))
    expect(first(result).isbn13).toBe('9781234567890')
  })

  it('accepts bare (no-wrapper) 10-digit ISBN', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ ISBN: '1234567890' })))
    expect(first(result).isbn10).toBe('1234567890')
  })

  it('accepts bare (no-wrapper) 13-digit ISBN', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ ISBN13: '9781234567890' })))
    expect(first(result).isbn13).toBe('9781234567890')
  })

  it('returns null isbn10 for a non-10-digit value', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ ISBN: '="123"' })))
    expect(first(result).isbn10).toBeNull()
  })

  it('returns null isbn13 for a non-13-digit value', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ ISBN13: '="123"' })))
    expect(first(result).isbn13).toBeNull()
  })

  it('returns null isbn10 when field contains non-digit characters', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ ISBN: '="12345ABC90"' })))
    expect(first(result).isbn10).toBeNull()
  })

  it('returns null isbn13 when field contains non-digit characters', () => {
    // Security: malformed ISBN should not be stored
    const result = parseGoodreadsCSV(makeCsv(makeRow({ ISBN13: '="978<script>"' })))
    expect(first(result).isbn13).toBeNull()
  })

  it('handles empty ISBN fields gracefully', () => {
    const book = first(parseGoodreadsCSV(makeCsv(makeRow({ ISBN: '', ISBN13: '' }))))
    expect(book.isbn10).toBeNull()
    expect(book.isbn13).toBeNull()
  })

  // ── Rating ───────────────────────────────────────────────────────────────────

  it('parses rating 4 correctly', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ 'My Rating': '4' })))
    expect(first(result).rating).toBe(4)
  })

  it('rating 0 becomes null (not rated)', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ 'My Rating': '0' })))
    expect(first(result).rating).toBeNull()
  })

  it('blank rating becomes null', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ 'My Rating': '' })))
    expect(first(result).rating).toBeNull()
  })

  it('non-numeric rating becomes null', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ 'My Rating': 'five' })))
    expect(first(result).rating).toBeNull()
  })

  it('rating 5 is the maximum valid value', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ 'My Rating': '5' })))
    expect(first(result).rating).toBe(5)
  })

  // ── Page count ───────────────────────────────────────────────────────────────

  it('parses page count correctly', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ 'Number of Pages': '480' })))
    expect(first(result).pageCount).toBe(480)
  })

  it('zero page count becomes null', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ 'Number of Pages': '0' })))
    expect(first(result).pageCount).toBeNull()
  })

  it('blank page count becomes null', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ 'Number of Pages': '' })))
    expect(first(result).pageCount).toBeNull()
  })

  it('non-numeric page count becomes null', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ 'Number of Pages': 'many' })))
    expect(first(result).pageCount).toBeNull()
  })

  // ── Date parsing ─────────────────────────────────────────────────────────────

  it('parses Date Read in YYYY/MM/DD format to ISO string', () => {
    const book = first(parseGoodreadsCSV(makeCsv(makeRow({ 'Date Read': '2023/06/15' }))))
    expect(book.dateFinished).not.toBeNull()
    expect(book.dateFinished).toMatch(/^2023-06-15/)
  })

  it('parses Date Added in YYYY/MM/DD format to ISO string', () => {
    const book = first(parseGoodreadsCSV(makeCsv(makeRow({ 'Date Added': '2022/03/01' }))))
    expect(book.dateAdded).not.toBeNull()
    expect(book.dateAdded).toMatch(/^2022-03-01/)
  })

  it('blank Date Read becomes null (dateFinished)', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ 'Date Read': '' })))
    expect(first(result).dateFinished).toBeNull()
  })

  it('blank Date Added becomes null (dateAdded)', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ 'Date Added': '' })))
    expect(first(result).dateAdded).toBeNull()
  })

  it('returns null for an invalid date string that does not match YYYY/MM/DD', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ 'Date Read': 'Jan 2023' })))
    expect(first(result).dateFinished).toBeNull()
  })

  // ── Shelf mapping ────────────────────────────────────────────────────────────

  it('maps "want-to-read" Bookshelves to "want-to-read"', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ Bookshelves: 'want-to-read' })))
    expect(first(result).shelf).toBe('want-to-read')
  })

  it('maps "read" Bookshelves to "read"', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ Bookshelves: 'read' })))
    expect(first(result).shelf).toBe('read')
  })

  it('maps "currently-reading" Bookshelves to "currently-reading"', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ Bookshelves: 'currently-reading' })))
    expect(first(result).shelf).toBe('currently-reading')
  })

  it('"read" takes precedence over other values in a comma-separated shelf list', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ Bookshelves: 'favorites, read' })))
    expect(first(result).shelf).toBe('read')
  })

  it('falls back to "want-to-read" for an unrecognised shelf value', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ Bookshelves: 'my-custom-shelf' })))
    expect(first(result).shelf).toBe('want-to-read')
  })

  it('shelf matching is case-insensitive', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ Bookshelves: 'READ' })))
    expect(first(result).shelf).toBe('read')
  })

  // ── Multi-row / integration ──────────────────────────────────────────────────

  it('parses multiple rows independently', () => {
    const csv = makeCsv(
      makeRow({ Title: 'Book One', 'My Rating': '3' }),
      makeRow({ Title: 'Book Two', 'Book Id': '2', 'My Rating': '5', Bookshelves: 'read' }),
    )
    const result = parseGoodreadsCSV(csv)
    expect(result).toHaveLength(2)
    const [one, two] = result as [ParsedBook, ParsedBook]
    expect(one.title).toBe('Book One')
    expect(one.rating).toBe(3)
    expect(two.title).toBe('Book Two')
    expect(two.rating).toBe(5)
    expect(two.shelf).toBe('read')
  })

  it('returns a ParsedBook shape with all required keys', () => {
    const book = first(parseGoodreadsCSV(makeCsv(makeRow())))
    expect(book).toHaveProperty('title')
    expect(book).toHaveProperty('authors')
    expect(book).toHaveProperty('isbn13')
    expect(book).toHaveProperty('isbn10')
    expect(book).toHaveProperty('pageCount')
    expect(book).toHaveProperty('shelf')
    expect(book).toHaveProperty('rating')
    expect(book).toHaveProperty('dateFinished')
    expect(book).toHaveProperty('dateAdded')
  })

  // ── Security — injection / malformed values ──────────────────────────────────

  it('does not crash on a very long title field', () => {
    const longTitle = 'A'.repeat(10_000)
    const result = parseGoodreadsCSV(makeCsv(makeRow({ Title: longTitle })))
    expect(first(result).title).toBe(longTitle)
  })

  it('treats an ISBN containing SQL injection characters as invalid (returns null)', () => {
    const result = parseGoodreadsCSV(makeCsv(makeRow({ ISBN: "=\"' OR '1'='1\"" })))
    expect(first(result).isbn10).toBeNull()
  })

  it('does not evaluate script tags in title', () => {
    // Parser returns the raw string — caller is responsible for sanitisation
    const xss = '<script>alert(1)</script>'
    const result = parseGoodreadsCSV(makeCsv(makeRow({ Title: xss })))
    expect(first(result).title).toBe(xss)
  })
})
