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
import { GET, POST } from '@/app/api/goals/route'

const mockGetAuthUser = vi.mocked(getAuthUser)
const mockPrisma = vi.mocked(prisma)

const MOCK_USER = { id: 'user-1', is_anonymous: false, app_metadata: {} }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/goals', () => {
  it('returns 401 when getAuthUser returns null', async () => {
    mockGetAuthUser.mockResolvedValue(null)

    const req = new Request('http://localhost/api/goals?year=2026')
    const res = await GET(req)

    expect(res.status).toBe(401)
  })

  it('returns null JSON (200) when no goal exists', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.readingGoal.findFirst.mockResolvedValue(null)

    const req = new Request('http://localhost/api/goals?year=2026')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toBeNull()
  })

  it('returns goal object when goal exists', async () => {
    const mockGoal = { id: 'goal-1', profileId: 'user-1', year: 2026, targetCount: 12 }
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.readingGoal.findFirst.mockResolvedValue(mockGoal as any)

    const req = new Request('http://localhost/api/goals?year=2026')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(mockGoal)
  })
})

describe('POST /api/goals', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null)

    const req = new Request('http://localhost/api/goals', {
      method: 'POST',
      body: JSON.stringify({ year: 2026, targetCount: 24 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(401)
  })

  it('returns 400 when year is missing', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)

    const req = new Request('http://localhost/api/goals', {
      method: 'POST',
      body: JSON.stringify({ targetCount: 24 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns 400 when year < 2000', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)

    const req = new Request('http://localhost/api/goals', {
      method: 'POST',
      body: JSON.stringify({ year: 1999, targetCount: 24 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns 400 when year > 2100', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)

    const req = new Request('http://localhost/api/goals', {
      method: 'POST',
      body: JSON.stringify({ year: 2101, targetCount: 24 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns 400 when targetCount is 0 (below min of 1)', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)

    const req = new Request('http://localhost/api/goals', {
      method: 'POST',
      body: JSON.stringify({ year: 2026, targetCount: 0 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns 400 when targetCount is 10000 (above max of 9999)', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)

    const req = new Request('http://localhost/api/goals', {
      method: 'POST',
      body: JSON.stringify({ year: 2026, targetCount: 10000 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns 400 when targetCount is missing', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)

    const req = new Request('http://localhost/api/goals', {
      method: 'POST',
      body: JSON.stringify({ year: 2026 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('upserts goal and returns it on success (200)', async () => {
    const mockGoal = { id: 'goal-1', profileId: 'user-1', year: 2026, targetCount: 24 }
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.readingGoal.upsert.mockResolvedValue(mockGoal as any)

    const req = new Request('http://localhost/api/goals', {
      method: 'POST',
      body: JSON.stringify({ year: 2026, targetCount: 24 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(mockGoal)
  })

  it('upsert uses profileId_year compound key', async () => {
    const mockGoal = { id: 'goal-1', profileId: 'user-1', year: 2026, targetCount: 24 }
    mockGetAuthUser.mockResolvedValue(MOCK_USER as any)
    mockPrisma.readingGoal.upsert.mockResolvedValue(mockGoal as any)

    const req = new Request('http://localhost/api/goals', {
      method: 'POST',
      body: JSON.stringify({ year: 2026, targetCount: 24 }),
      headers: { 'Content-Type': 'application/json' },
    })
    await POST(req)

    expect(mockPrisma.readingGoal.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { profileId_year: { profileId: 'user-1', year: 2026 } },
      })
    )
  })
})
