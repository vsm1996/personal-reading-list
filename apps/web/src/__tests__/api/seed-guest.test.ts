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
  return {
    NextResponse: MockNextResponse,
    NextRequest: Request,
  }
})

vi.mock('@bookshelf/db', () => ({
  prisma: {
    readingGoal: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    shelf: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    userBook: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
    },
    book: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
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
    new Response(JSON.stringify(body), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    }),
}))

import { getAuthUser } from '@/lib/api-auth'
import { prisma } from '@bookshelf/db'
import { POST } from '@/app/api/seed-guest/route'
import { CURATED_BOOKS } from '@/data/curated-books'

const mockGetAuthUser = vi.mocked(getAuthUser)
const mockPrisma = vi.mocked(prisma)

const ANON_USER_FLAG = { id: 'anon-1', is_anonymous: true, app_metadata: {} }
const ANON_USER_PROVIDER = { id: 'anon-2', is_anonymous: false, app_metadata: { provider: 'anonymous' } }
const REAL_USER = { id: 'user-1', is_anonymous: false, app_metadata: { provider: 'email' } }

const DEFAULT_SHELVES = [
  { id: 'shelf-wtr', name: 'Want to Read' },
  { id: 'shelf-cr', name: 'Currently Reading' },
  { id: 'shelf-read', name: 'Read' },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/seed-guest', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null)

    const res = await POST()

    expect(res.status).toBe(401)
  })

  it('returns 403 when user is authenticated but not anonymous (email provider)', async () => {
    mockGetAuthUser.mockResolvedValue(REAL_USER as any)

    const res = await POST()

    expect(res.status).toBe(403)
  })

  it('returns 403 when user has undefined is_anonymous and no anonymous provider', async () => {
    const nonAnonUser = { id: 'user-2', is_anonymous: undefined, app_metadata: { provider: 'google' } }
    mockGetAuthUser.mockResolvedValue(nonAnonUser as any)

    const res = await POST()

    expect(res.status).toBe(403)
  })

  it('accepts anonymous user via is_anonymous: true', async () => {
    mockGetAuthUser.mockResolvedValue(ANON_USER_FLAG as any)
    mockPrisma.userBook.count.mockResolvedValue(5)

    const res = await POST()

    // Should not get 401 or 403 — idempotency guard returns 200
    expect(res.status).toBe(200)
  })

  it('accepts anonymous user via app_metadata.provider === "anonymous"', async () => {
    mockGetAuthUser.mockResolvedValue(ANON_USER_PROVIDER as any)
    mockPrisma.userBook.count.mockResolvedValue(3)

    const res = await POST()

    // Should not get 401 or 403 — idempotency guard returns 200
    expect(res.status).toBe(200)
  })

  it('returns { seeded: N, skipped: true } (200) when library already has books', async () => {
    mockGetAuthUser.mockResolvedValue(ANON_USER_FLAG as any)
    mockPrisma.userBook.count.mockResolvedValue(10)

    const res = await POST()

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ seeded: 10, skipped: true })
  })

  it('seeds books on empty library: calls book.createMany, book.findMany, userBook.createMany, returns 201 with { seeded: N }', async () => {
    mockGetAuthUser.mockResolvedValue(ANON_USER_FLAG as any)
    mockPrisma.userBook.count.mockResolvedValue(0)
    mockPrisma.shelf.findMany.mockResolvedValue(DEFAULT_SHELVES as any)
    mockPrisma.book.createMany.mockResolvedValue({ count: CURATED_BOOKS.length } as any)

    // Build a matching savedBooks array from CURATED_BOOKS (mock all of them)
    const savedBooks = CURATED_BOOKS.map((b, i) => ({
      id: `book-${i}`,
      openLibraryId: b.openLibraryId,
    }))
    mockPrisma.book.findMany.mockResolvedValue(savedBooks as any)
    mockPrisma.userBook.createMany.mockResolvedValue({ count: savedBooks.length } as any)

    const res = await POST()

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(typeof body.seeded).toBe('number')
    expect(body.seeded).toBeGreaterThan(0)

    // book.createMany called once with skipDuplicates for all curated books
    expect(mockPrisma.book.createMany).toHaveBeenCalledOnce()
    expect(mockPrisma.book.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true })
    )

    // userBook.createMany called once to batch-create all user–book relations
    expect(mockPrisma.userBook.createMany).toHaveBeenCalledOnce()
    expect(mockPrisma.userBook.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true })
    )
  })
})
