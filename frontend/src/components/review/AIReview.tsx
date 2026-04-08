import { useState, useRef } from 'react'
import { aiApi } from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import { PageHeading } from '../ui'

interface ReviewState {
  status:  'idle' | 'streaming' | 'done' | 'error'
  text:    string
  score:   number | null
}

export function AIReview() {
  const { userName } = useUIStore()
  const [state, setState] = useState<ReviewState>({
    status: 'idle',
    text:   '',
    score:  null,
  })
  const abortRef = useRef<AbortController | null>(null)

  async function handleAnalyze() {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState({ status: 'streaming', text: '', score: null })

    try {
      const res = await aiApi.reviewStream(userName || undefined)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (!res.body) throw new Error('No response body')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText  = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })

        // Parse score out of the stream but keep updating text
        const { text, score } = parseReview(fullText)

        setState({ status: 'streaming', text, score })
      }

      const { text, score } = parseReview(fullText)
      setState({ status: 'done', text, score })

    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setState({
        status: 'error',
        text:   'Could not reach the AI. Please check your connection and try again.',
        score:  null,
      })
    }
  }

  function parseReview(raw: string): { text: string; score: number | null } {
    const m = raw.match(/SCORE:\s*(\d+)/i)
    const score = m ? Number(m[1]) : null
    const text  = raw.replace(/SCORE:\s*\d+/i, '').trim()
    return { text, score }
  }

  const { status, text, score } = state
  const isStreaming = status === 'streaming'

  const scoreEmoji = score !== null
    ? score >= 85 ? '🔥' : score >= 65 ? '👍' : '💪'
    : null
  const scoreLabel = score !== null
    ? score >= 85 ? 'Excellent' : score >= 65 ? 'Good day' : 'Keep going'
    : null

  return (
    <>
      <PageHeading>✦ AI Day Review</PageHeading>

      <div
        className="relative rounded-[18px] p-7 overflow-hidden border border-border shadow-md"
        style={{
          background: 'linear-gradient(140deg, #DCECE9 0%, #F2EAE0 50%, #F6C7B3 100%)',
        }}
      >
        {/* Decorative glyph */}
        <span
          className="absolute bottom-[-10px] right-5 text-[5rem] leading-none pointer-events-none select-none"
          style={{ color: 'rgba(130,178,192,0.1)' }}
        >
          ✦
        </span>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-md"
            style={{ background: 'linear-gradient(135deg, #82B2C0, #C3DEDD)' }}
          >
            ✦
          </div>
          <div>
            <p className="font-serif text-lg font-semibold text-text1">Your Personal Day Coach</p>
            <p className="text-xs text-text2">Powered by Claude · Dayflow</p>
          </div>
        </div>

        {/* Score box (float right) */}
        {score !== null && (
          <div className="float-right ml-5 mb-2 bg-surface border border-border rounded-2xl px-4 py-3 text-center">
            <p className="font-serif text-5xl font-semibold text-gold leading-none">{score}</p>
            <p className="text-[0.62rem] uppercase tracking-widest text-muted mt-1">/ 100</p>
            <p className="text-sm mt-1">{scoreEmoji} {scoreLabel}</p>
          </div>
        )}

        {/* Review body */}
        <div className={`text-sm leading-relaxed whitespace-pre-wrap ${status === 'idle' ? 'text-muted italic' : 'text-text2'}`}>
          {status === 'idle'
            ? "Hit the button below and I'll review your tasks, goals, habits, and journal to tell you how your day went — and what to carry into tomorrow."
            : text}
          {isStreaming && <span className="ai-cursor" />}
        </div>

        {status === 'error' && (
          <p className="text-sm text-warm mt-2">{text}</p>
        )}

        {/* CTA button */}
        <button
          onClick={handleAnalyze}
          disabled={isStreaming}
          className="w-full mt-6 py-3.5 rounded-xl text-sm font-semibold text-white transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 hover:-translate-y-px"
          style={{
            background: 'linear-gradient(90deg, #82B2C0, #5596a8)',
            boxShadow: '0 4px 14px rgba(130,178,192,0.35)',
          }}
        >
          {isStreaming ? '⏳ Analyzing your day…' : '✦ Analyze My Day'}
        </button>
      </div>
    </>
  )
}
