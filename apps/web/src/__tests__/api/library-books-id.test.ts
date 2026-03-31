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
import { PATCH } from '@/app/api/library/books/[id]/route'

const mockGetAuthUser = vi.mocked(getAuthUser)
const mockPrisma = prisma as any

const MOCK_USER = { id: 'user-1', is_anonymous: false, app_metadata: {} }

beforeEach(() => { vi.clearAllMocks() })

function makePatchRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/library/books/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('PATCH /api/library/books/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null)
    const res = await PATCH(makePatchRequest('ub-1', { shelfId: 'shelf-2' }), makeParams('ub-1'))
    expect(res.status).toBe(401)
  })

  it('returns 404 when userBookId belongs to another user (IDOR)', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue(null)
    const res = await PATCH(makePatchRequest('other-users-book', { shelfId: 'shelf-2' }), makeParams('other-users-book'))
    expect(res.status).toBe(404)
  })

  it('returns 400 when body is empty (no fields provided)', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue({ id: 'ub-1', profileId: 'user-1' } as never)
    const res = await PATCH(makePatchRequest('ub-1', {}), makeParams('ub-1'))
    expect(res.status).toBe(400)
  })

  it('returns 400 when shelfId points to another user shelf (IDOR on target shelf)', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue({ id: 'ub-1', profileId: 'user-1' } as never)
    // shelf.findFirst returns null — target shelf doesn't belong to user
    mockPrisma.shelf.findFirst.mockResolvedValue(null)
    const res = await PATCH(makePatchRequest('ub-1', { shelfId: 'other-users-shelf' }), makeParams('ub-1'))
    expect(res.status).toBe(400)
  })

  it('successfully moves book to a different shelf', async () => {
    const updatedBook = { id: 'ub-1', shelfId: 'shelf-2' }
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue({
      id: 'ub-1', profileId: 'user-1', dateFinished: null,
      book: { pageCount: null }, readingProgress: null,
    } as never)
    // Non-default shelf — no auto-fill
    mockPrisma.shelf.findFirst.mockResolvedValue({ id: 'shelf-2', profileId: 'user-1', name: 'Custom', isDefault: false } as never)
    mockPrisma.$transaction.mockResolvedValue([updatedBook] as never)

    const res = await PATCH(makePatchRequest('ub-1', { shelfId: 'shelf-2' }), makeParams('ub-1'))

    expect(res.status).toBe(200)
    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })

  it('auto-sets dateFinished and fills progress when moved to the Read shelf', async () => {
    const updatedBook = { id: 'ub-1', shelfId: 'read-shelf', dateFinished: new Date() }
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue({
      id: 'ub-1', profileId: 'user-1', dateFinished: null,
      book: { pageCount: 300 }, readingProgress: { currentPage: 120 },
    } as never)
    mockPrisma.shelf.findFirst.mockResolvedValue({ id: 'read-shelf', profileId: 'user-1', name: 'Read', isDefault: true } as never)
    mockPrisma.$transaction.mockResolvedValue([updatedBook, {}] as never)

    const res = await PATCH(makePatchRequest('ub-1', { shelfId: 'read-shelf' }), makeParams('ub-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.movedToRead).toBe(true)
    expect(body.autoProgress).toMatchObject({ percentage: 100, currentPage: 300 })
  })

  it('marks book as finished with a date', async () => {
    const updatedBook = { id: 'ub-1', dateFinished: new Date('2025-06-15') }
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue({
      id: 'ub-1', profileId: 'user-1', dateFinished: null,
      book: { pageCount: null }, readingProgress: null,
    } as never)
    mockPrisma.$transaction.mockResolvedValue([updatedBook] as never)

    const res = await PATCH(makePatchRequest('ub-1', { dateFinished: '2025-06-15' }), makeParams('ub-1'))

    expect(res.status).toBe(200)
  })

  it('unmarks finished by setting dateFinished to null', async () => {
    const updatedBook = { id: 'ub-1', dateFinished: null }
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue({
      id: 'ub-1', profileId: 'user-1', dateFinished: new Date('2025-06-15'),
      book: { pageCount: null }, readingProgress: null,
    } as never)
    mockPrisma.$transaction.mockResolvedValue([updatedBook] as never)

    const res = await PATCH(makePatchRequest('ub-1', { dateFinished: null }), makeParams('ub-1'))

    expect(res.status).toBe(200)
  })
})
