import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

export const goalsRouter = new Hono()

const createGoalSchema = z.object({
  text: z.string().min(1).max(300),
})

const updateGoalSchema = z.object({
  text:     z.string().min(1).max(300).optional(),
  progress: z.number().int().min(0).max(100).optional(),
})

// GET /api/goals
goalsRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
  return c.json(goals)
})

// POST /api/goals
goalsRouter.post('/', zValidator('json', createGoalSchema), async (c) => {
  const userId = c.get('userId')
  const { text } = c.req.valid('json')
  const goal = await prisma.goal.create({ data: { userId, text } })
  return c.json(goal, 201)
})

// PATCH /api/goals/:id
goalsRouter.patch('/:id', zValidator('json', updateGoalSchema), async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const data = c.req.valid('json')

  const existing = await prisma.goal.findFirst({ where: { id, userId } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const goal = await prisma.goal.update({ where: { id }, data })
  return c.json(goal)
})

// DELETE /api/goals/:id
goalsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()

  const existing = await prisma.goal.findFirst({ where: { id, userId } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.goal.delete({ where: { id } })
  return c.json({ ok: true })
})
