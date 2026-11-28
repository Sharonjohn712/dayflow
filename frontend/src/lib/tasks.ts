import type { Category, Habit, Task, TaskFilter, TaskSort } from '../types'
import { habitStreak } from './utils'

const CATEGORIES: Category[] = ['WORK', 'HEALTH', 'PERSONAL', 'OTHER']

// Tasks shown in the Planner for the chosen filter and sort. Returns a new array.
export function visibleTasks(tasks: Task[], filter: TaskFilter, sort: TaskSort): Task[] {
  let out = [...tasks]
  if (filter === 'pending') out = out.filter((t) => !t.done)
  else if (filter === 'done') out = out.filter((t) => t.done)
  else if (CATEGORIES.includes(filter as Category)) out = out.filter((t) => t.category === filter)

  if (sort === 'time')
    out.sort((a, b) => (a.dueTime ?? '99:99').localeCompare(b.dueTime ?? '99:99'))
  else if (sort === 'category')
    out.sort((a, b) => a.category.localeCompare(b.category))
  else
    out.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return out
}

// Rounded % of tasks done, or null when there are no tasks.
export function completionPct(tasks: Task[]): number | null {
  if (!tasks.length) return null
  return Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100)
}

export function bestStreak(habits: Habit[]): number {
  return habits.length ? Math.max(...habits.map((h) => habitStreak(h.checks))) : 0
}

// Habit list after checking/unchecking one day (used for optimistic updates).
export function applyHabitCheck(habits: Habit[], id: string, date: string, checked: boolean): Habit[] {
  return habits.map((h) => {
    if (h.id !== id) return h
    const checks = checked
      ? [...new Set([...h.checks, date])]
      : h.checks.filter((d) => d !== date)
    return { ...h, checks }
  })
}
