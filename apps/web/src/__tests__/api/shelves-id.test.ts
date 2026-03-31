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
import { PATCH, DELETE } from '@/app/api/shelves/[id]/route'

const mockGetAuthUser = vi.mocked(getAuthUser)
const mockPrisma = vi.mocked(prisma)

const MOCK_USER = { id: 'user-1', is_anonymous: false, app_metadata: {} }

const MOCK_SHELF = {
  id: 'shelf-1',
  name: 'My Shelf',
  position: 2,
  isDefault: false,
  profileId: 'user-1',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/shelves/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null)

    const req = new Request('http://localhost/api/shelves/shelf-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'shelf-1' }) })

    expect(res.status).toBe(401)
  })

  it('returns 404 when shelf not found (IDOR: another user shelf)', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.shelf.findFirst.mockResolvedValue(null)

    const req = new Request('http://localhost/api/shelves/shelf-other', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'shelf-other' }) })

    expect(res.status).toBe(404)
  })

  it('returns 400 when body is empty (no name or position)', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.shelf.findFirst.mockResolvedValue(MOCK_SHELF as any)

    const req = new Request('http://localhost/api/shelves/shelf-1', {
      method: 'PATCH',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'shelf-1' }) })

    expect(res.status).toBe(400)
  })

  it('returns 400 when name is empty string', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.shelf.findFirst.mockResolvedValue(MOCK_SHELF as any)

    const req = new Request('http://localhost/api/shelves/shelf-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: '' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'shelf-1' }) })

    expect(res.status).toBe(400)
  })

  it('returns 400 for name > 100 chars', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.shelf.findFirst.mockResolvedValue(MOCK_SHELF as any)

    const req = new Request('http://localhost/api/shelves/shelf-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'a'.repeat(101) }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'shelf-1' }) })

    expect(res.status).toBe(400)
  })

  it('successfully updates name and returns updated shelf', async () => {
    const updatedShelf = { ...MOCK_SHELF, name: 'Renamed Shelf' }
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.shelf.findFirst.mockResolvedValue(MOCK_SHELF as any)
    mockPrisma.shelf.update.mockResolvedValue(updatedShelf as any)

    const req = new Request('http://localhost/api/shelves/shelf-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Renamed Shelf' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'shelf-1' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(updatedShelf)
  })

  it('successfully updates position and returns updated shelf', async () => {
    const updatedShelf = { ...MOCK_SHELF, position: 5 }
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.shelf.findFirst.mockResolvedValue(MOCK_SHELF as any)
    mockPrisma.shelf.update.mockResolvedValue(updatedShelf as any)

    const req = new Request('http://localhost/api/shelves/shelf-1', {
      method: 'PATCH',
      body: JSON.stringify({ position: 5 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'shelf-1' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(updatedShelf)
  })

  it('can update both name and position together', async () => {
    const updatedShelf = { ...MOCK_SHELF, name: 'New Name', position: 5 }
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.shelf.findFirst.mockResolvedValue(MOCK_SHELF as any)
    mockPrisma.shelf.update.mockResolvedValue(updatedShelf as any)

    const req = new Request('http://localhost/api/shelves/shelf-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name', position: 5 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'shelf-1' }) })

    expect(res.status).toBe(200)
    expect(mockPrisma.shelf.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: 'New Name', position: 5 },
      })
    )
  })
})

describe('DELETE /api/shelves/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null)

    const req = new Request('http://localhost/api/shelves/shelf-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'shelf-1' }) })

    expect(res.status).toBe(401)
  })

  it('returns 404 when shelf not found (IDOR)', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.shelf.findFirst.mockResolvedValue(null)

    const req = new Request('http://localhost/api/shelves/shelf-other', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'shelf-other' }) })

    expect(res.status).toBe(404)
  })

  it('returns 400 when shelf.isDefault is true', async () => {
    const defaultShelf = { ...MOCK_SHELF, isDefault: true, name: 'Want to Read' }
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.shelf.findFirst.mockResolvedValue(defaultShelf as any)

    const req = new Request('http://localhost/api/shelves/shelf-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'shelf-1' }) })

    expect(res.status).toBe(400)
    const text = await res.text()
    expect(text).toBe('Default shelves cannot be deleted.')
  })

  it('moves books to "Want to Read" and deletes shelf: $transaction called', async () => {
    const fallbackShelf = { id: 'shelf-wtr', name: 'Want to Read', isDefault: true, profileId: 'user-1', position: 0 }
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    // First call: ownership check returns the shelf to delete
    mockPrisma.shelf.findFirst.mockResolvedValueOnce(MOCK_SHELF as any)
    // Second call: fallback "Want to Read" shelf
    mockPrisma.shelf.findFirst.mockResolvedValueOnce(fallbackShelf as any)
    mockPrisma.$transaction.mockResolvedValue([])

    const req = new Request('http://localhost/api/shelves/shelf-1', { method: 'DELETE' })
    await DELETE(req, { params: Promise.resolve({ id: 'shelf-1' }) })

    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })

  it('returns 204 on success', async () => {
    const fallbackShelf = { id: 'shelf-wtr', name: 'Want to Read', isDefault: true, profileId: 'user-1', position: 0 }
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.shelf.findFirst.mockResolvedValueOnce(MOCK_SHELF as any)
    mockPrisma.shelf.findFirst.mockResolvedValueOnce(fallbackShelf as any)
    mockPrisma.$transaction.mockResolvedValue([])

    const req = new Request('http://localhost/api/shelves/shelf-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'shelf-1' }) })

    expect(res.status).toBe(204)
  })

  it('$transaction includes updateMany (move books) when fallback shelf found', async () => {
    const fallbackShelf = { id: 'shelf-wtr', name: 'Want to Read', isDefault: true, profileId: 'user-1', position: 0 }
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.shelf.findFirst.mockResolvedValueOnce(MOCK_SHELF as any)
    mockPrisma.shelf.findFirst.mockResolvedValueOnce(fallbackShelf as any)
    mockPrisma.$transaction.mockResolvedValue([])

    const req = new Request('http://localhost/api/shelves/shelf-1', { method: 'DELETE' })
    await DELETE(req, { params: Promise.resolve({ id: 'shelf-1' }) })

    // $transaction receives an array; it should have 2 entries (updateMany + delete)
    const transactionArg = mockPrisma.$transaction.mock.calls[0]![0] as unknown as unknown[]
    expect(Array.isArray(transactionArg)).toBe(true)
    expect(transactionArg).toHaveLength(2)
  })

  it('$transaction runs with just the delete when "Want to Read" shelf not found', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.shelf.findFirst.mockResolvedValueOnce(MOCK_SHELF as any)
    // No fallback shelf found
    mockPrisma.shelf.findFirst.mockResolvedValueOnce(null)
    mockPrisma.$transaction.mockResolvedValue([])

    const req = new Request('http://localhost/api/shelves/shelf-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'shelf-1' }) })

    expect(res.status).toBe(204)
    // $transaction receives an array with only the delete operation
    const transactionArg = mockPrisma.$transaction.mock.calls[0]![0] as unknown as unknown[]
    expect(Array.isArray(transactionArg)).toBe(true)
    expect(transactionArg).toHaveLength(1)
  })
})
