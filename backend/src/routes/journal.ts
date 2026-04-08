import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

export const journalRouter = new Hono()

const createEntrySchema = z.object({
  text: z.string().min(1).max(10000),
  mood: z.string().max(10).nullable().optional(),
})

// GET /api/journal
journalRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const entries = await prisma.journalEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return c.json(entries)
})

// POST /api/journal
journalRouter.post('/', zValidator('json', createEntrySchema), async (c) => {
  const userId = c.get('userId')
  const { text, mood } = c.req.valid('json')
  const entry = await prisma.journalEntry.create({
    data: { userId, text, mood: mood ?? null },
  })
  return c.json(entry, 201)
})

// DELETE /api/journal/:id
journalRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()

  const existing = await prisma.journalEntry.findFirst({ where: { id, userId } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.journalEntry.delete({ where: { id } })
  return c.json({ ok: true })
})
