import { useState } from 'react'
import { useJournal, useCreateJournalEntry, useDeleteJournalEntry } from '../../hooks'
import { PageHeading, Empty, Spinner } from '../ui'
import { cn, formatDate } from '../../lib/utils'

const MOODS = ['😊', '😐', '😔', '🔥', '😴']

export function Journal() {
  const { data: entries = [], isLoading } = useJournal()
  const createEntry = useCreateJournalEntry()
  const deleteEntry = useDeleteJournalEntry()

  const [text, setText] = useState('')
  const [mood, setMood] = useState<string | null>(null)

  async function handleSave() {
    const trimmed = text.trim()
    if (!trimmed) return
    await createEntry.mutateAsync({ text: trimmed, mood })
    setText('')
    setMood(null)
  }

  return (
    <>
      <PageHeading>📓 Journal</PageHeading>

      {/* New entry card */}
      <div className="card">
        <div className="card-title">New Entry</div>

        {/* Mood picker */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-text2 font-medium">Mood:</span>
          {MOODS.map((m) => (
            <button
              key={m}
              onClick={() => setMood(mood === m ? null : m)}
              className={cn(
                'px-3 py-1.5 rounded-full border text-base transition-all',
                mood === m
                  ? 'border-steel bg-sage scale-110'
                  : 'border-border2 bg-cream hover:bg-sage hover:scale-105'
              )}
            >
              {m}
            </button>
          ))}
        </div>

        <textarea
          className="input min-h-[120px] resize-y leading-relaxed"
          placeholder="Reflect on your day — what went well, what you're grateful for, what you'd do differently…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="flex gap-2 justify-end mt-3">
          <button
            className="btn-ghost"
            onClick={() => { setText(''); setMood(null) }}
          >
            Clear
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={createEntry.isPending || !text.trim()}
          >
            {createEntry.isPending ? <Spinner className="w-4 h-4" /> : 'Save Entry'}
          </button>
        </div>
      </div>

      {/* Past entries */}
      <p className="font-serif text-xl text-text2 italic">Past Entries</p>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : entries.length === 0 ? (
        <Empty>No entries yet.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="card hover:border-steel transition-colors"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-accent font-semibold uppercase tracking-wide">
                  {formatDate(entry.createdAt)}
                </span>
                <div className="flex items-center gap-2">
                  {entry.mood && <span className="text-lg">{entry.mood}</span>}
                  <button
                    onClick={() => deleteEntry.mutate(entry.id)}
                    className="text-muted2 hover:text-warm text-xs px-1 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <p className="text-sm text-text2 leading-relaxed whitespace-pre-wrap">{entry.text}</p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
