import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma, resetPrismaMock } from '../test/prisma-mock.js'
import { appFor, json, TEST_USER } from '../test/app.js'

const create = vi.fn()
vi.mock('groq-sdk', () => ({
  default: class {
    chat = { completions: { create } }
  },
}))
vi.mock('../lib/prisma.js', () => import('../test/prisma-mock.js'))
const { aiRouter } = await import('./ai.js')
const app = appFor('/api/ai', aiRouter)

// recordLlmEvent runs after the response is sent; let it settle before asserting.
const flush = () => new Promise((r) => setTimeout(r, 0))
const loggedEvent = () => prisma.llmEvent.create.mock.calls[0][0].data

beforeEach(() => {
  resetPrismaMock()
  create.mockReset()
  prisma.llmEvent.create.mockResolvedValue({})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('GET /api/ai/suggestions', () => {
  beforeEach(() => {
    prisma.task.findMany.mockResolvedValue([{ text: 'Ship doc' }, { text: 'Run' }])
  })

  it('returns parsed suggestions and includes recent tasks in the prompt', async () => {
    create.mockResolvedValue({
      choices: [{ message: { content: '["Walk","Read"]' } }],
      usage: { prompt_tokens: 120, completion_tokens: 30 },
    })

    const res = await app.request('/api/ai/suggestions')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ suggestions: ['Walk', 'Read'] })

    expect(prisma.task.findMany.mock.calls[0][0].where).toEqual({ userId: TEST_USER })
    const prompt = create.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('Existing tasks: Ship doc, Run')
  })

  it('logs tokens and cost for the call', async () => {
    create.mockResolvedValue({
      choices: [{ message: { content: '[]' } }],
      usage: { prompt_tokens: 120, completion_tokens: 30 },
    })
    await app.request('/api/ai/suggestions')
    await flush()
    expect(loggedEvent()).toMatchObject({
      userId: TEST_USER,
      endpoint: 'suggestions',
      inputTokens: 120,
      outputTokens: 30,
      ttftMs: null,
      error: null,
    })
  })

  it('returns an empty list when the model reply is not a JSON array', async () => {
    create.mockResolvedValue({ choices: [{ message: { content: 'Sure! Try walking.' } }] })
    const res = await app.request('/api/ai/suggestions')
    expect(await res.json()).toEqual({ suggestions: [] })
  })

  it('handles a reply with no choices or usage', async () => {
    prisma.task.findMany.mockResolvedValue([])
    create.mockResolvedValue({ choices: [] })
    const res = await app.request('/api/ai/suggestions')
    expect(await res.json()).toEqual({ suggestions: [] })
    expect(create.mock.calls[0][0].messages[0].content).toContain('Existing tasks: none')
  })

  it('returns 500 and logs the error when Groq fails', async () => {
    create.mockRejectedValue(new Error('503 Service Unavailable'))
    const res = await app.request('/api/ai/suggestions')
    expect(res.status).toBe(500)
    await flush()
    expect(loggedEvent().error).toBe('503 Service Unavailable')
  })

  it('still responds when recording the metric fails', async () => {
    create.mockResolvedValue({ choices: [{ message: { content: '["Walk"]' } }] })
    prisma.llmEvent.create.mockRejectedValue(new Error('db down'))
    const res = await app.request('/api/ai/suggestions')
    expect(res.status).toBe(200)
    await flush()
    expect(console.error).toHaveBeenCalledWith('[metrics] failed to record:', expect.any(Error))
  })
})

describe('POST /api/ai/review', () => {
  async function* chunks(parts: object[]) {
    for (const p of parts) yield p
  }
  const delta = (content: string) => ({ choices: [{ delta: { content } }] })

  beforeEach(() => {
    prisma.task.findMany.mockResolvedValue([
      { text: 'Ship doc', category: 'WORK', done: true },
      { text: 'Call mom', category: 'PERSONAL', done: false },
    ])
    prisma.goal.findMany.mockResolvedValue([{ text: 'Half-marathon', progress: 60 }])
    prisma.habit.findMany.mockResolvedValue([
      { name: 'Meditate', checks: [{ date: '2026-03-10' }] },
      { name: 'Water', checks: [] },
    ])
    prisma.journalEntry.findMany.mockResolvedValue([{ text: 'Felt focused.' }])
  })

  it('streams the review text and builds the prompt from the user’s day', async () => {
    create.mockResolvedValue(chunks([
      delta('Great day, Sam. '),
      delta('SCORE: 82'),
      { choices: [], usage: { prompt_tokens: 400, completion_tokens: 90 } },
    ]))

    const res = await app.request('/api/ai/review', json('POST', { userName: 'Sam' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/plain')
    expect(await res.text()).toBe('Great day, Sam. SCORE: 82')

    const req = create.mock.calls[0][0]
    expect(req.stream).toBe(true)
    const prompt = req.messages[0].content
    expect(prompt).toContain('Tasks: 1/2 done (50%)')
    expect(prompt).toContain('Habits: Meditate: done; Water: not done')
    expect(prompt).toContain('Latest journal: Felt focused.')
    expect(prompt).toContain('Their name is Sam.')
  })

  it('logs usage from the trailing chunk and a time-to-first-token', async () => {
    create.mockResolvedValue(chunks([
      delta('Hi'),
      { choices: [], x_groq: { usage: { prompt_tokens: 400, completion_tokens: 90 } } },
    ]))
    const res = await app.request('/api/ai/review', json('POST', {}))
    await res.text()
    await flush()
    expect(loggedEvent()).toMatchObject({
      endpoint: 'review',
      inputTokens: 400,
      outputTokens: 90,
      error: null,
    })
    expect(loggedEvent().ttftMs).toEqual(expect.any(Number))
  })

  it('handles an empty day with no journal entry', async () => {
    prisma.task.findMany.mockResolvedValue([])
    prisma.goal.findMany.mockResolvedValue([])
    prisma.habit.findMany.mockResolvedValue([])
    prisma.journalEntry.findMany.mockResolvedValue([])
    create.mockResolvedValue(chunks([{ choices: [{}] }]))

    const res = await app.request('/api/ai/review', json('POST', { userName: null }))
    expect(await res.text()).toBe('')
    expect(create.mock.calls[0][0].messages[0].content).toContain('Latest journal: no entry')
    await flush()
    expect(loggedEvent().ttftMs).toBeNull()
  })

  it('aborts the stream and logs the error when Groq fails mid-response', async () => {
    async function* failing() {
      yield delta('Partial ')
      throw new Error('connection reset')
    }
    create.mockResolvedValue(failing())

    const res = await app.request('/api/ai/review', json('POST', {}))
    await expect(res.text()).rejects.toThrow('connection reset')
    await flush()
    expect(loggedEvent().error).toBe('connection reset')
  })

  it('rejects a userName over 100 characters', async () => {
    const res = await app.request('/api/ai/review', json('POST', { userName: 'a'.repeat(101) }))
    expect(res.status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })
})
