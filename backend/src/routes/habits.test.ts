import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma, resetPrismaMock } from '../test/prisma-mock.js'
import { appFor, json, TEST_USER } from '../test/app.js'

vi.mock('../lib/prisma.js', () => import('../test/prisma-mock.js'))
const { habitsRouter } = await import('./habits.js')
const app = appFor('/api/habits', habitsRouter)

beforeEach(resetPrismaMock)

describe('GET /api/habits', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('loads the last 7 days of checks and flattens them to date strings', async () => {
    const createdAt = new Date('2026-01-01T00:00:00Z')
    prisma.habit.findMany.mockResolvedValue([
      { id: 'h1', name: 'Meditate', createdAt, userId: TEST_USER, checks: [{ date: '2026-03-09' }, { date: '2026-03-10' }] },
    ])

    const res = await app.request('/api/habits')
    expect(await res.json()).toEqual([
      { id: 'h1', name: 'Meditate', createdAt: createdAt.toISOString(), checks: ['2026-03-09', '2026-03-10'] },
    ])

    const query = prisma.habit.findMany.mock.calls[0][0]
    expect(query.where).toEqual({ userId: TEST_USER })
    expect(query.include.checks.where).toEqual({ date: { gte: '2026-03-04' } })
  })
})

describe('POST /api/habits', () => {
  it('creates a habit with an empty checks list', async () => {
    prisma.habit.create.mockResolvedValue({ id: 'h1', name: 'Water' })
    const res = await app.request('/api/habits', json('POST', { name: 'Water' }))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ id: 'h1', name: 'Water', checks: [] })
  })

  it('rejects an empty name', async () => {
    expect((await app.request('/api/habits', json('POST', { name: '' }))).status).toBe(400)
  })
})

describe('POST /api/habits/:id/check', () => {
  it('checking a day upserts one HabitCheck', async () => {
    prisma.habit.findFirst.mockResolvedValue({ id: 'h1' })
    const res = await app.request('/api/habits/h1/check', json('POST', { date: '2026-03-10', checked: true }))
    expect(res.status).toBe(200)
    expect(prisma.habitCheck.upsert).toHaveBeenCalledWith({
      where: { habitId_date: { habitId: 'h1', date: '2026-03-10' } },
      create: { habitId: 'h1', date: '2026-03-10' },
      update: {},
    })
    expect(prisma.habitCheck.deleteMany).not.toHaveBeenCalled()
  })

  it('unchecking a day deletes that HabitCheck', async () => {
    prisma.habit.findFirst.mockResolvedValue({ id: 'h1' })
    await app.request('/api/habits/h1/check', json('POST', { date: '2026-03-10', checked: false }))
    expect(prisma.habitCheck.deleteMany).toHaveBeenCalledWith({ where: { habitId: 'h1', date: '2026-03-10' } })
    expect(prisma.habitCheck.upsert).not.toHaveBeenCalled()
  })

  it("returns 404 for another user's habit", async () => {
    prisma.habit.findFirst.mockResolvedValue(null)
    const res = await app.request('/api/habits/h1/check', json('POST', { date: '2026-03-10', checked: true }))
    expect(res.status).toBe(404)
    expect(prisma.habit.findFirst).toHaveBeenCalledWith({ where: { id: 'h1', userId: TEST_USER } })
    expect(prisma.habitCheck.upsert).not.toHaveBeenCalled()
  })

  it.each([
    ['a non-ISO date', { date: '10/03/2026', checked: true }],
    ['a missing checked flag', { date: '2026-03-10' }],
  ])('rejects %s with 400', async (_label, body) => {
    expect((await app.request('/api/habits/h1/check', json('POST', body))).status).toBe(400)
  })
})

describe('DELETE /api/habits/:id', () => {
  it('deletes an owned habit, 404 otherwise', async () => {
    prisma.habit.findFirst.mockResolvedValueOnce({ id: 'h1' }).mockResolvedValueOnce(null)
    expect((await app.request('/api/habits/h1', { method: 'DELETE' })).status).toBe(200)
    expect((await app.request('/api/habits/h2', { method: 'DELETE' })).status).toBe(404)
    expect(prisma.habit.delete).toHaveBeenCalledTimes(1)
  })
})
