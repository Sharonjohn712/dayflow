import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma, resetPrismaMock } from '../test/prisma-mock.js'
import { appFor, json, TEST_USER } from '../test/app.js'

vi.mock('../lib/prisma.js', () => import('../test/prisma-mock.js'))
const { tasksRouter } = await import('./tasks.js')
const app = appFor('/api/tasks', tasksRouter)

beforeEach(resetPrismaMock)

describe('GET /api/tasks', () => {
  it("lists only the signed-in user's tasks, oldest first", async () => {
    prisma.task.findMany.mockResolvedValue([{ id: 't1', text: 'Run' }])
    const res = await app.request('/api/tasks')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ id: 't1', text: 'Run' }])
    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { userId: TEST_USER },
      orderBy: { createdAt: 'asc' },
    })
  })
})

describe('POST /api/tasks', () => {
  it('creates a task for the signed-in user and returns 201', async () => {
    prisma.task.create.mockImplementation(({ data }) => Promise.resolve({ id: 't1', ...data }))
    const res = await app.request(
      '/api/tasks',
      json('POST', { text: 'Ship doc', category: 'WORK', dueTime: '09:30' }),
    )
    expect(res.status).toBe(201)
    expect(prisma.task.create).toHaveBeenCalledWith({
      data: { text: 'Ship doc', category: 'WORK', dueTime: '09:30', userId: TEST_USER },
    })
  })

  it('defaults the category to OTHER', async () => {
    prisma.task.create.mockResolvedValue({})
    await app.request('/api/tasks', json('POST', { text: 'Misc' }))
    expect(prisma.task.create.mock.calls[0][0].data.category).toBe('OTHER')
  })

  it('ignores a userId in the body', async () => {
    prisma.task.create.mockResolvedValue({})
    await app.request('/api/tasks', json('POST', { text: 'x', userId: 'someone_else' }))
    expect(prisma.task.create.mock.calls[0][0].data.userId).toBe(TEST_USER)
  })

  it.each([
    ['empty text', { text: '' }],
    ['text over 300 chars', { text: 'a'.repeat(301) }],
    ['unknown category', { text: 'x', category: 'FUN' }],
    ['badly formatted dueTime', { text: 'x', dueTime: '9:30am' }],
  ])('rejects %s with 400', async (_label, body) => {
    const res = await app.request('/api/tasks', json('POST', body))
    expect(res.status).toBe(400)
    expect(prisma.task.create).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/tasks/:id', () => {
  it('updates a task the user owns', async () => {
    prisma.task.findFirst.mockResolvedValue({ id: 't1' })
    prisma.task.update.mockResolvedValue({ id: 't1', done: true })
    const res = await app.request('/api/tasks/t1', json('PATCH', { done: true }))
    expect(res.status).toBe(200)
    expect(prisma.task.findFirst).toHaveBeenCalledWith({ where: { id: 't1', userId: TEST_USER } })
    expect(prisma.task.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { done: true } })
  })

  it("returns 404 for another user's (or a missing) task", async () => {
    prisma.task.findFirst.mockResolvedValue(null)
    const res = await app.request('/api/tasks/t1', json('PATCH', { done: true }))
    expect(res.status).toBe(404)
    expect(prisma.task.update).not.toHaveBeenCalled()
  })

  it('rejects a non-boolean done with 400', async () => {
    const res = await app.request('/api/tasks/t1', json('PATCH', { done: 'yes' }))
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/tasks/:id', () => {
  it('deletes a task the user owns', async () => {
    prisma.task.findFirst.mockResolvedValue({ id: 't1' })
    const res = await app.request('/api/tasks/t1', { method: 'DELETE' })
    expect(res.status).toBe(200)
    expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 't1' } })
  })

  it('returns 404 when the task is not the user’s', async () => {
    prisma.task.findFirst.mockResolvedValue(null)
    const res = await app.request('/api/tasks/t1', { method: 'DELETE' })
    expect(res.status).toBe(404)
    expect(prisma.task.delete).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/tasks/done/all', () => {
  it("clears only the user's completed tasks (not routed to /:id)", async () => {
    const res = await app.request('/api/tasks/done/all', { method: 'DELETE' })
    expect(res.status).toBe(200)
    expect(prisma.task.deleteMany).toHaveBeenCalledWith({ where: { userId: TEST_USER, done: true } })
    expect(prisma.task.findFirst).not.toHaveBeenCalled()
  })
})
