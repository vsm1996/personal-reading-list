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
import { GET, POST } from '@/app/api/shelves/route'

const mockGetAuthUser = vi.mocked(getAuthUser)
const mockPrisma = prisma as any

const MOCK_USER = { id: 'user-1', is_anonymous: false, app_metadata: {} }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/shelves', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null)

    const res = await GET()

    expect(res.status).toBe(401)
  })

  it('returns empty array when user has no shelves', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.shelf.findMany.mockResolvedValue([])

    const res = await GET()

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('returns ordered shelves array', async () => {
    const mockShelves = [
      { id: 'shelf-1', name: 'Want to Read', position: 0, _count: { userBooks: 5 } },
      { id: 'shelf-2', name: 'Currently Reading', position: 1, _count: { userBooks: 2 } },
    ]
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.shelf.findMany.mockResolvedValue(mockShelves as any)

    const res = await GET()

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(mockShelves)
  })
})

describe('POST /api/shelves', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null)

    const req = new Request('http://localhost/api/shelves', {
      method: 'POST',
      body: JSON.stringify({ name: 'My List' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(401)
  })

  it('returns 400 for empty name', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)

    const req = new Request('http://localhost/api/shelves', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns 400 for whitespace-only name', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)

    const req = new Request('http://localhost/api/shelves', {
      method: 'POST',
      body: JSON.stringify({ name: '   ' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns 400 for name exceeding 100 chars', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)

    const req = new Request('http://localhost/api/shelves', {
      method: 'POST',
      body: JSON.stringify({ name: 'a'.repeat(101) }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('creates shelf at position 0 when no existing shelves', async () => {
    const mockShelf = {
      id: 'shelf-new',
      name: 'My Shelf',
      position: 0,
      isDefault: false,
      profileId: 'user-1',
      _count: { userBooks: 0 },
    }
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.shelf.findFirst.mockResolvedValue(null)
    mockPrisma.shelf.create.mockResolvedValue(mockShelf as any)

    const req = new Request('http://localhost/api/shelves', {
      method: 'POST',
      body: JSON.stringify({ name: 'My Shelf' }),
      headers: { 'Content-Type': 'application/json' },
    })
    await POST(req)

    expect(mockPrisma.shelf.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ position: 0 }),
      })
    )
  })

  it('creates shelf at lastPosition + 1 when shelves exist', async () => {
    const mockShelf = {
      id: 'shelf-new',
      name: 'My Shelf',
      position: 4,
      isDefault: false,
      profileId: 'user-1',
      _count: { userBooks: 0 },
    }
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.shelf.findFirst.mockResolvedValue({ position: 3 } as any)
    mockPrisma.shelf.create.mockResolvedValue(mockShelf as any)

    const req = new Request('http://localhost/api/shelves', {
      method: 'POST',
      body: JSON.stringify({ name: 'My Shelf' }),
      headers: { 'Content-Type': 'application/json' },
    })
    await POST(req)

    expect(mockPrisma.shelf.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ position: 4 }),
      })
    )
  })

  it('returns 201 status on success', async () => {
    const mockShelf = {
      id: 'shelf-new',
      name: 'My Shelf',
      position: 0,
      isDefault: false,
      profileId: 'user-1',
      _count: { userBooks: 0 },
    }
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.shelf.findFirst.mockResolvedValue(null)
    mockPrisma.shelf.create.mockResolvedValue(mockShelf as any)

    const req = new Request('http://localhost/api/shelves', {
      method: 'POST',
      body: JSON.stringify({ name: 'My Shelf' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(201)
  })

  it('response body includes shelf data', async () => {
    const mockShelf = {
      id: 'shelf-new',
      name: 'My Shelf',
      position: 0,
      isDefault: false,
      profileId: 'user-1',
      _count: { userBooks: 0 },
    }
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.shelf.findFirst.mockResolvedValue(null)
    mockPrisma.shelf.create.mockResolvedValue(mockShelf as any)

    const req = new Request('http://localhost/api/shelves', {
      method: 'POST',
      body: JSON.stringify({ name: 'My Shelf' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    const body = await res.json()
    expect(body).toEqual(mockShelf)
  })
})
