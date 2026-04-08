import { useTasks, useGoals, useHabits, useJournal } from '../../hooks'
import { PageHeading, ProgressBar, Empty } from '../ui'
import { greeting, habitStreak, formatDate } from '../../lib/utils'
import { useUIStore } from '../../store/uiStore'

export function Overview() {
  const { userName } = useUIStore()
  const { data: tasks    = [] } = useTasks()
  const { data: goals    = [] } = useGoals()
  const { data: habits   = [] } = useHabits()
  const { data: journals = [] } = useJournal()

  const done  = tasks.filter((t) => t.done).length
  const total = tasks.length
  const pct   = total ? Math.round((done / total) * 100) : null

  const bestStreak = habits.length
    ? Math.max(...habits.map((h) => habitStreak(h.checks)))
    : 0

  const workTasks     = tasks.filter((t) => t.category === 'WORK')
  const healthTasks   = tasks.filter((t) => t.category === 'HEALTH')
  const personalTasks = tasks.filter((t) => t.category === 'PERSONAL')

  const catPct = (arr: typeof tasks) =>
    arr.length ? Math.round(arr.filter((t) => t.done).length / arr.length * 100) : 0

  return (
    <>
      <PageHeading>
        {greeting(userName)} <em className="font-serif font-normal italic text-muted text-lg">Here's your snapshot</em>
      </PageHeading>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard color="bg-peach border-yellow-300" label="Tasks Done"     value={String(done)}                sub={`of ${total} total`} />
        <StatCard color="bg-mist  border-teal-200"   label="Completion"     value={pct !== null ? `${pct}%` : '—'} sub="today's rate" />
        <StatCard color="bg-sage  border-teal-300"   label="Active Goals"   value={String(goals.length)}        sub="being tracked" />
        <StatCard color="bg-blush border-orange-200" label="Habit Streak"   value={String(bestStreak)}          sub="best today 🔥" />
      </div>

      {/* Two-col lower row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Task breakdown */}
        <div className="card">
          <div className="card-title">
            📋 Task Breakdown
            <span className="badge">{total} tasks</span>
          </div>
          <CatRow label="Work"     pct={catPct(workTasks)}     color="#82B2C0" />
          <CatRow label="Health"   pct={catPct(healthTasks)}   color="#4e9280" />
          <CatRow label="Personal" pct={catPct(personalTasks)} color="#b8813c" />
        </div>

        {/* Goals snapshot */}
        <div className="card">
          <div className="card-title">🎯 Goals Snapshot</div>
          {goals.length === 0 ? (
            <Empty>No goals set yet.</Empty>
          ) : (
            goals.slice(0, 3).map((g) => (
              <div key={g.id} className="mb-3">
                <p className="text-sm text-text2 mb-1.5 truncate">
                  {g.text.length > 44 ? g.text.slice(0, 44) + '…' : g.text}
                </p>
                <ProgressBar value={g.progress} color={g.progress >= 100 ? '#4e9280' : '#82B2C0'} height={6} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Latest journal */}
      <div className="card">
        <div className="card-title">📝 Latest Journal Entry</div>
        {journals.length === 0 ? (
          <Empty>Nothing written yet — start your journal!</Empty>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-accent font-semibold uppercase tracking-wide">
                {formatDate(journals[0].createdAt)}
              </span>
              {journals[0].mood && <span className="text-lg">{journals[0].mood}</span>}
            </div>
            <p className="text-sm text-text2 leading-relaxed">
              {journals[0].text.length > 240
                ? journals[0].text.slice(0, 240) + '…'
                : journals[0].text}
            </p>
          </div>
        )}
      </div>
    </>
  )
}

function StatCard({
  label, value, sub, color,
}: {
  label: string; value: string; sub: string; color: string
}) {
  return (
    <div className={`rounded-2xl p-4 border flex flex-col gap-1 hover:-translate-y-0.5 transition-transform ${color}`}>
      <p className="text-[0.68rem] uppercase tracking-widest text-text2 font-medium">{label}</p>
      <p className="font-serif text-4xl font-semibold text-text1 leading-none">{value}</p>
      <p className="text-xs text-text2">{sub}</p>
    </div>
  )
}

function CatRow({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-2.5">
      <span className="text-xs text-text2 w-16 font-medium">{label}</span>
      <div className="flex-1">
        <ProgressBar value={pct} color={color} height={8} />
      </div>
      <span className="text-xs text-muted w-8 text-right">{pct}%</span>
    </div>
  )
}
