import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'

export const statsRouter = new Hono()

function pct(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[idx]
}

// GET /api/stats/llm?days=30
// Aggregated LLM observability. Scoped to the authenticated user.
// To expose globally for an admin/portfolio dashboard, drop the userId filter
// behind an admin role check.
statsRouter.get('/llm', async (c) => {
  const userId = c.get('userId')
  const days = Math.min(Math.max(Number(c.req.query('days') ?? 30), 1), 90)
  const since = new Date(Date.now() - days * 86_400_000)

  const events = await prisma.llmEvent.findMany({
    where: { userId, createdAt: { gte: since }, error: null },
    select: {
      totalMs: true,
      ttftMs: true,
      costUsd: true,
      endpoint: true,
      inputTokens: true,
      outputTokens: true,
      createdAt: true,
    },
  })

  const totalMsByEndpoint: Record<string, number[]> = {}
  const ttftMsByEndpoint: Record<string, number[]> = {}
  for (const e of events) {
    ;(totalMsByEndpoint[e.endpoint] ??= []).push(e.totalMs)
    if (e.ttftMs != null) (ttftMsByEndpoint[e.endpoint] ??= []).push(e.ttftMs)
  }

  const endpoints = Object.entries(totalMsByEndpoint).map(([endpoint, ms]) => ({
    endpoint,
    calls: ms.length,
    total_ms: { p50: pct(ms, 50), p95: pct(ms, 95), p99: pct(ms, 99) },
    ttft_ms: ttftMsByEndpoint[endpoint]
      ? {
          p50: pct(ttftMsByEndpoint[endpoint], 50),
          p95: pct(ttftMsByEndpoint[endpoint], 95),
          p99: pct(ttftMsByEndpoint[endpoint], 99),
        }
      : null,
  }))

  const totalCost = events.reduce((s, e) => s + e.costUsd, 0)
  const totalInput = events.reduce((s, e) => s + e.inputTokens, 0)
  const totalOutput = events.reduce((s, e) => s + e.outputTokens, 0)

  const byDay: Record<string, { calls: number; costUsd: number; inputTokens: number; outputTokens: number }> = {}
  for (const e of events) {
    const day = e.createdAt.toISOString().slice(0, 10)
    byDay[day] ??= { calls: 0, costUsd: 0, inputTokens: 0, outputTokens: 0 }
    byDay[day].calls++
    byDay[day].costUsd += e.costUsd
    byDay[day].inputTokens += e.inputTokens
    byDay[day].outputTokens += e.outputTokens
  }

  return c.json({
    days,
    totalCalls: events.length,
    totalCostUsd: Number(totalCost.toFixed(6)),
    avgCostUsd: events.length ? Number((totalCost / events.length).toFixed(6)) : 0,
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    endpoints,
    daily: Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v, costUsd: Number(v.costUsd.toFixed(6)) })),
  })
})
