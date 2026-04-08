import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { tasksApi, goalsApi, habitsApi, journalApi, aiApi } from '../lib/api'
import type { Task, Goal, Habit, Category } from '../types'

// ── Tasks ─────────────────────────────────────────────────────────────────────
export function useTasks() {
  return useQuery({ queryKey: ['tasks'], queryFn: tasksApi.list })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { text: string; category: Category; dueTime?: string | null }) =>
      tasksApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; done?: boolean; text?: string; category?: Category; dueTime?: string | null }) =>
      tasksApi.update(id, data),
    // Optimistic update for snappy checkbox toggling
    onMutate: async ({ id, done }) => {
      if (done === undefined) return
      await qc.cancelQueries({ queryKey: ['tasks'] })
      const prev = qc.getQueryData<Task[]>(['tasks'])
      qc.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map((t) => (t.id === id ? { ...t, done } : t))
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['tasks'], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useClearDoneTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tasksApi.clearDone,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

// ── Goals ─────────────────────────────────────────────────────────────────────
export function useGoals() {
  return useQuery({ queryKey: ['goals'], queryFn: goalsApi.list })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => goalsApi.create(text),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; progress?: number; text?: string }) =>
      goalsApi.update(id, data),
    onMutate: async ({ id, progress }) => {
      if (progress === undefined) return
      await qc.cancelQueries({ queryKey: ['goals'] })
      const prev = qc.getQueryData<Goal[]>(['goals'])
      qc.setQueryData<Goal[]>(['goals'], (old) =>
        old?.map((g) => (g.id === id ? { ...g, progress } : g))
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['goals'], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => goalsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

// ── Habits ────────────────────────────────────────────────────────────────────
export function useHabits() {
  return useQuery({ queryKey: ['habits'], queryFn: habitsApi.list })
}

export function useCreateHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => habitsApi.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}

export function useToggleHabitCheck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, date, checked }: { id: string; date: string; checked: boolean }) =>
      habitsApi.check(id, date, checked),
    // Optimistic update
    onMutate: async ({ id, date, checked }) => {
      await qc.cancelQueries({ queryKey: ['habits'] })
      const prev = qc.getQueryData<Habit[]>(['habits'])
      qc.setQueryData<Habit[]>(['habits'], (old) =>
        old?.map((h) => {
          if (h.id !== id) return h
          const checks = checked
            ? [...new Set([...h.checks, date])]
            : h.checks.filter((d) => d !== date)
          return { ...h, checks }
        })
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['habits'], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}

export function useDeleteHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => habitsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}

// ── Journal ───────────────────────────────────────────────────────────────────
export function useJournal() {
  return useQuery({ queryKey: ['journal'], queryFn: journalApi.list })
}

export function useCreateJournalEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ text, mood }: { text: string; mood: string | null }) =>
      journalApi.create(text, mood),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal'] }),
  })
}

export function useDeleteJournalEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => journalApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal'] }),
  })
}

// ── AI Suggestions ────────────────────────────────────────────────────────────
export function useAISuggestions() {
  return useQuery({
    queryKey: ['ai-suggestions'],
    queryFn:  aiApi.suggestions,
    staleTime: 1000 * 60 * 30, // refresh every 30 min
    retry: false,
  })
}
