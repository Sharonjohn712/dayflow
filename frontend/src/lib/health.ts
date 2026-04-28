// Lightweight health probe used by the cold-start wake-up handler.
// Free-tier backend hosts (Render, Fly.io free) spin services down after idle —
// first request after a quiet period can take 30-60s. We poll /health with
// short timeouts so the UI can show progress instead of a frozen fetch.

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export type HealthResult = { ok: boolean; ms: number }

export async function pingHealth(timeoutMs = 1500): Promise<HealthResult> {
  const start = Date.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}/health`, { signal: ctrl.signal })
    return { ok: res.ok, ms: Date.now() - start }
  } catch {
    return { ok: false, ms: Date.now() - start }
  } finally {
    clearTimeout(timer)
  }
}
