// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Goal, Habit, Task } from '../types'

vi.mock('../lib/api', () => ({
  tasksApi:   { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), clearDone: vi.fn() },
  goalsApi:   { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  habitsApi:  { list: vi.fn(), create: vi.fn(), check: vi.fn(), delete: vi.fn() },
  journalApi: { list: vi.fn(), create: vi.fn(), delete: vi.fn() },
  aiApi:      { suggestions: vi.fn() },
}))

const api = await import('../lib/api')
const hooks = await import('./index')

let qc: QueryClient
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
const render = <T,>(hook: () => T) => renderHook(hook, { wrapper }).result

// The parametrised tables mix hooks with different data/variable types.
type QueryLike = { isSuccess: boolean; isError: boolean; data: unknown }
type MutationLike = { mutateAsync: (vars: unknown) => Promise<unknown> }

beforeEach(() => {
  vi.clearAllMocks()
  qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
})
afterEach(() => qc.clear())

const task = (id: string, done = false): Task =>
  ({ id, userId: 'u', text: id, category: 'OTHER', dueTime: null, done, createdAt: '', updatedAt: '' })
const goal = (id: string, progress = 0): Goal =>
  ({ id, userId: 'u', text: id, progress, createdAt: '', updatedAt: '' })
const habit = (id: string, checks: string[] = []): Habit => ({ id, name: id, createdAt: '', checks })

describe('queries', () => {
  it.each([
    ['useTasks', () => hooks.useTasks(), api.tasksApi.list, ['tasks']],
    ['useGoals', () => hooks.useGoals(), api.goalsApi.list, ['goals']],
    ['useHabits', () => hooks.useHabits(), api.habitsApi.list, ['habits']],
    ['useJournal', () => hooks.useJournal(), api.journalApi.list, ['journal']],
    ['useAISuggestions', () => hooks.useAISuggestions(), api.aiApi.suggestions, ['ai-suggestions']],
  ] as const)('%s loads from the API and caches under %j', async (_n, hook, fetcher, key) => {
    vi.mocked(fetcher).mockResolvedValue([{ id: 'x' }] as never)
    const result = render(hook as unknown as () => QueryLike)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 'x' }])
    expect(qc.getQueryData(key as unknown as string[])).toEqual([{ id: 'x' }])
  })

  it('useAISuggestions does not retry a failed call', async () => {
    vi.mocked(api.aiApi.suggestions).mockRejectedValue(new Error('down'))
    const result = render(() => hooks.useAISuggestions())
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(api.aiApi.suggestions).toHaveBeenCalledTimes(1)
  })
})

describe('simple mutations call the API and refresh their list', () => {
  it.each([
    ['useCreateTask', () => hooks.useCreateTask(), api.tasksApi.create, { text: 'Run', category: 'HEALTH' }, [{ text: 'Run', category: 'HEALTH' }], 'tasks'],
    ['useDeleteTask', () => hooks.useDeleteTask(), api.tasksApi.delete, 't1', ['t1'], 'tasks'],
    ['useClearDoneTasks', () => hooks.useClearDoneTasks(), api.tasksApi.clearDone, undefined, [], 'tasks'],
    ['useCreateGoal', () => hooks.useCreateGoal(), api.goalsApi.create, 'Read', ['Read'], 'goals'],
    ['useDeleteGoal', () => hooks.useDeleteGoal(), api.goalsApi.delete, 'g1', ['g1'], 'goals'],
    ['useCreateHabit', () => hooks.useCreateHabit(), api.habitsApi.create, 'Water', ['Water'], 'habits'],
    ['useDeleteHabit', () => hooks.useDeleteHabit(), api.habitsApi.delete, 'h1', ['h1'], 'habits'],
    ['useCreateJournalEntry', () => hooks.useCreateJournalEntry(), api.journalApi.create, { text: 'Hi', mood: '😊' }, ['Hi', '😊'], 'journal'],
    ['useDeleteJournalEntry', () => hooks.useDeleteJournalEntry(), api.journalApi.delete, 'j1', ['j1'], 'journal'],
  ] as const)('%s', async (_n, hook, apiFn, vars, expectedArgs, key) => {
    vi.mocked(apiFn).mockResolvedValue({ ok: true } as never)
    const invalidate = vi.spyOn(qc, 'invalidateQueries')
    const result = render(hook as unknown as () => MutationLike)

    await act(() => result.current.mutateAsync(vars))

    expect(vi.mocked(apiFn).mock.calls[0].slice(0, expectedArgs.length)).toEqual(expectedArgs)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [key] })
  })
})

