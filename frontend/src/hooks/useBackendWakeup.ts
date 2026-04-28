import { useEffect, useRef, useState, useCallback } from 'react'
import { pingHealth } from '../lib/health'

export type WakeupStatus = 'checking' | 'awake' | 'waking' | 'failed'

export type WakeupState = {
  status: WakeupStatus
  elapsedMs: number
  attempts: number
}

const FIRST_TIMEOUT_MS = 1500   // anything quicker = warm
const POLL_TIMEOUT_MS  = 3000   // each subsequent ping
const POLL_GAP_MS      = 1500   // pause between polls
const MAX_WAKE_MS      = 90_000 // give up after 90s

export function useBackendWakeup() {
  const [state, setState] = useState<WakeupState>({
    status: 'checking',
    elapsedMs: 0,
    attempts: 0,
  })
  const startRef = useRef<number>(0)
  const cancelledRef = useRef(false)
  const [retryToken, setRetryToken] = useState(0)

  // Probe + poll
  useEffect(() => {
    cancelledRef.current = false
    const start = Date.now()
    startRef.current = start
    let attempts = 0

    setState({ status: 'checking', elapsedMs: 0, attempts: 0 })

    async function probe(timeoutMs: number) {
      attempts++
      const r = await pingHealth(timeoutMs)
      return cancelledRef.current ? null : r
    }

    async function run() {
      const first = await probe(FIRST_TIMEOUT_MS)
      if (!first) return
      if (first.ok) {
        setState({ status: 'awake', elapsedMs: first.ms, attempts })
        return
      }
      setState({ status: 'waking', elapsedMs: Date.now() - start, attempts })

      while (!cancelledRef.current) {
        if (Date.now() - start > MAX_WAKE_MS) {
          setState({ status: 'failed', elapsedMs: Date.now() - start, attempts })
          return
        }
        const r = await probe(POLL_TIMEOUT_MS)
        if (!r) return
        if (r.ok) {
          setState({ status: 'awake', elapsedMs: Date.now() - start, attempts })
          return
        }
        await new Promise((res) => setTimeout(res, POLL_GAP_MS))
      }
    }

    run()
    return () => {
      cancelledRef.current = true
    }
  }, [retryToken])

  // Tick elapsed display so the UI feels alive between probes
  useEffect(() => {
    if (state.status !== 'waking') return
    const id = setInterval(() => {
      setState((s) =>
        s.status === 'waking' ? { ...s, elapsedMs: Date.now() - startRef.current } : s,
      )
    }, 250)
    return () => clearInterval(id)
  }, [state.status])

  const retry = useCallback(() => setRetryToken((t) => t + 1), [])

  return { state, retry }
}
