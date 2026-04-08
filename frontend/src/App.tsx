import { useUIStore } from './store/uiStore'
import { AppShell } from './components/layout/AppShell'
import { Overview } from './components/overview/Overview'
import { Planner }  from './components/planner/Planner'
import { Goals }    from './components/goals/Goals'
import { Habits }   from './components/habits/Habits'
import { AIReview } from './components/review/AIReview'
import { Journal }  from './components/journal/Journal'
import { Settings } from './components/settings/Settings'

export default function App() {
  const { activeView } = useUIStore()

  const views = {
    overview: <Overview />,
    planner:  <Planner />,
    goals:    <Goals />,
    habits:   <Habits />,
    review:   <AIReview />,
    journal:  <Journal />,
    settings: <Settings />,
  }

  return (
    <AppShell>
      {views[activeView]}
    </AppShell>
  )
}