describe('useUpdateTask (optimistic)', () => {
  beforeEach(() => qc.setQueryData(['tasks'], [task('t1'), task('t2')]))

  it('ticks the task immediately, before the server answers', async () => {
    let resolve!: (v: unknown) => void
    vi.mocked(api.tasksApi.update).mockReturnValue(new Promise((r) => { resolve = r }) as never)
    const result = render(() => hooks.useUpdateTask())

    act(() => result.current.mutate({ id: 't1', done: true }))
    await waitFor(() =>
      expect(qc.getQueryData<Task[]>(['tasks'])?.find((t) => t.id === 't1')?.done).toBe(true))
    expect(api.tasksApi.update).toHaveBeenCalledWith('t1', { done: true })
    resolve(task('t1', true))
  })

  it('rolls back when the server rejects the change', async () => {
    vi.mocked(api.tasksApi.update).mockRejectedValue(new Error('500'))
    vi.mocked(api.tasksApi.list).mockReturnValue(new Promise(() => {}) as never)
    const result = render(() => hooks.useUpdateTask())

    await act(async () => { await result.current.mutateAsync({ id: 't1', done: true }).catch(() => {}) })
    expect(qc.getQueryData<Task[]>(['tasks'])?.find((t) => t.id === 't1')?.done).toBe(false)
  })

  it('skips the optimistic step for edits other than done', async () => {
    vi.mocked(api.tasksApi.update).mockResolvedValue(task('t1') as never)
    const setData = vi.spyOn(qc, 'setQueryData')
    const result = render(() => hooks.useUpdateTask())
    await act(() => result.current.mutateAsync({ id: 't1', text: 'Renamed' }))
    expect(setData).not.toHaveBeenCalled()
  })
})

describe('useUpdateGoal (optimistic)', () => {
  beforeEach(() => qc.setQueryData(['goals'], [goal('g1', 10)]))

  it('moves the progress bar immediately', async () => {
    vi.mocked(api.goalsApi.update).mockReturnValue(new Promise(() => {}) as never)
    const result = render(() => hooks.useUpdateGoal())
    act(() => result.current.mutate({ id: 'g1', progress: 70 }))
    await waitFor(() => expect(qc.getQueryData<Goal[]>(['goals'])?.[0].progress).toBe(70))
  })

  it('rolls back on failure', async () => {
    vi.mocked(api.goalsApi.update).mockRejectedValue(new Error('500'))
    vi.mocked(api.goalsApi.list).mockReturnValue(new Promise(() => {}) as never)
    const result = render(() => hooks.useUpdateGoal())
    await act(async () => { await result.current.mutateAsync({ id: 'g1', progress: 70 }).catch(() => {}) })
    expect(qc.getQueryData<Goal[]>(['goals'])?.[0].progress).toBe(10)
  })

  it('skips the optimistic step for a rename', async () => {
    vi.mocked(api.goalsApi.update).mockResolvedValue(goal('g1') as never)
    const setData = vi.spyOn(qc, 'setQueryData')
    const result = render(() => hooks.useUpdateGoal())
    await act(() => result.current.mutateAsync({ id: 'g1', text: 'New' }))
    expect(setData).not.toHaveBeenCalled()
  })
})

describe('useToggleHabitCheck (optimistic)', () => {
  beforeEach(() => qc.setQueryData(['habits'], [habit('h1', ['2026-03-09'])]))

  it('adds the day immediately and calls the API', async () => {
    vi.mocked(api.habitsApi.check).mockReturnValue(new Promise(() => {}) as never)
    const result = render(() => hooks.useToggleHabitCheck())
    act(() => result.current.mutate({ id: 'h1', date: '2026-03-10', checked: true }))
    await waitFor(() =>
      expect(qc.getQueryData<Habit[]>(['habits'])?.[0].checks).toEqual(['2026-03-09', '2026-03-10']))
    expect(api.habitsApi.check).toHaveBeenCalledWith('h1', '2026-03-10', true)
  })

  it('rolls back on failure', async () => {
    vi.mocked(api.habitsApi.check).mockRejectedValue(new Error('500'))
    vi.mocked(api.habitsApi.list).mockReturnValue(new Promise(() => {}) as never)
    const result = render(() => hooks.useToggleHabitCheck())
    await act(async () => {
      await result.current.mutateAsync({ id: 'h1', date: '2026-03-10', checked: true }).catch(() => {})
    })
    expect(qc.getQueryData<Habit[]>(['habits'])?.[0].checks).toEqual(['2026-03-09'])
  })

  it('does nothing to the cache when habits are not loaded yet', async () => {
    qc.removeQueries({ queryKey: ['habits'] })
    vi.mocked(api.habitsApi.check).mockResolvedValue({ ok: true } as never)
    vi.mocked(api.habitsApi.list).mockReturnValue(new Promise(() => {}) as never)
    const result = render(() => hooks.useToggleHabitCheck())
    await act(() => result.current.mutateAsync({ id: 'h1', date: '2026-03-10', checked: true }))
    expect(qc.getQueryData(['habits'])).toBeUndefined()
  })
})
