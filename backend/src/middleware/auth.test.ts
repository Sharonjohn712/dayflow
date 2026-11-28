import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

const verifyToken = vi.fn()
vi.mock('@clerk/backend', () => ({ verifyToken }))
const { requireAuth } = await import('./auth.js')

const app = new Hono()
app.use('*', requireAuth)
app.get('/me', (c) => c.json({ userId: c.get('userId') }))

beforeEach(() => {
  verifyToken.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('requireAuth', () => {
  it('rejects a request with no Authorization header', async () => {
    const res = await app.request('/me')
    expect(res.status).toBe(401)
    expect(verifyToken).not.toHaveBeenCalled()
  })

  it('rejects a non-Bearer Authorization header', async () => {
    const res = await app.request('/me', { headers: { Authorization: 'Basic abc' } })
    expect(res.status).toBe(401)
    expect(verifyToken).not.toHaveBeenCalled()
  })

  it('rejects a token Clerk cannot verify', async () => {
    verifyToken.mockRejectedValue(new Error('expired'))
    const res = await app.request('/me', { headers: { Authorization: 'Bearer bad' } })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Invalid or expired token' })
  })

  it('sets userId from the verified token subject', async () => {
    verifyToken.mockResolvedValue({ sub: 'user_123' })
    const res = await app.request('/me', { headers: { Authorization: 'Bearer good' } })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ userId: 'user_123' })
    expect(verifyToken.mock.calls[0][0]).toBe('good')
  })
})
