// Builds a minimal app around one router for route tests: a fake auth step
// that signs every request in as TEST_USER, plus the real error handler.
import { Hono } from 'hono'
import { errorHandler } from '../middleware/error.js'

export const TEST_USER = 'user_test'

export function appFor(path: string, router: Hono) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('userId', TEST_USER)
    await next()
  })
  app.route(path, router)
  app.onError(errorHandler)
  return app
}

export function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}
