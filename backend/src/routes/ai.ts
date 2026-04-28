import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import Groq from 'groq-sdk'
import { prisma } from '../lib/prisma.js'
import { buildReviewPrompt } from '../lib/review-prompt.js'
import { recordLlmEvent } from '../lib/metrics.js'

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
  const t0 = Date.now()
  let inputTokens = 0
  let outputTokens = 0
  let errorMsg: string | null = null

  try {
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

    inputTokens = completion.usage?.prompt_tokens ?? 0
    outputTokens = completion.usage?.completion_tokens ?? 0

    const text = completion.choices[0]?.message?.content ?? ''
    try {
      const suggestions = JSON.parse(text.replace(/```json|```/g, '').trim()) as string[]
      return c.json({ suggestions })
    } catch {
      return c.json({ suggestions: [] })
    }
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err)
    throw err
  } finally {
    recordLlmEvent({
      userId,
      endpoint: 'suggestions',
      model: MODEL,
      inputTokens,
      outputTokens,
      ttftMs: null,
      totalMs: Date.now() - t0,
      error: errorMsg,
    }).catch((err) => console.error('[metrics] failed to record:', err))
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

  const prompt = buildReviewPrompt({
    userName,
    tasks: tasks.map((t) => ({ text: t.text, category: t.category, done: t.done })),
    goals: goals.map((g) => ({ text: g.text, progress: g.progress })),
    habits: habits.map((h) => ({ name: h.name, doneToday: h.checks.length > 0 })),
    journalText: entries[0]?.text ?? null,
  })

  // Streaming + observability:
  // - Capture time-to-first-token for UX latency tracking
  // - Capture token usage from the trailing chunk (Groq returns it when
  //   stream_options.include_usage is true)
  // - Log a single LlmEvent after the stream completes (or on error)
  const startTs = Date.now()
  let firstTokenTs: number | null = null
  let inputTokens = 0
  let outputTokens = 0
  let streamError: string | null = null

  // Cast: groq-sdk v1.1 types don't yet expose stream_options, but the API supports it
  // and returns a final chunk with usage when include_usage is true.
  type StreamChunk = {
    choices: { delta?: { content?: string } }[]
    usage?: { prompt_tokens?: number; completion_tokens?: number }
    x_groq?: { usage?: { prompt_tokens?: number; completion_tokens?: number } }
  }
  const stream = (await getGroq().chat.completions.create({
    model: MODEL,
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
    stream_options: { include_usage: true },
  } as any)) as unknown as AsyncIterable<StreamChunk>

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          for await (const chunk of stream) {
            // Trailing usage chunk has no choices but carries .usage (and/or .x_groq.usage)
            const u = chunk.usage ?? chunk.x_groq?.usage
            if (u) {
              inputTokens = u.prompt_tokens ?? inputTokens
              outputTokens = u.completion_tokens ?? outputTokens
            }
            const text = chunk.choices?.[0]?.delta?.content ?? ''
            if (text) {
              if (firstTokenTs === null) firstTokenTs = Date.now()
              controller.enqueue(encoder.encode(text))
            }
          }
          controller.close()
        } catch (err) {
          streamError = err instanceof Error ? err.message : String(err)
          controller.error(err)
        } finally {
          recordLlmEvent({
            userId,
            endpoint: 'review',
            model: MODEL,
            inputTokens,
            outputTokens,
            ttftMs: firstTokenTs != null ? firstTokenTs - startTs : null,
            totalMs: Date.now() - startTs,
            error: streamError,
          }).catch((err) => console.error('[metrics] failed to record:', err))
        }
      },
    }),
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    },
  )
})
