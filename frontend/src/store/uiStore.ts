import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NavView, TaskFilter, TaskSort } from '../types'

interface UIState {
  // Navigation
  activeView: NavView
  setView: (v: NavView) => void

  // Task filters & sorting
  taskFilter: TaskFilter
  taskSort:   TaskSort
  setTaskFilter: (f: TaskFilter) => void
  setTaskSort:   (s: TaskSort)   => void

  // User preferences (persisted)
  userName: string
  setUserName: (n: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeView:  'overview',
      setView:     (activeView) => set({ activeView }),

      taskFilter:    'all',
      taskSort:      'added',
      setTaskFilter: (taskFilter) => set({ taskFilter }),
      setTaskSort:   (taskSort)   => set({ taskSort }),

      userName:    '',
      setUserName: (userName) => set({ userName }),
    }),
    {
      name:    'dayflow-ui',
      partialize: (s) => ({ userName: s.userName }), // only persist userName
    }
  )
)
