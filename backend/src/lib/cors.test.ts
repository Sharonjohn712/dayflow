import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { originMatcher } from './cors.js'

describe('originMatcher', () => {
  it('defaults to the local Vite dev server', () => {
    const allow = originMatcher({})
    expect(allow('http://localhost:5173')).toBe('http://localhost:5173')
    expect(allow('http://localhost:3000')).toBeNull()
  })

  it('accepts a single exact origin (existing production config)', () => {
    const allow = originMatcher({ ALLOWED_ORIGIN: 'https://dayflow.vercel.app' })
    expect(allow('https://dayflow.vercel.app')).toBe('https://dayflow.vercel.app')
    expect(allow('https://evil.example')).toBeNull()
  })

  it('accepts a comma-separated list', () => {
    const allow = originMatcher({ ALLOWED_ORIGIN: 'https://a.app, https://b.app' })
    expect(allow('https://a.app')).toBe('https://a.app')
    expect(allow('https://b.app')).toBe('https://b.app')
  })

  describe('preview pattern', () => {
    const allow = originMatcher({
      ALLOWED_ORIGIN: 'https://dayflow.vercel.app',
      ALLOWED_ORIGIN_PATTERN: String.raw`https://dayflow-[a-z0-9-]+-myteam\.vercel\.app`,
    })

    it('matches per-PR preview URLs', () => {
      expect(allow('https://dayflow-abc123def-myteam.vercel.app')).not.toBeNull()
      expect(allow('https://dayflow-git-feature-x-myteam.vercel.app')).not.toBeNull()
    })

    it('is anchored, so look-alike origins are rejected', () => {
      expect(allow('https://dayflow-abc-myteam.vercel.app.evil.com')).toBeNull()
      expect(allow('https://evil.com/https://dayflow-abc-myteam.vercel.app')).toBeNull()
      expect(allow('https://dayflow-abc-otherteam.vercel.app')).toBeNull()
    })
  })

  it('drives the Access-Control-Allow-Origin header', async () => {
    const app = new Hono()
    app.use('*', cors({ origin: originMatcher({ ALLOWED_ORIGIN: 'https://dayflow.vercel.app' }) }))
    app.get('/', (c) => c.text('ok'))

    const ok = await app.request('/', { headers: { Origin: 'https://dayflow.vercel.app' } })
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe('https://dayflow.vercel.app')

    const blocked = await app.request('/', { headers: { Origin: 'https://evil.example' } })
    expect(blocked.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })
})
