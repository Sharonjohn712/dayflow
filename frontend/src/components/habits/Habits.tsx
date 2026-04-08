import { useState } from 'react'
import { useHabits, useCreateHabit, useToggleHabitCheck, useDeleteHabit } from '../../hooks'
import { PageHeading, Empty, Spinner } from '../ui'
import { getLast7Days, habitStreak, today, dowInitial, cn } from '../../lib/utils'

export function Habits() {
  const { data: habits = [], isLoading } = useHabits()
  const createHabit = useCreateHabit()
  const toggleCheck = useToggleHabitCheck()
  const deleteHabit = useDeleteHabit()

  const [name, setName] = useState('')
  const days = getLast7Days()
  const todayStr = today()

  async function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed) return
    await createHabit.mutateAsync(trimmed)
    setName('')
  }

  return (
    <>
      <PageHeading>
        🔥 Habit Tracker{' '}
        <em className="font-serif font-normal italic text-muted text-lg">7-day view</em>
      </PageHeading>

      <div className="card">
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Add a daily habit (e.g. Meditate, Read, Drink water)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            className="btn-primary"
            onClick={handleAdd}
            disabled={createHabit.isPending}
          >
            {createHabit.isPending ? <Spinner className="w-4 h-4" /> : '+ Add Habit'}
          </button>
        </div>

        {/* Column headers */}
        {habits.length > 0 && (
          <div className="flex items-center gap-3 mt-5 mb-2 pr-7">
            <div className="flex-1" />
            <div className="flex gap-1">
              {days.map((day) => (
                <div
                  key={day}
                  className={cn(
                    'w-8 text-center text-[0.6rem] font-medium',
                    day === todayStr ? 'text-accent' : 'text-muted2'
                  )}
                >
                  {dowInitial(day)}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2.5 mt-1">
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : habits.length === 0 ? (
            <Empty>No habits tracked yet — add one above!</Empty>
          ) : (
            habits.map((habit) => {
              const checksSet = new Set(habit.checks)
              const streak    = habitStreak(habit.checks)

              return (
                <div
                  key={habit.id}
                  className="flex items-center gap-3 px-4 py-3 bg-cream border border-border rounded-xl"
                >
                  <span className="flex-1 text-sm text-text1">{habit.name}</span>

                  {streak > 0 && (
                    <span className="text-xs text-warm font-semibold shrink-0">
                      🔥 {streak}d
                    </span>
                  )}

                  <div className="flex gap-1">
                    {days.map((day) => {
                      const checked = checksSet.has(day)
                      const isToday = day === todayStr
                      return (
                        <button
                          key={day}
                          title={day}
                          onClick={() =>
                            toggleCheck.mutate({ id: habit.id, date: day, checked: !checked })
                          }
                          className={cn(
                            'w-8 h-8 rounded-lg border text-xs transition-all flex items-center justify-center',
                            checked
                              ? 'bg-sage border-green text-green'
                              : isToday
                              ? 'bg-peach border-border2 hover:border-steel'
                              : 'bg-surface border-border hover:border-steel'
                          )}
                        >
                          {checked ? '✓' : ''}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    onClick={() => deleteHabit.mutate(habit.id)}
                    className="text-muted2 hover:text-warm text-xs px-1 transition-colors shrink-0"
                  >
                    ✕
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
