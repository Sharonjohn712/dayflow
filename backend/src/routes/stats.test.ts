import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma, resetPrismaMock } from '../test/prisma-mock.js'
import { appFor, TEST_USER } from '../test/app.js'

vi.mock('../lib/prisma.js', () => import('../test/prisma-mock.js'))
const { statsRouter } = await import('./stats.js')
const app = appFor('/api/stats', statsRouter)

const NOW = new Date('2026-03-10T12:00:00Z')

beforeEach(() => {
  resetPrismaMock()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})
afterEach(() => vi.useRealTimers())

function event(endpoint: string, totalMs: number, opts: Partial<{ ttftMs: number | null; costUsd: number; day: string }> = {}) {
  return {
    endpoint,
    totalMs,
    ttftMs: opts.ttftMs ?? null,
    costUsd: opts.costUsd ?? 0.001,
    inputTokens: 100,
    outputTokens: 50,
    createdAt: new Date(`${opts.day ?? '2026-03-10'}T08:00:00Z`),
  }
}

describe('GET /api/stats/llm', () => {
  it('returns zeros when there are no events', async () => {
    prisma.llmEvent.findMany.mockResolvedValue([])
    const body = await (await app.request('/api/stats/llm')).json()
    expect(body).toMatchObject({
      days: 30,
      totalCalls: 0,
      totalCostUsd: 0,
      avgCostUsd: 0,
      endpoints: [],
      daily: [],
    })
  })

  it("queries only the user's successful calls within the window", async () => {
    prisma.llmEvent.findMany.mockResolvedValue([])
    await app.request('/api/stats/llm?days=7')
    const { where } = prisma.llmEvent.findMany.mock.calls[0][0]
    expect(where.userId).toBe(TEST_USER)
    expect(where.error).toBeNull()
    expect(where.createdAt.gte).toEqual(new Date(NOW.getTime() - 7 * 86_400_000))
  })

  it.each([
    ['0', 1],
    ['500', 90],
    ['abc', 30],
  ])('clamps days=%s to %i', async (q, expected) => {
    prisma.llmEvent.findMany.mockResolvedValue([])
    const res = await app.request(`/api/stats/llm?days=${q}`)
    expect(res.status).toBe(200)
    expect((await res.json()).days).toBe(expected)
  })

  it('computes per-endpoint latency percentiles', async () => {
    const reviewMs = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
    prisma.llmEvent.findMany.mockResolvedValue([
      ...reviewMs.map((ms) => event('review', ms, { ttftMs: ms / 10 })),
      event('suggestions', 250),
    ])
    const body = await (await app.request('/api/stats/llm')).json()

    const review = body.endpoints.find((e: { endpoint: string }) => e.endpoint === 'review')
    expect(review.calls).toBe(10)
    expect(review.total_ms).toEqual({ p50: 600, p95: 1000, p99: 1000 })
    expect(review.ttft_ms).toEqual({ p50: 60, p95: 100, p99: 100 })

    const suggestions = body.endpoints.find((e: { endpoint: string }) => e.endpoint === 'suggestions')
    expect(suggestions.total_ms).toEqual({ p50: 250, p95: 250, p99: 250 })
    expect(suggestions.ttft_ms).toBeNull()
  })

  it('totals cost and tokens and groups by day in date order', async () => {
    prisma.llmEvent.findMany.mockResolvedValue([
      event('review', 100, { costUsd: 0.002, day: '2026-03-10' }),
      event('review', 100, { costUsd: 0.001, day: '2026-03-08' }),
      event('suggestions', 100, { costUsd: 0.0005, day: '2026-03-10' }),
    ])
    const body = await (await app.request('/api/stats/llm')).json()

    expect(body.totalCalls).toBe(3)
    expect(body.totalCostUsd).toBeCloseTo(0.0035)
    expect(body.avgCostUsd).toBeCloseTo(0.001167, 6)
    expect(body.totalInputTokens).toBe(300)
    expect(body.totalOutputTokens).toBe(150)
    expect(body.daily.map((d: { date: string; calls: number }) => [d.date, d.calls])).toEqual([
      ['2026-03-08', 1],
      ['2026-03-10', 2],
    ])
  })
})
