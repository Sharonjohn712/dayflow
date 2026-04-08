import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

export const tasksRouter = new Hono()

const CategoryEnum = z.enum(['WORK', 'HEALTH', 'PERSONAL', 'OTHER'])

const createTaskSchema = z.object({
  text:     z.string().min(1).max(300),
  category: CategoryEnum.default('OTHER'),
  dueTime:  z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
})

const updateTaskSchema = z.object({
  text:     z.string().min(1).max(300).optional(),
  category: CategoryEnum.optional(),
  dueTime:  z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  done:     z.boolean().optional(),
})

// GET /api/tasks
tasksRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const tasks = await prisma.task.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
  return c.json(tasks)
})

// POST /api/tasks
tasksRouter.post('/', zValidator('json', createTaskSchema), async (c) => {
  const userId = c.get('userId')
  const data = c.req.valid('json')
  const task = await prisma.task.create({
    data: { ...data, userId },
  })
  return c.json(task, 201)
})

// DELETE /api/tasks/done/all — MUST be registered before /:id to avoid conflict
tasksRouter.delete('/done/all', async (c) => {
  const userId = c.get('userId')
  await prisma.task.deleteMany({ where: { userId, done: true } })
  return c.json({ ok: true })
})

// PATCH /api/tasks/:id
tasksRouter.patch('/:id', zValidator('json', updateTaskSchema), async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const data = c.req.valid('json')

  const existing = await prisma.task.findFirst({ where: { id, userId } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const task = await prisma.task.update({ where: { id }, data })
  return c.json(task)
})

// DELETE /api/tasks/:id
tasksRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()

  const existing = await prisma.task.findFirst({ where: { id, userId } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.task.delete({ where: { id } })
  return c.json({ ok: true })
})
