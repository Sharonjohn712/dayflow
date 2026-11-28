import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { aiApi, goalsApi, habitsApi, journalApi, setTokenGetter, tasksApi } from './api'

const BASE = 'http://localhost:3001'
const fetchMock = vi.fn()

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(reply(200, { ok: true }))
  vi.stubGlobal('fetch', fetchMock)
  setTokenGetter(async () => 'tok_123')
})
afterEach(() => vi.unstubAllGlobals())

const lastCall = () => {
  const [url, init] = fetchMock.mock.lastCall!
  return { url, method: init.method ?? 'GET', headers: init.headers, body: init.body && JSON.parse(init.body) }
}

describe('request auth', () => {
  it('sends the Clerk token as a Bearer header', async () => {
    await tasksApi.list()
    expect(lastCall().headers).toMatchObject({
      Authorization: 'Bearer tok_123',
      'Content-Type': 'application/json',
    })
  })

  it('omits Authorization when signed out', async () => {
    setTokenGetter(async () => null)
    await tasksApi.list()
    expect(lastCall().headers).not.toHaveProperty('Authorization')
  })
})

describe('request errors', () => {
  it("throws the server's error message", async () => {
    fetchMock.mockResolvedValue(reply(404, { error: 'Not found' }))
    await expect(tasksApi.delete('t1')).rejects.toThrow('Not found')
  })

  it('falls back to the HTTP status when the body has no error', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }))
    await expect(goalsApi.list()).rejects.toThrow('HTTP 502')
  })

  it('returns parsed JSON on success', async () => {
    fetchMock.mockResolvedValue(reply(200, [{ id: 'g1' }]))
    await expect(goalsApi.list()).resolves.toEqual([{ id: 'g1' }])
  })
})

describe('endpoints', () => {
  it.each([
    ['tasks.create', () => tasksApi.create({ text: 'Run', category: 'HEALTH' }), 'POST', '/api/tasks', { text: 'Run', category: 'HEALTH' }],
    ['tasks.update', () => tasksApi.update('t1', { done: true }), 'PATCH', '/api/tasks/t1', { done: true }],
    ['tasks.delete', () => tasksApi.delete('t1'), 'DELETE', '/api/tasks/t1', undefined],
    ['tasks.clearDone', () => tasksApi.clearDone(), 'DELETE', '/api/tasks/done/all', undefined],
    ['goals.create', () => goalsApi.create('Read 12 books'), 'POST', '/api/goals', { text: 'Read 12 books' }],
    ['goals.update', () => goalsApi.update('g1', { progress: 50 }), 'PATCH', '/api/goals/g1', { progress: 50 }],
    ['habits.create', () => habitsApi.create('Water'), 'POST', '/api/habits', { name: 'Water' }],
    ['habits.check', () => habitsApi.check('h1', '2026-03-10', true), 'POST', '/api/habits/h1/check', { date: '2026-03-10', checked: true }],
    ['habits.delete', () => habitsApi.delete('h1'), 'DELETE', '/api/habits/h1', undefined],
    ['journal.create', () => journalApi.create('Good day', '😊'), 'POST', '/api/journal', { text: 'Good day', mood: '😊' }],
    ['journal.delete', () => journalApi.delete('j1'), 'DELETE', '/api/journal/j1', undefined],
    ['ai.suggestions', () => aiApi.suggestions(), 'GET', '/api/ai/suggestions', undefined],
  ])('%s → %s %s', async (_name, call, method, path, body) => {
    await call()
    const c = lastCall()
    expect(c.url).toBe(`${BASE}${path}`)
    expect(c.method).toBe(method)
    expect(c.body).toEqual(body)
  })

  it('aiApi.reviewStream posts the user name and returns the raw Response', async () => {
    const res = await aiApi.reviewStream('Sam')
    expect(res).toBeInstanceOf(Response)
    expect(lastCall()).toMatchObject({ url: `${BASE}/api/ai/review`, method: 'POST', body: { userName: 'Sam' } })
  })

  it('aiApi.reviewStream sends null when there is no name', async () => {
    await aiApi.reviewStream()
    expect(lastCall().body).toEqual({ userName: null })
  })
})
