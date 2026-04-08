import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import Groq from 'groq-sdk'
import { prisma } from '../lib/prisma.js'

export const aiRouter = new Hono()

const MODEL = 'llama-3.3-70b-versatile'

// Lazily instantiated so env vars are guaranteed to be loaded first
let _groq: Groq | null = null
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
  return _groq
}

// ── GET /api/ai/suggestions ───────────────────────────────────────────────────
// Returns 6 AI-generated task suggestions based on context
aiRouter.get('/suggestions', async (c) => {
  const userId = c.get('userId')

  const recentTasks = await prisma.task.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { text: true },
  })

  const hour = new Date().getHours()
  const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const existing = recentTasks.map((t) => t.text).join(', ') || 'none'

  const completion = await getGroq().chat.completions.create({
    model: MODEL,
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `You are a productivity assistant. Suggest 6 short, practical daily tasks for the ${period} on a ${dayName}.
Existing tasks: ${existing}
Return ONLY a JSON array of exactly 6 strings, each under 40 chars.
No explanations, no markdown, no backticks.
Example: ["Reply to emails","10-min walk","Review calendar"]`,
      },
    ],
  })

  const text = completion.choices[0]?.message?.content ?? ''
  try {
    const suggestions = JSON.parse(text.replace(/```json|```/g, '').trim()) as string[]
    return c.json({ suggestions })
  } catch {
    return c.json({ suggestions: [] })
  }
})

// ── POST /api/ai/review — streaming day review ────────────────────────────────
const reviewSchema = z.object({
  userName: z.string().max(100).nullish(),
})

aiRouter.post('/review', zValidator('json', reviewSchema), async (c) => {
  const userId = c.get('userId')
  const { userName } = c.req.valid('json')

  const today = new Date().toISOString().slice(0, 10)

  const [tasks, goals, habits, entries] = await Promise.all([
    prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.habit.findMany({
      where: { userId },
      include: { checks: { where: { date: today } } },
    }),
    prisma.journalEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    }),
  ])

  const done = tasks.filter((t) => t.done).length
  const total = tasks.length
  const pct = total ? Math.round((done / total) * 100) : 0

  const habitSummary = habits
    .map((h) => `${h.name}: ${h.checks.length > 0 ? 'done' : 'not done'}`)
    .join('; ')

  const prompt = `You are Dayflow, a warm and insightful AI productivity coach. Analyze this person's day.
${userName ? `Their name is ${userName}.` : ''}

TODAY:
- Tasks: ${done}/${total} done (${pct}%)
- Completed: ${tasks.filter((t) => t.done).map((t) => `[${t.category}] ${t.text}`).join(', ') || 'none'}
- Pending: ${tasks.filter((t) => !t.done).map((t) => `[${t.category}] ${t.text}`).join(', ') || 'none'}
- Goals: ${goals.map((g) => `"${g.text}" (${g.progress}%)`).join('; ') || 'none'}
- Habits: ${habitSummary || 'none tracked'}
- Latest journal: ${entries[0]?.text || 'no entry'}

Write a warm, concise review (3–4 paragraphs):
1. Overall verdict
2. What they did well (specific)
3. Habits & patterns
4. One motivating insight for tomorrow

Tone: warm, direct, honest. Prose only, no bullets.${userName ? ` Address ${userName} by name at least once.` : ''}
Final line must be: SCORE: [0-100]`

  // Stream the response back to the client
  const stream = await getGroq().chat.completions.create({
    model: MODEL,
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  })

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) controller.enqueue(encoder.encode(text))
        }
        controller.close()
      },
    }),
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    }
  )
})
