import { afterEach, describe, expect, it, vi } from 'vitest'
import { pingHealth } from './health'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('pingHealth', () => {
  it('reports ok when /health answers 200', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const r = await pingHealth()
    expect(r.ok).toBe(true)
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3001/health')
  })

  it('reports not ok for an error status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })))
    expect((await pingHealth()).ok).toBe(false)
  })

  it('reports not ok when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    expect((await pingHealth()).ok).toBe(false)
  })

  it('aborts and reports not ok when the backend is still asleep', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      }),
    ))
    const pending = pingHealth(1500)
    await vi.advanceTimersByTimeAsync(1500)
    expect((await pending).ok).toBe(false)
  })
})
