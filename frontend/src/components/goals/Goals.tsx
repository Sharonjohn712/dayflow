import { useState } from 'react'
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '../../hooks'
import { PageHeading, Empty, Spinner, ProgressBar } from '../ui'

export function Goals() {
  const { data: goals = [], isLoading } = useGoals()
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()

  const [text, setText] = useState('')

  async function handleAdd() {
    const trimmed = text.trim()
    if (!trimmed) return
    await createGoal.mutateAsync(trimmed)
    setText('')
  }

  return (
    <>
      <PageHeading>🎯 Goal Tracker</PageHeading>

      <div className="card">
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Set a goal (e.g. Exercise 5 days this week)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            className="btn-primary"
            onClick={handleAdd}
            disabled={createGoal.isPending}
          >
            {createGoal.isPending ? <Spinner className="w-4 h-4" /> : '+ Add Goal'}
          </button>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : goals.length === 0 ? (
            <Empty>No goals set yet.</Empty>
          ) : (
            <div className="flex flex-col gap-3">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-start gap-3 p-4 bg-cream border border-border rounded-xl"
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-text1">{goal.text}</span>
                      <span className="text-xs font-semibold bg-sage text-accent rounded-md px-2 py-0.5 ml-2 shrink-0">
                        {goal.progress}%
                      </span>
                    </div>
                    <ProgressBar
                      value={goal.progress}
                      color={goal.progress >= 100 ? '#4e9280' : '#82B2C0'}
                      height={7}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={goal.progress}
                      onChange={(e) =>
                        updateGoal.mutate({ id: goal.id, progress: Number(e.target.value) })
                      }
                      className="w-full mt-2 accent-steel cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={() => deleteGoal.mutate(goal.id)}
                    className="text-muted2 hover:text-warm text-xs px-1 mt-1 transition-colors shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
