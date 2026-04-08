import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

export const habitsRouter = new Hono()

const createHabitSchema = z.object({
  name: z.string().min(1).max(200),
})

const checkSchema = z.object({
  date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checked: z.boolean(),
})

// GET /api/habits — includes checks for the last 7 days
habitsRouter.get('/', async (c) => {
  const userId = c.get('userId')

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const fromDate = sevenDaysAgo.toISOString().slice(0, 10)

  const habits = await prisma.habit.findMany({
    where: { userId },
    include: {
      checks: {
        where: { date: { gte: fromDate } },
        select: { date: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Flatten checks to a set of dates per habit for easy client consumption
  return c.json(
    habits.map((h) => ({
      id:        h.id,
      name:      h.name,
      createdAt: h.createdAt,
      checks:    h.checks.map((ch) => ch.date),
    }))
  )
})

// POST /api/habits
habitsRouter.post('/', zValidator('json', createHabitSchema), async (c) => {
  const userId = c.get('userId')
  const { name } = c.req.valid('json')
  const habit = await prisma.habit.create({ data: { userId, name } })
  return c.json({ ...habit, checks: [] }, 201)
})

// POST /api/habits/:id/check — toggle a day
habitsRouter.post('/:id/check', zValidator('json', checkSchema), async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const { date, checked } = c.req.valid('json')

  const habit = await prisma.habit.findFirst({ where: { id, userId } })
  if (!habit) return c.json({ error: 'Not found' }, 404)

  if (checked) {
    await prisma.habitCheck.upsert({
      where:  { habitId_date: { habitId: id, date } },
      create: { habitId: id, date },
      update: {},
    })
  } else {
    await prisma.habitCheck.deleteMany({ where: { habitId: id, date } })
  }

  return c.json({ ok: true })
})

// DELETE /api/habits/:id
habitsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()

  const habit = await prisma.habit.findFirst({ where: { id, userId } })
  if (!habit) return c.json({ error: 'Not found' }, 404)

  await prisma.habit.delete({ where: { id } })
  return c.json({ ok: true })
})
