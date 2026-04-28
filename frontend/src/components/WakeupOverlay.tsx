import type { WakeupState } from '../hooks/useBackendWakeup'

type Props = {
  state: WakeupState
  onRetry: () => void
}

export function WakeupOverlay({ state, onRetry }: Props) {
  // Hide overlay when checking (likely warm) or already awake
  if (state.status === 'checking' || state.status === 'awake') return null

  const seconds = Math.floor(state.elapsedMs / 1000)
  const progressPct = Math.min(100, (state.elapsedMs / 60_000) * 100)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cream/95 backdrop-blur-sm">
      <div className="max-w-sm px-6 text-center">
        <div className="mb-4 text-5xl">☀️</div>

        {state.status === 'waking' && (
          <>
            <h1 className="font-serif text-2xl text-text1 mb-2">
              Waking up the server…
            </h1>
            <p className="text-sm leading-relaxed text-text2 mb-5">
              Dayflow's free-tier backend goes to sleep when idle.
              First visit takes about 30–60 seconds. Subsequent visits are instant.
            </p>

            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-text2/15">
              <div
                className="h-full bg-accent transition-[width] duration-200 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="text-xs text-muted">
              {seconds}s elapsed · attempt {state.attempts}
            </div>
          </>
        )}

        {state.status === 'failed' && (
          <>
            <h1 className="font-serif text-2xl text-text1 mb-2">
              Server didn't wake up in time
            </h1>
            <p className="text-sm leading-relaxed text-text2 mb-5">
              The free-tier backend can take up to 90 seconds to start.
              Try again in a moment.
            </p>
            <button
              onClick={onRetry}
              className="rounded-pill bg-text1 px-5 py-2 text-sm text-cream transition hover:opacity-90"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  )
}
