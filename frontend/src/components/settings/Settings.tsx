import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useUIStore } from '../../store/uiStore'
import { useClearDoneTasks } from '../../hooks'
import { PageHeading, DangerZone } from '../ui'

export function Settings() {
  const { user } = useUser()
  const { userName, setUserName } = useUIStore()
  const clearDone = useClearDoneTasks()

  const [nameInput, setNameInput] = useState(userName)
  const [saved, setSaved] = useState(false)

  function handleSaveName() {
    setUserName(nameInput.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleClearDone() {
    if (window.confirm('Remove all completed tasks?')) {
      clearDone.mutate()
    }
  }

  return (
    <>
      <PageHeading>⚙️ Settings</PageHeading>

      {/* Account info */}
      {user && (
        <div className="card">
          <div className="card-title">👤 Account</div>
          <div className="flex items-center gap-4">
            {user.imageUrl && (
              <img
                src={user.imageUrl}
                alt={user.firstName ?? 'User'}
                className="w-12 h-12 rounded-full border border-border"
              />
            )}
            <div>
              <p className="text-sm font-semibold text-text1">
                {user.fullName ?? user.username ?? 'Anonymous'}
              </p>
              <p className="text-xs text-text2">
                {user.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Display name */}
      <div className="card">
        <div className="card-title">✏️ Display Name</div>
        <p className="text-xs text-text2 mb-3">
          Used in AI review greetings and the overview heading.
        </p>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Enter your first name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
          />
          <button className="btn-primary" onClick={handleSaveName}>
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Data management */}
      <div className="card">
        <div className="card-title">🗑️ Data Management</div>
        <div className="flex flex-col gap-3">
          <DangerZone
            label="Clear completed tasks"
            description="Remove all tasks that are marked as done."
            actionLabel="Clear Done"
            onAction={handleClearDone}
            variant="ghost"
          />
        </div>
      </div>

      {/* About */}
      <div className="card">
        <div className="card-title">ℹ️ About Dayflow</div>
        <div className="text-sm text-text2 leading-relaxed space-y-1">
          <p>Dayflow is your AI-powered daily planning companion.</p>
          <p className="text-xs text-muted mt-2">
            <span className="font-medium text-text2">Version</span> 2.0 &nbsp;·&nbsp;
            <span className="font-medium text-text2">AI</span> claude-sonnet-4-5 &nbsp;·&nbsp;
            <span className="font-medium text-text2">Stack</span> React · Hono · Prisma · PostgreSQL
          </p>
        </div>
      </div>
    </>
  )
}
