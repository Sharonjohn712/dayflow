import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma, resetPrismaMock } from '../test/prisma-mock.js'
import { appFor, json, TEST_USER } from '../test/app.js'

vi.mock('../lib/prisma.js', () => import('../test/prisma-mock.js'))
const { goalsRouter } = await import('./goals.js')
const app = appFor('/api/goals', goalsRouter)

beforeEach(resetPrismaMock)

describe('goals routes', () => {
  it("GET lists the user's goals", async () => {
    prisma.goal.findMany.mockResolvedValue([{ id: 'g1' }])
    const res = await app.request('/api/goals')
    expect(await res.json()).toEqual([{ id: 'g1' }])
    expect(prisma.goal.findMany.mock.calls[0][0].where).toEqual({ userId: TEST_USER })
  })

  it('POST creates a goal and returns 201', async () => {
    prisma.goal.create.mockResolvedValue({ id: 'g1', progress: 0 })
    const res = await app.request('/api/goals', json('POST', { text: 'Run a half-marathon' }))
    expect(res.status).toBe(201)
    expect(prisma.goal.create).toHaveBeenCalledWith({
      data: { userId: TEST_USER, text: 'Run a half-marathon' },
    })
  })

  it('POST rejects empty text', async () => {
    const res = await app.request('/api/goals', json('POST', { text: '' }))
    expect(res.status).toBe(400)
  })

  it('PATCH updates progress on an owned goal', async () => {
    prisma.goal.findFirst.mockResolvedValue({ id: 'g1' })
    prisma.goal.update.mockResolvedValue({ id: 'g1', progress: 40 })
    const res = await app.request('/api/goals/g1', json('PATCH', { progress: 40 }))
    expect(res.status).toBe(200)
    expect(prisma.goal.update).toHaveBeenCalledWith({ where: { id: 'g1' }, data: { progress: 40 } })
  })

  it.each([-1, 101, 12.5])('PATCH rejects progress %s', async (progress) => {
    const res = await app.request('/api/goals/g1', json('PATCH', { progress }))
    expect(res.status).toBe(400)
    expect(prisma.goal.update).not.toHaveBeenCalled()
  })

  it('PATCH returns 404 for a goal the user does not own', async () => {
    prisma.goal.findFirst.mockResolvedValue(null)
    const res = await app.request('/api/goals/g1', json('PATCH', { progress: 10 }))
    expect(res.status).toBe(404)
  })

  it('DELETE removes an owned goal, 404 otherwise', async () => {
    prisma.goal.findFirst.mockResolvedValueOnce({ id: 'g1' }).mockResolvedValueOnce(null)
    expect((await app.request('/api/goals/g1', { method: 'DELETE' })).status).toBe(200)
    expect((await app.request('/api/goals/g2', { method: 'DELETE' })).status).toBe(404)
    expect(prisma.goal.delete).toHaveBeenCalledTimes(1)
  })
})
