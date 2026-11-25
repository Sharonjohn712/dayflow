import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma, resetPrismaMock } from '../test/prisma-mock.js'
import { appFor, json, TEST_USER } from '../test/app.js'

vi.mock('../lib/prisma.js', () => import('../test/prisma-mock.js'))
const { journalRouter } = await import('./journal.js')
const app = appFor('/api/journal', journalRouter)

beforeEach(resetPrismaMock)

describe('journal routes', () => {
  it('GET returns the newest 100 entries for the user', async () => {
    prisma.journalEntry.findMany.mockResolvedValue([])
    await app.request('/api/journal')
    expect(prisma.journalEntry.findMany).toHaveBeenCalledWith({
      where: { userId: TEST_USER },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  })

  it('POST stores text and mood', async () => {
    prisma.journalEntry.create.mockResolvedValue({ id: 'j1' })
    const res = await app.request('/api/journal', json('POST', { text: 'Good day', mood: '😊' }))
    expect(res.status).toBe(201)
    expect(prisma.journalEntry.create).toHaveBeenCalledWith({
      data: { userId: TEST_USER, text: 'Good day', mood: '😊' },
    })
  })

  it('POST stores a missing mood as null', async () => {
    prisma.journalEntry.create.mockResolvedValue({ id: 'j1' })
    await app.request('/api/journal', json('POST', { text: 'No mood today' }))
    expect(prisma.journalEntry.create.mock.calls[0][0].data.mood).toBeNull()
  })

  it.each([
    ['empty text', { text: '' }],
    ['text over 10,000 chars', { text: 'a'.repeat(10_001) }],
    ['a mood over 10 chars', { text: 'x', mood: 'very very happy' }],
  ])('POST rejects %s with 400', async (_label, body) => {
    expect((await app.request('/api/journal', json('POST', body))).status).toBe(400)
    expect(prisma.journalEntry.create).not.toHaveBeenCalled()
  })

  it('DELETE removes an owned entry, 404 otherwise', async () => {
    prisma.journalEntry.findFirst.mockResolvedValueOnce({ id: 'j1' }).mockResolvedValueOnce(null)
    expect((await app.request('/api/journal/j1', { method: 'DELETE' })).status).toBe(200)
    expect((await app.request('/api/journal/j2', { method: 'DELETE' })).status).toBe(404)
    expect(prisma.journalEntry.findFirst).toHaveBeenCalledWith({ where: { id: 'j1', userId: TEST_USER } })
    expect(prisma.journalEntry.delete).toHaveBeenCalledTimes(1)
  })
})
