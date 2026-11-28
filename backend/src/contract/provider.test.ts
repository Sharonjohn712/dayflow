// Provider-side contract tests: every route's success and error responses
// must match the schemas in ./schemas.ts, which mirror what the frontend reads.
// Runs in-process with Prisma and Groq replaced, on every PR.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import type { ZodTypeAny } from 'zod'
import { z } from 'zod'
import { prisma, resetPrismaMock } from '../test/prisma-mock.js'
import { json, TEST_USER } from '../test/app.js'
import * as C from './schemas.js'

const create = vi.fn()
vi.mock('groq-sdk', () => ({ default: class { chat = { completions: { create } } } }))
vi.mock('../lib/prisma.js', () => import('../test/prisma-mock.js'))

const { errorHandler } = await import('../middleware/error.js')
const routers = {
  tasks: (await import('../routes/tasks.js')).tasksRouter,
  goals: (await import('../routes/goals.js')).goalsRouter,
  habits: (await import('../routes/habits.js')).habitsRouter,
  journal: (await import('../routes/journal.js')).journalRouter,
  ai: (await import('../routes/ai.js')).aiRouter,
  stats: (await import('../routes/stats.js')).statsRouter,
}
const app = new Hono()
app.use('*', async (c, next) => { c.set('userId', TEST_USER); await next() })
for (const [name, r] of Object.entries(routers)) app.route(`/api/${name}`, r)
app.onError(errorHandler)

// Rows as Prisma returns them (Date objects), so serialisation is part of the check.
const at = new Date('2026-03-10T08:00:00Z')
const row = {
  task: { id: 't1', userId: TEST_USER, text: 'Run', category: 'HEALTH', dueTime: '07:30', done: false, createdAt: at, updatedAt: at },
  goal: { id: 'g1', userId: TEST_USER, text: 'Half-marathon', progress: 60, createdAt: at, updatedAt: at },
  habit: { id: 'h1', userId: TEST_USER, name: 'Meditate', createdAt: at },
  entry: { id: 'j1', userId: TEST_USER, text: 'Good day', mood: '😊', createdAt: at },
}

async function expectBody(res: Response, status: number, schema: ZodTypeAny) {
  expect(res.status).toBe(status)
  expect(res.headers.get('Content-Type')).toContain('application/json')
  const body = await res.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new Error(`Contract mismatch: ${parsed.error.message}\nBody: ${JSON.stringify(body)}`)
  return body
}

