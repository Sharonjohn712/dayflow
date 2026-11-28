import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Habit, Task } from '../types'
import { applyHabitCheck, bestStreak, completionPct, visibleTasks } from './tasks'

function task(id: string, over: Partial<Task> = {}): Task {
  return {
    id,
    userId: 'u',
    text: id,
    category: 'OTHER',
    dueTime: null,
    done: false,
    createdAt: '2026-03-10T08:00:00Z',
    updatedAt: '2026-03-10T08:00:00Z',
    ...over,
  }
}

const tasks: Task[] = [
  task('c', { category: 'PERSONAL', dueTime: '18:00', createdAt: '2026-03-10T10:00:00Z' }),
  task('a', { category: 'WORK', dueTime: '09:00', done: true, createdAt: '2026-03-10T08:00:00Z' }),
  task('d', { category: 'HEALTH', dueTime: null, createdAt: '2026-03-10T11:00:00Z' }),
  task('b', { category: 'WORK', dueTime: '07:30', createdAt: '2026-03-10T09:00:00Z' }),
]
const ids = (ts: Task[]) => ts.map((t) => t.id)

describe('visibleTasks', () => {
  it('shows everything in the order added by default', () => {
    expect(ids(visibleTasks(tasks, 'all', 'added'))).toEqual(['a', 'b', 'c', 'd'])
  })

  it('filters pending and done', () => {
    expect(ids(visibleTasks(tasks, 'pending', 'added'))).toEqual(['b', 'c', 'd'])
    expect(ids(visibleTasks(tasks, 'done', 'added'))).toEqual(['a'])
  })

  it('filters by category', () => {
    expect(ids(visibleTasks(tasks, 'WORK', 'added'))).toEqual(['a', 'b'])
    expect(ids(visibleTasks(tasks, 'OTHER', 'added'))).toEqual([])
  })

  it('sorts by due time with untimed tasks last', () => {
    expect(ids(visibleTasks(tasks, 'all', 'time'))).toEqual(['b', 'a', 'c', 'd'])
  })

  it('sorts by category name', () => {
    expect(visibleTasks(tasks, 'all', 'category').map((t) => t.category)).toEqual([
      'HEALTH', 'PERSONAL', 'WORK', 'WORK',
    ])
  })

  it('does not mutate the input array', () => {
    const before = ids(tasks)
    visibleTasks(tasks, 'all', 'time')
    expect(ids(tasks)).toEqual(before)
  })
})

describe('completionPct', () => {
  it('is null with no tasks', () => {
    expect(completionPct([])).toBeNull()
  })

  it('rounds the share of done tasks', () => {
    expect(completionPct(tasks)).toBe(25)
    expect(completionPct([task('x', { done: true }), task('y'), task('z')])).toBe(33)
    expect(completionPct([task('x', { done: true })])).toBe(100)
  })
})

describe('bestStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  const habit = (id: string, checks: string[]): Habit => ({ id, name: id, createdAt: '', checks })

  it('is 0 with no habits', () => {
    expect(bestStreak([])).toBe(0)
  })

  it('takes the longest current streak across habits', () => {
    expect(bestStreak([
      habit('h1', ['2026-03-10']),
      habit('h2', ['2026-03-10', '2026-03-09', '2026-03-08']),
      habit('h3', ['2026-03-09']),
    ])).toBe(3)
  })
})

describe('applyHabitCheck', () => {
  const habits: Habit[] = [
    { id: 'h1', name: 'Meditate', createdAt: '', checks: ['2026-03-09'] },
    { id: 'h2', name: 'Water', createdAt: '', checks: [] },
  ]

  it('adds the date to the matching habit only', () => {
    const out = applyHabitCheck(habits, 'h1', '2026-03-10', true)
    expect(out[0].checks).toEqual(['2026-03-09', '2026-03-10'])
    expect(out[1]).toBe(habits[1])
  })

  it('does not duplicate an already-checked date', () => {
    expect(applyHabitCheck(habits, 'h1', '2026-03-09', true)[0].checks).toEqual(['2026-03-09'])
  })

  it('removes the date when unchecking', () => {
    expect(applyHabitCheck(habits, 'h1', '2026-03-09', false)[0].checks).toEqual([])
  })

  it('leaves the original list untouched', () => {
    applyHabitCheck(habits, 'h1', '2026-03-10', true)
    expect(habits[0].checks).toEqual(['2026-03-09'])
  })
})
