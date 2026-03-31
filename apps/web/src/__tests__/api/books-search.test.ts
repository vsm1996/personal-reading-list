import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('next/server', () => {
  class MockNextResponse extends Response {
    static json(data: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(data), {
        status: init?.status ?? 200,
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      })
    }
  }
  return { NextResponse: MockNextResponse, NextRequest: Request }
})

import { GET } from '@/app/api/books/search/route'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(q: string | null) {
  const url = q !== null
    ? `http://localhost/api/books/search?q=${encodeURIComponent(q)}`
    : 'http://localhost/api/books/search'
  return new Request(url)
}

function makeOLDoc(overrides: Record<string, unknown> = {}) {
  return {
    key: '/works/OL123W',
    title: 'Test Book',
    author_name: ['Test Author'],
    cover_i: 12345,
    first_publish_year: 2020,
    number_of_pages_median: 300,
    isbn: ['9780000000001', '0000000001'],
    publisher: ['Test Publisher'],
    ...overrides,
  }
}

function mockOLResponse(docs: unknown[], numFound = docs.length, status = 200) {
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ docs, numFound }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  )
}

// ─── Input validation ─────────────────────────────────────────────────────────

describe('GET /api/books/search', () => {
  describe('query validation', () => {
    it('returns { results: [] } with 200 when q is missing', async () => {
      const res = await GET(makeRequest(null))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ results: [] })
    })

    it('returns { results: [] } with 200 when q is empty string', async () => {
      const res = await GET(makeRequest(''))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ results: [] })
    })

    it('returns { results: [] } with 200 when q is a single character', async () => {
      const res = await GET(makeRequest('a'))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ results: [] })
    })

    it('does NOT call Open Library when query is too short', async () => {
      await GET(makeRequest('x'))
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('calls Open Library when query is 2 or more characters', async () => {
      mockOLResponse([])
      await GET(makeRequest('ab'))
      expect(mockFetch).toHaveBeenCalledOnce()
    })
  })

  // ── Successful response ──────────────────────────────────────────────────────

  describe('successful search', () => {
    it('returns 200 with results array', async () => {
      mockOLResponse([makeOLDoc()])
      const res = await GET(makeRequest('test book'))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body.results)).toBe(true)
    })

    it('returns total field from Open Library numFound', async () => {
      mockOLResponse([makeOLDoc()], 42)
      const res = await GET(makeRequest('test'))
      const body = await res.json()
      expect(body.total).toBe(42)
    })

    it('normalises openLibraryId from doc.key', async () => {
      mockOLResponse([makeOLDoc({ key: '/works/OL456W' })])
      const res = await GET(makeRequest('test'))
      const body = await res.json()
      expect(body.results[0].openLibraryId).toBe('/works/OL456W')
    })

    it('normalises title from doc.title', async () => {
      mockOLResponse([makeOLDoc({ title: 'My Book' })])
      const res = await GET(makeRequest('my book'))
      const body = await res.json()
      expect(body.results[0].title).toBe('My Book')
    })

    it('normalises authors from author_name array', async () => {
      mockOLResponse([makeOLDoc({ author_name: ['Alice', 'Bob'] })])
      const res = await GET(makeRequest('test'))
      const body = await res.json()
      expect(body.results[0].authors).toEqual(['Alice', 'Bob'])
    })

    it('returns empty authors array when author_name is missing', async () => {
      mockOLResponse([makeOLDoc({ author_name: undefined })])
      const res = await GET(makeRequest('test'))
      const body = await res.json()
      expect(body.results[0].authors).toEqual([])
    })

    it('builds HTTPS cover URL from cover_i', async () => {
      mockOLResponse([makeOLDoc({ cover_i: 9876 })])
      const res = await GET(makeRequest('test'))
      const body = await res.json()
      expect(body.results[0].coverUrl).toBe('https://covers.openlibrary.org/b/id/9876-M.jpg')
    })

    it('sets coverUrl to null when cover_i is absent', async () => {
      mockOLResponse([makeOLDoc({ cover_i: undefined })])
      const res = await GET(makeRequest('test'))
      const body = await res.json()
      expect(body.results[0].coverUrl).toBeNull()
    })

    it('normalises publishYear from first_publish_year', async () => {
      mockOLResponse([makeOLDoc({ first_publish_year: 1999 })])
      const res = await GET(makeRequest('test'))
      const body = await res.json()
      expect(body.results[0].publishYear).toBe(1999)
    })

    it('sets publishYear to null when first_publish_year is absent', async () => {
      mockOLResponse([makeOLDoc({ first_publish_year: undefined })])
      const res = await GET(makeRequest('test'))
      const body = await res.json()
      expect(body.results[0].publishYear).toBeNull()
    })

    it('normalises pageCount from number_of_pages_median', async () => {
      mockOLResponse([makeOLDoc({ number_of_pages_median: 512 })])
      const res = await GET(makeRequest('test'))
      const body = await res.json()
      expect(body.results[0].pageCount).toBe(512)
    })

    it('sets pageCount to null when number_of_pages_median is absent', async () => {
      mockOLResponse([makeOLDoc({ number_of_pages_median: undefined })])
      const res = await GET(makeRequest('test'))
      const body = await res.json()
      expect(body.results[0].pageCount).toBeNull()
    })

    it('picks isbn13 (13-digit) from isbn array', async () => {
      mockOLResponse([makeOLDoc({ isbn: ['9781234567890', '1234567890'] })])
      const res = await GET(makeRequest('test'))
      const body = await res.json()
      expect(body.results[0].isbn13).toBe('9781234567890')
    })

    it('picks isbn10 (10-digit) from isbn array', async () => {
      mockOLResponse([makeOLDoc({ isbn: ['9781234567890', '1234567890'] })])
      const res = await GET(makeRequest('test'))
      const body = await res.json()
      expect(body.results[0].isbn10).toBe('1234567890')
    })

    it('sets isbn13 to null when no 13-digit isbn exists', async () => {
      mockOLResponse([makeOLDoc({ isbn: ['1234567890'] })])
      const res = await GET(makeRequest('test'))
      const body = await res.json()
      expect(body.results[0].isbn13).toBeNull()
    })

    it('sets isbn10 to null when no 10-digit isbn exists', async () => {
      mockOLResponse([makeOLDoc({ isbn: ['9781234567890'] })])
      const res = await GET(makeRequest('test'))
      const body = await res.json()
      expect(body.results[0].isbn10).toBeNull()
    })

    it('sets both isbn fields to null when isbn array is missing', async () => {
      mockOLResponse([makeOLDoc({ isbn: undefined })])
      const res = await GET(makeRequest('test'))
      const body = await res.json()
      expect(body.results[0].isbn13).toBeNull()
      expect(body.results[0].isbn10).toBeNull()
    })

    it('takes the first publisher from publisher array', async () => {
      mockOLResponse([makeOLDoc({ publisher: ['Penguin', 'Random House'] })])
      const res = await GET(makeRequest('test'))
      const body = await res.json()
      expect(body.results[0].publisher).toBe('Penguin')
    })

    it('sets publisher to null when publisher array is absent', async () => {
      mockOLResponse([makeOLDoc({ publisher: undefined })])
      const res = await GET(makeRequest('test'))
      const body = await res.json()
      expect(body.results[0].publisher).toBeNull()
    })

    it('returns empty results array when OL returns no docs', async () => {
      mockOLResponse([])
      const res = await GET(makeRequest('obscure query'))
      const body = await res.json()
      expect(body.results).toEqual([])
    })

    it('handles missing docs field in OL response gracefully', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ numFound: 0 }), { status: 200 })
      )
      const res = await GET(makeRequest('test'))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.results).toEqual([])
    })
  })

  // ── External API failures ────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns 502 when Open Library responds with a non-OK status', async () => {
      mockFetch.mockResolvedValue(new Response('', { status: 500 }))
      const res = await GET(makeRequest('test'))
      expect(res.status).toBe(502)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('returns 503 when fetch throws (network error)', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'))
      const res = await GET(makeRequest('test'))
      expect(res.status).toBe(503)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('returns 502 when Open Library returns 429 (rate limited)', async () => {
      mockFetch.mockResolvedValue(new Response('Too Many Requests', { status: 429 }))
      const res = await GET(makeRequest('test'))
      expect(res.status).toBe(502)
    })

    it('returns 502 when Open Library returns 503', async () => {
      mockFetch.mockResolvedValue(new Response('Service Unavailable', { status: 503 }))
      const res = await GET(makeRequest('test'))
      expect(res.status).toBe(502)
    })
  })

  // ── Outbound request hygiene ─────────────────────────────────────────────────

  describe('outbound request', () => {
    it('sends request to openlibrary.org', async () => {
      mockOLResponse([])
      await GET(makeRequest('tolkien'))
      const [url] = mockFetch.mock.calls[0] as [string]
      expect(url).toContain('openlibrary.org')
    })

    it('passes the query string to OL', async () => {
      mockOLResponse([])
      await GET(makeRequest('tolkien'))
      const [url] = mockFetch.mock.calls[0] as [string]
      expect(url).toContain('tolkien')
    })

    it('includes a User-Agent header', async () => {
      mockOLResponse([])
      await GET(makeRequest('test'))
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      const headers = options?.headers as Record<string, string>
      expect(headers?.['User-Agent']).toBeTruthy()
    })

    it('limits results to 24 per request', async () => {
      mockOLResponse([])
      await GET(makeRequest('test'))
      const [url] = mockFetch.mock.calls[0] as [string]
      expect(url).toContain('limit=24')
    })
  })

  // ── Security ─────────────────────────────────────────────────────────────────

  describe('security', () => {
    it('does not expose raw OL response fields not in the allowed schema', async () => {
      mockOLResponse([makeOLDoc({ internal_field: 'sensitive', _version_: 12345 })])
      const res = await GET(makeRequest('test'))
      const body = await res.json()
      const book = body.results[0]
      // Only known fields should be present
      const allowedKeys = new Set(['openLibraryId','title','authors','coverUrl','publishYear','pageCount','isbn13','isbn10','publisher'])
      for (const key of Object.keys(book)) {
        expect(allowedKeys.has(key)).toBe(true)
      }
    })

    it('whitespace-only query returns empty results without calling OL', async () => {
      const res = await GET(makeRequest('   '))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.results).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})
