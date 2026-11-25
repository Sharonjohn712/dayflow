import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { z } from 'zod'
import { errorHandler } from './error.js'

const app = new Hono()
app.get('/zod', () => {
  z.object({ name: z.string() }).parse({ name: 42 })
  return new Response()
})
app.get('/boom', () => {
  throw new Error('database unreachable')
})
app.onError(errorHandler)

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('errorHandler', () => {
  it('turns a ZodError into a 400 with field details', async () => {
    const res = await app.request('/zod')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Validation error')
    expect(body.details).toHaveProperty('name')
  })

  it('turns any other error into a 500', async () => {
    const res = await app.request('/boom')
    expect(res.status).toBe(500)
    expect(await res.json()).toHaveProperty('error')
  })
})
