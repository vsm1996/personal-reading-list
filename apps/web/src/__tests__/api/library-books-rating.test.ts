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
    shelf: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    userBook: {
      findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(),
      create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(),
    },
    book: { findFirst: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), create: vi.fn() },
    readingProgress: { upsert: vi.fn() },
    progressHistory: { create: vi.fn() },
    rating: { upsert: vi.fn(), deleteMany: vi.fn() },
    note: { upsert: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
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
import { POST } from '@/app/api/library/books/[id]/rating/route'

const mockGetAuthUser = vi.mocked(getAuthUser)
const mockPrisma = vi.mocked(prisma)

const MOCK_USER = { id: 'user-1', is_anonymous: false, app_metadata: {} }

beforeEach(() => { vi.clearAllMocks() })

function makePostRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/library/books/${id}/rating`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('POST /api/library/books/[id]/rating', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null)
    const res = await POST(makePostRequest('ub-1', { stars: 3 }), makeParams('ub-1'))
    expect(res.status).toBe(401)
  })

  it('returns 404 when userBook belongs to another user (IDOR)', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue(null)
    const res = await POST(makePostRequest('other-book', { stars: 3 }), makeParams('other-book'))
    expect(res.status).toBe(404)
  })

  it('returns 400 for stars = 6 (above max)', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue({ id: 'ub-1', profileId: 'user-1' } as never)
    const res = await POST(makePostRequest('ub-1', { stars: 6 }), makeParams('ub-1'))
    expect(res.status).toBe(400)
  })

  it('returns 400 for stars = -1 (below min)', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue({ id: 'ub-1', profileId: 'user-1' } as never)
    const res = await POST(makePostRequest('ub-1', { stars: -1 }), makeParams('ub-1'))
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing stars', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue({ id: 'ub-1', profileId: 'user-1' } as never)
    const res = await POST(makePostRequest('ub-1', {}), makeParams('ub-1'))
    expect(res.status).toBe(400)
  })

  it('deletes rating when stars = 0 and returns 204', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue({ id: 'ub-1', profileId: 'user-1' } as never)
    mockPrisma.rating.deleteMany.mockResolvedValue({ count: 1 } as never)

    const res = await POST(makePostRequest('ub-1', { stars: 0 }), makeParams('ub-1'))

    expect(res.status).toBe(204)
    expect(mockPrisma.rating.deleteMany).toHaveBeenCalledWith({ where: { userBookId: 'ub-1' } })
  })

  it('upserts rating for stars 1-5 and returns 200 with { stars }', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue({ id: 'ub-1', profileId: 'user-1' } as never)
    mockPrisma.rating.upsert.mockResolvedValue({ userBookId: 'ub-1', stars: 4 } as never)

    const res = await POST(makePostRequest('ub-1', { stars: 4 }), makeParams('ub-1'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ stars: 4 })
    expect(mockPrisma.rating.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userBookId: 'ub-1' },
        create: expect.objectContaining({ stars: 4 }),
        update: expect.objectContaining({ stars: 4 }),
      })
    )
  })

  it('boundary: stars = 1 is valid', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue({ id: 'ub-1', profileId: 'user-1' } as never)
    mockPrisma.rating.upsert.mockResolvedValue({ userBookId: 'ub-1', stars: 1 } as never)

    const res = await POST(makePostRequest('ub-1', { stars: 1 }), makeParams('ub-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.stars).toBe(1)
  })

  it('boundary: stars = 5 is valid', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue({ id: 'ub-1', profileId: 'user-1' } as never)
    mockPrisma.rating.upsert.mockResolvedValue({ userBookId: 'ub-1', stars: 5 } as never)

    const res = await POST(makePostRequest('ub-1', { stars: 5 }), makeParams('ub-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.stars).toBe(5)
  })
})
