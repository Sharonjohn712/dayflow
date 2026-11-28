// Live contract tests against a deployed API. CI runs these right after each
// production deploy (there is no separate test environment yet), so they are
// read-only: no request here passes authentication, so nothing is written.
//
//   CONTRACT_BASE_URL         required, e.g. https://dayflow-qtkm.onrender.com
//   CONTRACT_FRONTEND_ORIGIN  optional, the production site; must pass CORS
//   CONTRACT_EXPECT_COMMIT    optional, the git SHA /health must report
//
// Run: CONTRACT_BASE_URL=... npm run test:contract
import { describe, expect, it } from 'vitest'
import type { ZodTypeAny } from 'zod'
import { ErrorBody, Health, PROTECTED_ROUTES } from '../src/contract/schemas.js'

const BASE = process.env.CONTRACT_BASE_URL?.replace(/\/$/, '')
const ORIGIN = process.env.CONTRACT_FRONTEND_ORIGIN
const COMMIT = process.env.CONTRACT_EXPECT_COMMIT
if (!BASE) throw new Error('Set CONTRACT_BASE_URL to the API under test')

async function call(method: string, path: string, headers: Record<string, string> = {}) {
  const hasBody = method === 'POST' || method === 'PATCH'
  return fetch(`${BASE}${path}`, {
    method,
    headers: { ...(hasBody ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: hasBody ? '{}' : undefined,
  })
}

async function matches(res: Response, status: number, schema: ZodTypeAny) {
  expect(res.status).toBe(status)
  expect(res.headers.get('content-type')).toContain('application/json')
  const body = await res.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new Error(`Contract mismatch: ${parsed.error.message}\nBody: ${JSON.stringify(body)}`)
  return parsed.data
}

describe(`live API contract: ${BASE}`, () => {
  it('GET /health is public and matches the contract', async () => {
    const body = await matches(await call('GET', '/health'), 200, Health)
    if (COMMIT) expect(body.commit, 'deployed commit').toBe(COMMIT)
  })

  describe('every API route rejects requests without a token', () => {
    it.each(PROTECTED_ROUTES)('%s %s → 401', async (method, path) => {
      const body = await matches(await call(method, path), 401, ErrorBody)
      expect(body.error).toBe('Unauthorized')
    })
  })

  describe('every API route rejects an invalid token', () => {
    it.each(PROTECTED_ROUTES)('%s %s → 401', async (method, path) => {
      const res = await call(method, path, { Authorization: 'Bearer contract-test-invalid-token' })
      const body = await matches(res, 401, ErrorBody)
      expect(body.error).toBe('Invalid or expired token')
    })
  })

  describe('CORS', () => {
    const preflight = (origin: string) =>
      fetch(`${BASE}/api/tasks`, {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'PATCH',
          'Access-Control-Request-Headers': 'authorization,content-type',
        },
      })

    it.runIf(!!ORIGIN)('allows the production site with the methods and headers it uses', async () => {
      const res = await preflight(ORIGIN!)
      expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN)
      const methods = res.headers.get('access-control-allow-methods') ?? ''
      for (const m of ['GET', 'POST', 'PATCH', 'DELETE']) expect(methods).toContain(m)
      expect((res.headers.get('access-control-allow-headers') ?? '').toLowerCase()).toContain('authorization')
    })

    it('does not allow an unknown origin', async () => {
      const res = await preflight('https://contract-test.invalid')
      expect(res.headers.get('access-control-allow-origin')).toBeNull()
    })
  })
})
