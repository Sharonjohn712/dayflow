import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { tasksRouter } from './routes/tasks.js'
import { goalsRouter } from './routes/goals.js'
import { habitsRouter } from './routes/habits.js'
import { journalRouter } from './routes/journal.js'
import { aiRouter } from './routes/ai.js'
import { requireAuth } from './middleware/auth.js'
import { errorHandler } from './middleware/error.js'

const app = new Hono()

// ── Middleware ────────────────────────────────────────────────────────────────
app.use('*', logger())
app.use('*', cors({
  origin: process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

// ── Health check (public) ────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }))

// ── Protected API routes ──────────────────────────────────────────────────────
app.use('/api/*', requireAuth)
app.route('/api/tasks', tasksRouter)
app.route('/api/goals', goalsRouter)
app.route('/api/habits', habitsRouter)
app.route('/api/journal', journalRouter)
app.route('/api/ai', aiRouter)

// ── Global error handler ─────────────────────────────────────────────────────
app.onError(errorHandler)

// ── Start ─────────────────────────────────────────────────────────────────────
const port = Number(process.env.PORT ?? 3001)
console.log(`🚀 Dayflow API running on port ${port}`)

serve({ fetch: app.fetch, port })
