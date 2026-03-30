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

vi.mock('@bookshelf/db', () => ({
  prisma: {
    userBook: { findFirst: vi.fn() },
    note: { upsert: vi.fn(), deleteMany: vi.fn() },
  },
}))

vi.mock('@/lib/api-auth', () => ({
  getAuthUser: vi.fn(),
  unauthorized: (msg = 'Unauthorized') => new Response(msg, { status: 401 }),
  forbidden: (msg = 'Forbidden') => new Response(msg, { status: 403 }),
  badRequest: (msg: string) => new Response(msg, { status: 400 }),
  notFound: (msg = 'Not found') => new Response(msg, { status: 404 }),
  conflict: (body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status: 409, headers: { 'Content-Type': 'application/json' } }),
}))

import { getAuthUser } from '@/lib/api-auth'
import { prisma } from '@bookshelf/db'
import { POST } from '@/app/api/library/books/[id]/note/route'

const mockGetAuthUser = vi.mocked(getAuthUser)
const mockPrisma = vi.mocked(prisma)

const MOCK_USER = { id: 'user-1', is_anonymous: false, app_metadata: {} }
const MOCK_USER_BOOK = { id: 'ub-1', profileId: 'user-1', bookId: 'book-1', shelfId: 'shelf-1' }

function makeRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/library/books/${id}/note`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => { vi.clearAllMocks() })

describe('POST /api/library/books/[id]/note', () => {
  describe('authentication', () => {
    it('returns 401 when unauthenticated', async () => {
      mockGetAuthUser.mockResolvedValue(null)
      const res = await POST(makeRequest('ub-1', { content: 'hello' }), {
        params: Promise.resolve({ id: 'ub-1' }),
      })
      expect(res.status).toBe(401)
    })
  })

  describe('authorization (IDOR)', () => {
    it('returns 404 when userBook belongs to another user', async () => {
      mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
      mockPrisma.userBook.findFirst.mockResolvedValue(null)
      const res = await POST(makeRequest('ub-other', { content: 'hello' }), {
        params: Promise.resolve({ id: 'ub-other' }),
      })
      expect(res.status).toBe(404)
      // Ownership check must filter by both id AND profileId
      expect(mockPrisma.userBook.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ profileId: 'user-1' }),
        })
      )
    })
  })

  describe('input validation', () => {
    it('returns 400 when content is not a string', async () => {
      mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
      mockPrisma.userBook.findFirst.mockResolvedValue(MOCK_USER_BOOK as never)
      const res = await POST(makeRequest('ub-1', { content: 123 }), {
        params: Promise.resolve({ id: 'ub-1' }),
      })
      expect(res.status).toBe(400)
    })

    it('returns 400 when content is missing (undefined)', async () => {
      mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
      mockPrisma.userBook.findFirst.mockResolvedValue(MOCK_USER_BOOK as never)
      const res = await POST(makeRequest('ub-1', {}), {
        params: Promise.resolve({ id: 'ub-1' }),
      })
      expect(res.status).toBe(400)
    })

    it('returns 400 when content exceeds 10,000 characters', async () => {
      mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
      mockPrisma.userBook.findFirst.mockResolvedValue(MOCK_USER_BOOK as never)
      const res = await POST(makeRequest('ub-1', { content: 'x'.repeat(10_001) }), {
        params: Promise.resolve({ id: 'ub-1' }),
      })
      expect(res.status).toBe(400)
    })

    it('accepts content at exactly 10,000 characters', async () => {
      mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
      mockPrisma.userBook.findFirst.mockResolvedValue(MOCK_USER_BOOK as never)
      const content = 'x'.repeat(10_000)
      mockPrisma.note.upsert.mockResolvedValue({ userBookId: 'ub-1', content } as never)
      const res = await POST(makeRequest('ub-1', { content }), {
        params: Promise.resolve({ id: 'ub-1' }),
      })
      expect(res.status).toBe(200)
    })
  })

  describe('note deletion', () => {
    it('deletes note and returns 204 when content is empty string', async () => {
      mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
      mockPrisma.userBook.findFirst.mockResolvedValue(MOCK_USER_BOOK as never)
      mockPrisma.note.deleteMany.mockResolvedValue({ count: 1 } as never)
      const res = await POST(makeRequest('ub-1', { content: '' }), {
        params: Promise.resolve({ id: 'ub-1' }),
      })
      expect(res.status).toBe(204)
      expect(mockPrisma.note.deleteMany).toHaveBeenCalledWith({
        where: { userBookId: 'ub-1' },
      })
      expect(mockPrisma.note.upsert).not.toHaveBeenCalled()
    })

    it('deletes note when content is whitespace-only', async () => {
      mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
      mockPrisma.userBook.findFirst.mockResolvedValue(MOCK_USER_BOOK as never)
      mockPrisma.note.deleteMany.mockResolvedValue({ count: 1 } as never)
      const res = await POST(makeRequest('ub-1', { content: '   ' }), {
        params: Promise.resolve({ id: 'ub-1' }),
      })
      expect(res.status).toBe(204)
      expect(mockPrisma.note.deleteMany).toHaveBeenCalled()
    })
  })

  describe('note upsert', () => {
    it('upserts note with trimmed content and returns 200 with { content }', async () => {
      mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
      mockPrisma.userBook.findFirst.mockResolvedValue(MOCK_USER_BOOK as never)
      mockPrisma.note.upsert.mockResolvedValue({ userBookId: 'ub-1', content: 'Great book' } as never)
      const res = await POST(makeRequest('ub-1', { content: '  Great book  ' }), {
        params: Promise.resolve({ id: 'ub-1' }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ content: 'Great book' })
      expect(mockPrisma.note.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userBookId: 'ub-1' },
          create: expect.objectContaining({ content: 'Great book' }),
          update: expect.objectContaining({ content: 'Great book' }),
        })
      )
    })

    it('does not call deleteMany when content is non-empty', async () => {
      mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
      mockPrisma.userBook.findFirst.mockResolvedValue(MOCK_USER_BOOK as never)
      mockPrisma.note.upsert.mockResolvedValue({ userBookId: 'ub-1', content: 'hello' } as never)
      await POST(makeRequest('ub-1', { content: 'hello' }), {
        params: Promise.resolve({ id: 'ub-1' }),
      })
      expect(mockPrisma.note.deleteMany).not.toHaveBeenCalled()
    })
  })
})
