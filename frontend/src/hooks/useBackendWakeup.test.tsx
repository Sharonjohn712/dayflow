// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

const pingHealth = vi.fn()
vi.mock('../lib/health', () => ({ pingHealth }))
const { useBackendWakeup } = await import('./useBackendWakeup')

beforeEach(() => {
  vi.useFakeTimers()
  pingHealth.mockReset()
})
afterEach(() => vi.useRealTimers())

// Let pending promises and timers run inside act().
const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

describe('useBackendWakeup', () => {
  it('is awake straight away when the first ping succeeds', async () => {
    pingHealth.mockResolvedValue({ ok: true, ms: 120 })
    const { result } = renderHook(() => useBackendWakeup())
    expect(result.current.state.status).toBe('checking')

    await advance(0)
    expect(result.current.state).toEqual({ status: 'awake', elapsedMs: 120, attempts: 1 })
    expect(pingHealth).toHaveBeenCalledWith(1500)
  })

  it('shows "waking" and keeps polling until the backend answers', async () => {
    pingHealth
      .mockResolvedValueOnce({ ok: false, ms: 1500 })
      .mockResolvedValueOnce({ ok: false, ms: 3000 })
      .mockResolvedValueOnce({ ok: true, ms: 200 })
    const { result } = renderHook(() => useBackendWakeup())

    await advance(0)
    expect(result.current.state.status).toBe('waking')
    expect(pingHealth).toHaveBeenLastCalledWith(3000)

    await advance(500)
    expect(result.current.state.elapsedMs).toBeGreaterThan(0) // ticking display

    await advance(1500) // gap before the next poll
    expect(result.current.state.status).toBe('awake')
    expect(result.current.state.attempts).toBe(3)
  })

  // The 90s limit is checked after each 1.5s poll gap, so "failed" lands just past 90s.
  it('gives up after 90 seconds', async () => {
    pingHealth.mockResolvedValue({ ok: false, ms: 0 })
    const { result } = renderHook(() => useBackendWakeup())
    await advance(95_000)
    expect(result.current.state.status).toBe('failed')
  })

  it('retry() starts checking again', async () => {
    pingHealth.mockResolvedValue({ ok: false, ms: 0 })
    const { result } = renderHook(() => useBackendWakeup())
    await advance(95_000)
    expect(result.current.state.status).toBe('failed')

    pingHealth.mockResolvedValue({ ok: true, ms: 50 })
    act(() => result.current.retry())
    await advance(0)
    expect(result.current.state.status).toBe('awake')
  })

  it('stops polling after unmount', async () => {
    let resolveFirst!: (v: unknown) => void
    pingHealth.mockReturnValueOnce(new Promise((r) => { resolveFirst = r }))
    const { unmount } = renderHook(() => useBackendWakeup())
    unmount()
    resolveFirst({ ok: false, ms: 0 })
    await advance(10_000)
    expect(pingHealth).toHaveBeenCalledTimes(1)
  })

  it('stops if unmounted while a poll is in flight', async () => {
    let resolveSecond!: (v: unknown) => void
    pingHealth
      .mockResolvedValueOnce({ ok: false, ms: 0 })
      .mockReturnValueOnce(new Promise((r) => { resolveSecond = r }))
    const { unmount } = renderHook(() => useBackendWakeup())
    await advance(0)
    unmount()
    resolveSecond({ ok: true, ms: 0 })
    await advance(10_000)
    expect(pingHealth).toHaveBeenCalledTimes(2)
  })
})
