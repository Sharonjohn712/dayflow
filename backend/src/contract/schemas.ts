// The API contract: the response bodies the frontend relies on
// (frontend/src/types and frontend/src/lib/api.ts), as Zod schemas.
// Checked in two places:
//   - src/contract/provider.test.ts: every route, in-process, on every PR
//   - contract/live.test.ts: the deployed production API, after each deploy
import { z } from 'zod'

const isoDate = z.string().datetime({ offset: true })
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const ErrorBody = z.object({
  error: z.string().min(1),
  details: z.unknown().optional(),
})

export const Ok = z.object({ ok: z.literal(true) })

export const Health = z.object({
  ok: z.literal(true),
  ts: isoDate,
  commit: z.string().nullable().optional(), // deployed git SHA (Render), null locally
})

export const Category = z.enum(['WORK', 'HEALTH', 'PERSONAL', 'OTHER'])

export const Task = z.object({
  id: z.string(),
  userId: z.string(),
  text: z.string(),
  category: Category,
  dueTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  done: z.boolean(),
  createdAt: isoDate,
  updatedAt: isoDate,
})

export const Goal = z.object({
  id: z.string(),
  userId: z.string(),
  text: z.string(),
  progress: z.number().int().min(0).max(100),
  createdAt: isoDate,
  updatedAt: isoDate,
})

export const Habit = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: isoDate,
  checks: z.array(day),
})

export const JournalEntry = z.object({
  id: z.string(),
  userId: z.string(),
  text: z.string(),
  mood: z.string().nullable(),
  createdAt: isoDate,
})

export const Suggestions = z.object({ suggestions: z.array(z.string()) })

const Percentiles = z.object({ p50: z.number(), p95: z.number(), p99: z.number() })

export const LlmStats = z.object({
  days: z.number().int().min(1).max(90),
  totalCalls: z.number().int(),
  totalCostUsd: z.number(),
  avgCostUsd: z.number(),
  totalInputTokens: z.number().int(),
  totalOutputTokens: z.number().int(),
  endpoints: z.array(z.object({
    endpoint: z.string(),
    calls: z.number().int(),
    total_ms: Percentiles,
    ttft_ms: Percentiles.nullable(),
  })),
  daily: z.array(z.object({
    date: day,
    calls: z.number().int(),
    costUsd: z.number(),
    inputTokens: z.number().int(),
    outputTokens: z.number().int(),
  })),
})

// Every authenticated endpoint the frontend calls. Used by the live contract
// tests to prove each one rejects unauthenticated requests the same way.
export const PROTECTED_ROUTES: [method: string, path: string][] = [
  ['GET', '/api/tasks'],
  ['POST', '/api/tasks'],
  ['PATCH', '/api/tasks/contract-test'],
  ['DELETE', '/api/tasks/contract-test'],
  ['DELETE', '/api/tasks/done/all'],
  ['GET', '/api/goals'],
  ['POST', '/api/goals'],
  ['PATCH', '/api/goals/contract-test'],
  ['DELETE', '/api/goals/contract-test'],
  ['GET', '/api/habits'],
  ['POST', '/api/habits'],
  ['POST', '/api/habits/contract-test/check'],
  ['DELETE', '/api/habits/contract-test'],
  ['GET', '/api/journal'],
  ['POST', '/api/journal'],
  ['DELETE', '/api/journal/contract-test'],
  ['GET', '/api/ai/suggestions'],
  ['POST', '/api/ai/review'],
  ['GET', '/api/stats/llm'],
]