beforeEach(() => {
  resetPrismaMock()
  create.mockReset()
  prisma.llmEvent.create.mockResolvedValue({})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('success responses match the contract', () => {
  it.each([
    ['GET /api/tasks', () => { prisma.task.findMany.mockResolvedValue([row.task]) }, 'GET', '/api/tasks', undefined, 200, z.array(C.Task)],
    ['POST /api/tasks', () => { prisma.task.create.mockResolvedValue(row.task) }, 'POST', '/api/tasks', { text: 'Run', category: 'HEALTH' }, 201, C.Task],
    ['PATCH /api/tasks/:id', () => { prisma.task.findFirst.mockResolvedValue(row.task); prisma.task.update.mockResolvedValue({ ...row.task, done: true }) }, 'PATCH', '/api/tasks/t1', { done: true }, 200, C.Task],
    ['DELETE /api/tasks/:id', () => { prisma.task.findFirst.mockResolvedValue(row.task) }, 'DELETE', '/api/tasks/t1', undefined, 200, C.Ok],
    ['DELETE /api/tasks/done/all', () => {}, 'DELETE', '/api/tasks/done/all', undefined, 200, C.Ok],
    ['GET /api/goals', () => { prisma.goal.findMany.mockResolvedValue([row.goal]) }, 'GET', '/api/goals', undefined, 200, z.array(C.Goal)],
    ['POST /api/goals', () => { prisma.goal.create.mockResolvedValue({ ...row.goal, progress: 0 }) }, 'POST', '/api/goals', { text: 'Read' }, 201, C.Goal],
    ['PATCH /api/goals/:id', () => { prisma.goal.findFirst.mockResolvedValue(row.goal); prisma.goal.update.mockResolvedValue(row.goal) }, 'PATCH', '/api/goals/g1', { progress: 60 }, 200, C.Goal],
    ['DELETE /api/goals/:id', () => { prisma.goal.findFirst.mockResolvedValue(row.goal) }, 'DELETE', '/api/goals/g1', undefined, 200, C.Ok],
    ['GET /api/habits', () => { prisma.habit.findMany.mockResolvedValue([{ ...row.habit, checks: [{ date: '2026-03-10' }] }]) }, 'GET', '/api/habits', undefined, 200, z.array(C.Habit)],
    ['POST /api/habits', () => { prisma.habit.create.mockResolvedValue(row.habit) }, 'POST', '/api/habits', { name: 'Meditate' }, 201, C.Habit],
    ['POST /api/habits/:id/check', () => { prisma.habit.findFirst.mockResolvedValue(row.habit) }, 'POST', '/api/habits/h1/check', { date: '2026-03-10', checked: true }, 200, C.Ok],
    ['DELETE /api/habits/:id', () => { prisma.habit.findFirst.mockResolvedValue(row.habit) }, 'DELETE', '/api/habits/h1', undefined, 200, C.Ok],
    ['GET /api/journal', () => { prisma.journalEntry.findMany.mockResolvedValue([row.entry, { ...row.entry, id: 'j2', mood: null }]) }, 'GET', '/api/journal', undefined, 200, z.array(C.JournalEntry)],
    ['POST /api/journal', () => { prisma.journalEntry.create.mockResolvedValue(row.entry) }, 'POST', '/api/journal', { text: 'Good day', mood: '😊' }, 201, C.JournalEntry],
    ['DELETE /api/journal/:id', () => { prisma.journalEntry.findFirst.mockResolvedValue(row.entry) }, 'DELETE', '/api/journal/j1', undefined, 200, C.Ok],
    ['GET /api/ai/suggestions', () => { prisma.task.findMany.mockResolvedValue([]); create.mockResolvedValue({ choices: [{ message: { content: '["Walk"]' } }] }) }, 'GET', '/api/ai/suggestions', undefined, 200, C.Suggestions],
    ['GET /api/stats/llm', () => { prisma.llmEvent.findMany.mockResolvedValue([{ endpoint: 'review', totalMs: 900, ttftMs: 120, costUsd: 0.001, inputTokens: 400, outputTokens: 90, createdAt: at }]) }, 'GET', '/api/stats/llm', undefined, 200, C.LlmStats],
  ] as const)('%s', async (_name, arrange, method, path, body, status, schema) => {
    arrange()
    const res = await app.request(path, body === undefined ? { method } : json(method, body))
    await expectBody(res, status, schema)
  })

  it('POST /api/ai/review streams plain text (not JSON)', async () => {
    for (const m of ['task', 'goal', 'habit', 'journalEntry'] as const) prisma[m].findMany.mockResolvedValue([])
    create.mockResolvedValue((async function* () { yield { choices: [{ delta: { content: 'Nice day.\nSCORE: 70' } }] } })())
    const res = await app.request('/api/ai/review', json('POST', {}))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/plain')
    expect(await res.text()).toMatch(/SCORE:\s*\d+$/)
  })
})

describe('error responses match the contract: { error: string }', () => {
  it.each([
    ['POST /api/tasks', '/api/tasks', { text: '' }],
    ['PATCH /api/tasks/:id', '/api/tasks/t1', { done: 'yes' }],
    ['POST /api/goals', '/api/goals', { text: '' }],
    ['PATCH /api/goals/:id', '/api/goals/g1', { progress: 101 }],
    ['POST /api/habits', '/api/habits', { name: '' }],
    ['POST /api/habits/:id/check', '/api/habits/h1/check', { date: 'yesterday', checked: true }],
    ['POST /api/journal', '/api/journal', { text: '' }],
    ['POST /api/ai/review', '/api/ai/review', { userName: 'a'.repeat(101) }],
  ])('400 from %s is a readable error, not a raw ZodError', async (_name, path, body) => {
    const method = path.match(/\/(t1|g1)$/) ? 'PATCH' : 'POST'
    const parsed = await expectBody(await app.request(path, json(method, body)), 400, C.ErrorBody)
    expect(parsed.error).toBe('Validation error')
    expect(parsed.details).toBeTypeOf('object')
  })

  it.each([
    ['PATCH', '/api/tasks/nope', { done: true }, 'task'],
    ['DELETE', '/api/tasks/nope', undefined, 'task'],
    ['PATCH', '/api/goals/nope', { progress: 5 }, 'goal'],
    ['DELETE', '/api/goals/nope', undefined, 'goal'],
    ['POST', '/api/habits/nope/check', { date: '2026-03-10', checked: true }, 'habit'],
    ['DELETE', '/api/habits/nope', undefined, 'habit'],
    ['DELETE', '/api/journal/nope', undefined, 'journalEntry'],
  ] as const)('404 from %s %s', async (method, path, body, model) => {
    prisma[model].findFirst.mockResolvedValue(null)
    const res = await app.request(path, body === undefined ? { method } : json(method, body))
    const parsed = await expectBody(res, 404, C.ErrorBody)
    expect(parsed.error).toBe('Not found')
  })

  it('500 from an unexpected failure', async () => {
    prisma.task.findMany.mockRejectedValue(new Error('db down'))
    await expectBody(await app.request('/api/tasks'), 500, C.ErrorBody)
  })
})

describe('contract schemas', () => {
  it('reject a body the frontend could not use', () => {
    expect(C.Task.safeParse({ ...row.task, createdAt: at.toISOString(), category: 'FUN', updatedAt: at.toISOString() }).success).toBe(false)
    expect(C.ErrorBody.safeParse({ success: false, error: { issues: [] } }).success).toBe(false)
    expect(C.Health.safeParse({ ok: true, ts: 'yesterday' }).success).toBe(false)
  })

  it('list every protected route once', () => {
    const keys = C.PROTECTED_ROUTES.map(([m, p]) => `${m} ${p}`)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys.length).toBe(19)
  })
})
