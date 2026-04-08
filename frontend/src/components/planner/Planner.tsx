import { useState, useRef } from 'react'
import {
  useTasks, useCreateTask, useUpdateTask, useDeleteTask, useAISuggestions,
} from '../../hooks'
import { useUIStore } from '../../store/uiStore'
import { PageHeading, Empty, Spinner } from '../ui'
import { CAT_LABELS, CAT_CLASS, type Category, type TaskFilter, type TaskSort } from '../../types'
import { cn } from '../../lib/utils'

const CATEGORIES: Category[] = ['WORK', 'HEALTH', 'PERSONAL', 'OTHER']

const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: 'all',      label: 'All'        },
  { value: 'pending',  label: 'Pending'    },
  { value: 'done',     label: 'Done'       },
  { value: 'WORK',     label: '💼 Work'    },
  { value: 'HEALTH',   label: '🏃 Health'  },
  { value: 'PERSONAL', label: '✨ Personal' },
]

export function Planner() {
  const { taskFilter, taskSort, setTaskFilter, setTaskSort } = useUIStore()
  const { data: tasks = [], isLoading } = useTasks()
  const createTask  = useCreateTask()
  const updateTask  = useUpdateTask()
  const deleteTask  = useDeleteTask()

  const [text,     setText]     = useState('')
  const [category, setCategory] = useState<Category>('WORK')
  const [dueTime,  setDueTime]  = useState('')

  const inputRef = useRef<HTMLInputElement>(null)

  async function handleAdd() {
    const trimmed = text.trim()
    if (!trimmed) return
    await createTask.mutateAsync({
      text:     trimmed,
      category,
      dueTime:  dueTime || null,
    })
    setText('')
    setDueTime('')
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAdd()
  }

  // Filter
  let filtered = [...tasks]
  if (taskFilter === 'pending') filtered = filtered.filter((t) => !t.done)
  else if (taskFilter === 'done') filtered = filtered.filter((t) => t.done)
  else if (['WORK', 'HEALTH', 'PERSONAL', 'OTHER'].includes(taskFilter as string))
    filtered = filtered.filter((t) => t.category === taskFilter)

  // Sort
  if (taskSort === 'time')
    filtered.sort((a, b) => (a.dueTime ?? '99:99').localeCompare(b.dueTime ?? '99:99'))
  else if (taskSort === 'category')
    filtered.sort((a, b) => a.category.localeCompare(b.category))
  else
    filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return (
    <>
      <PageHeading>✅ Daily Planner</PageHeading>

      {/* Add task card */}
      <div className="card">
        <div className="flex gap-2 flex-wrap">
          <input
            ref={inputRef}
            className="input flex-1 min-w-48"
            placeholder="What do you want to accomplish today?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <select
            className="input w-36"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CAT_LABELS[c]}</option>
            ))}
          </select>
          <input
            type="time"
            className="input w-28"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            title="Due time (optional)"
          />
          <button
            className="btn-primary"
            onClick={handleAdd}
            disabled={createTask.isPending}
          >
            {createTask.isPending ? <Spinner className="w-4 h-4" /> : '+ Add'}
          </button>
        </div>

        {/* AI suggestions */}
        <AISuggestions onAdd={(text) => {
          createTask.mutate({ text, category: 'WORK', dueTime: null })
        }} />
      </div>

      {/* Filters + sort */}
      <div className="card">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setTaskFilter(f.value)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-full border transition-all font-medium',
                  taskFilter === f.value
                    ? 'bg-mist border-steel text-accent'
                    : 'bg-cream border-border2 text-text2 hover:bg-peach'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-text2">
            Sort:
            <select
              className="input w-28 py-1 text-xs"
              value={taskSort}
              onChange={(e) => setTaskSort(e.target.value as TaskSort)}
            >
              <option value="added">Added</option>
              <option value="time">Time</option>
              <option value="category">Category</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <Empty>
            {taskFilter === 'all'
              ? 'No tasks yet — add something above!'
              : 'No tasks match this filter.'}
          </Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((task) => (
              <div
                key={task.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 bg-cream border border-border rounded-xl transition-all hover:border-steel hover:bg-white',
                  task.done && 'opacity-50'
                )}
              >
                {/* Checkbox */}
                <button
                  onClick={() => updateTask.mutate({ id: task.id, done: !task.done })}
                  className={cn(
                    'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 text-xs',
                    task.done
                      ? 'bg-sage border-sage text-green'
                      : 'bg-surface border-border2 hover:border-steel'
                  )}
                >
                  {task.done && '✓'}
                </button>

                {/* Text */}
                <span className={cn('flex-1 text-sm', task.done && 'line-through text-muted')}>
                  {task.text}
                </span>

                {/* Due time */}
                {task.dueTime && (
                  <span className="text-xs text-muted font-medium shrink-0">⏰ {task.dueTime}</span>
                )}

                {/* Category */}
                <span className={cn(CAT_CLASS[task.category], 'shrink-0')}>
                  {CAT_LABELS[task.category]}
                </span>

                {/* Delete */}
                <button
                  onClick={() => deleteTask.mutate(task.id)}
                  className="text-muted2 hover:text-warm text-xs px-1 transition-colors shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function AISuggestions({ onAdd }: { onAdd: (text: string) => void }) {
  const { data, isLoading } = useAISuggestions()
  const [used, setUsed] = useState<Set<string>>(new Set())

  if (isLoading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        <Spinner className="w-3 h-3" /> Loading AI suggestions…
      </div>
    )
  }

  const suggestions = data?.suggestions ?? []
  if (!suggestions.length) return null

  return (
    <div className="mt-3">
      <p className="text-[0.65rem] uppercase tracking-widest text-muted mb-2">
        ✦ AI-suggested tasks — click to add
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => { onAdd(s); setUsed((prev) => new Set([...prev, s])) }}
            disabled={used.has(s)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-all',
              used.has(s)
                ? 'opacity-40 cursor-default bg-mist border-sage text-accent'
                : 'bg-mist border-sage text-accent hover:bg-sage hover:-translate-y-px cursor-pointer'
            )}
          >
            {used.has(s) ? `✓ ${s}` : s}
          </button>
        ))}
      </div>
    </div>
  )
}
