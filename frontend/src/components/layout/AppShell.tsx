import { useUIStore } from '../../store/uiStore'
import { useTasks } from '../../hooks'
import { useUser, UserButton } from '@clerk/clerk-react'
import type { NavView } from '../../types'
import { cn } from '../../lib/utils'

const NAV_ITEMS: { view: NavView; icon: string; label: string }[] = [
  { view: 'overview', icon: '🏠', label: 'Overview'  },
  { view: 'planner',  icon: '✅', label: 'Planner'   },
  { view: 'goals',    icon: '🎯', label: 'Goals'     },
  { view: 'habits',   icon: '🔥', label: 'Habits'    },
  { view: 'review',   icon: '✦',  label: 'AI Review' },
  { view: 'journal',  icon: '📓', label: 'Journal'   },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { activeView, setView } = useUIStore()
  const { data: tasks } = useTasks()
  const { user } = useUser()

  const pendingCount = tasks?.filter((t) => !t.done).length ?? 0

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface border-b border-border shadow-sm px-7 py-3 flex items-center justify-between">
        <div className="font-serif text-2xl font-semibold text-text1 flex items-baseline gap-2">
          <span>☀️</span>
          Dayflow
          <em className="font-normal not-italic text-muted text-base">your AI daily companion</em>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-peach border border-border rounded-full px-4 py-1 text-xs text-text2 font-medium hidden sm:block">
            {dateStr}
          </span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <nav className="w-52 bg-surface border-r border-border flex flex-col py-6 shrink-0">
          <p className="text-[0.63rem] uppercase tracking-widest text-muted2 px-5 pb-2">Navigate</p>
          {NAV_ITEMS.map(({ view, icon, label }) => (
            <button
              key={view}
              onClick={() => setView(view)}
              className={cn(
                'flex items-center gap-2.5 px-5 py-2.5 text-sm cursor-pointer transition-all border-l-[3px] text-left w-full',
                activeView === view
                  ? 'bg-mist text-accent font-medium border-steel'
                  : 'text-text2 border-transparent hover:bg-peach hover:text-text1'
              )}
            >
              <span className="w-5 text-center">{icon}</span>
              {label}
              {view === 'planner' && pendingCount > 0 && (
                <span className="ml-auto bg-warm text-white text-[0.6rem] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}

          <div className="mt-auto">
            <p className="text-[0.63rem] uppercase tracking-widest text-muted2 px-5 pb-2 mt-6">Account</p>
            <button
              onClick={() => setView('settings')}
              className={cn(
                'flex items-center gap-2.5 px-5 py-2.5 text-sm cursor-pointer transition-all border-l-[3px] text-left w-full',
                activeView === 'settings'
                  ? 'bg-mist text-accent font-medium border-steel'
                  : 'text-text2 border-transparent hover:bg-peach hover:text-text1'
              )}
            >
              <span className="w-5 text-center">⚙️</span>
              Settings
            </button>
            {user && (
              <div className="px-5 py-3 text-xs text-muted2 truncate">
                {user.firstName ?? user.emailAddresses[0]?.emailAddress}
              </div>
            )}
          </div>
        </nav>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto flex flex-col gap-5 animate-fade-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
