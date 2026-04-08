import type { Task, Goal, Habit, JournalEntry, Category } from '../types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

// Token getter injected at app startup by Clerk
let getToken: () => Promise<string | null> = async () => null

export function setTokenGetter(fn: () => Promise<string | null>) {
  getToken = fn
}

async function headers(): Promise<Record<string, string>> {
  const token = await getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(await headers()),
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const tasksApi = {
  list: () =>
    request<Task[]>('/api/tasks'),

  create: (data: { text: string; category: Category; dueTime?: string | null }) =>
    request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Pick<Task, 'text' | 'category' | 'dueTime' | 'done'>>) =>
    request<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' }),

  clearDone: () =>
    request<{ ok: boolean }>('/api/tasks/done/all', { method: 'DELETE' }),
}

// ── Goals ─────────────────────────────────────────────────────────────────────
export const goalsApi = {
  list: () =>
    request<Goal[]>('/api/goals'),

  create: (text: string) =>
    request<Goal>('/api/goals', { method: 'POST', body: JSON.stringify({ text }) }),

  update: (id: string, data: Partial<Pick<Goal, 'text' | 'progress'>>) =>
    request<Goal>(`/api/goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/goals/${id}`, { method: 'DELETE' }),
}

// ── Habits ────────────────────────────────────────────────────────────────────
export const habitsApi = {
  list: () =>
    request<Habit[]>('/api/habits'),

  create: (name: string) =>
    request<Habit>('/api/habits', { method: 'POST', body: JSON.stringify({ name }) }),

  check: (id: string, date: string, checked: boolean) =>
    request<{ ok: boolean }>(`/api/habits/${id}/check`, {
      method: 'POST',
      body: JSON.stringify({ date, checked }),
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/habits/${id}`, { method: 'DELETE' }),
}

// ── Journal ───────────────────────────────────────────────────────────────────
export const journalApi = {
  list: () =>
    request<JournalEntry[]>('/api/journal'),

  create: (text: string, mood: string | null) =>
    request<JournalEntry>('/api/journal', {
      method: 'POST',
      body: JSON.stringify({ text, mood }),
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/journal/${id}`, { method: 'DELETE' }),
}

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiApi = {
  suggestions: () =>
    request<{ suggestions: string[] }>('/api/ai/suggestions'),

  // Returns a raw Response for streaming — caller reads the body
  reviewStream: async (userName?: string): Promise<Response> => {
    const hdrs = await headers()
    return fetch(`${BASE}/api/ai/review`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({ userName: userName ?? null }),
    })
  },
}
