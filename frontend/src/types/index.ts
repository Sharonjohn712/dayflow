export type Category = 'WORK' | 'HEALTH' | 'PERSONAL' | 'OTHER'

export interface Task {
  id:        string
  userId:    string
  text:      string
  category:  Category
  dueTime:   string | null
  done:      boolean
  createdAt: string
  updatedAt: string
}

export interface Goal {
  id:        string
  userId:    string
  text:      string
  progress:  number
  createdAt: string
  updatedAt: string
}

export interface Habit {
  id:        string
  name:      string
  createdAt: string
  checks:    string[]   // array of "YYYY-MM-DD" strings
}

export interface JournalEntry {
  id:        string
  userId:    string
  text:      string
  mood:      string | null
  createdAt: string
}

// UI helpers
export const CAT_LABELS: Record<Category, string> = {
  WORK:     '💼 Work',
  HEALTH:   '🏃 Health',
  PERSONAL: '✨ Personal',
  OTHER:    '📌 Other',
}

export const CAT_CLASS: Record<Category, string> = {
  WORK:     'cat-work',
  HEALTH:   'cat-health',
  PERSONAL: 'cat-personal',
  OTHER:    'cat-other',
}

export type TaskFilter = 'all' | 'pending' | 'done' | Category
export type TaskSort   = 'added' | 'time' | 'category'
export type NavView    = 'overview' | 'planner' | 'goals' | 'habits' | 'review' | 'journal' | 'settings'
