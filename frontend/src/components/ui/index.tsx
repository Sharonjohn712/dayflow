import React from 'react'
import { cn } from '../../lib/utils'

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('badge', className)}>{children}</span>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center text-muted2 py-7 font-serif italic text-base">
      {children}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin text-steel', className)}
      width="20" height="20" viewBox="0 0 24 24" fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
export function ProgressBar({
  value,
  color = '#82B2C0',
  height = 8,
}: {
  value: number
  color?: string
  height?: number
}) {
  return (
    <div
      className="w-full bg-border rounded-full overflow-hidden"
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────
export function PageHeading({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-serif text-3xl font-medium text-text1 flex items-baseline gap-2 flex-wrap">
      {children}
    </h1>
  )
}

// ── Danger zone card ──────────────────────────────────────────────────────────
export function DangerZone({
  label,
  description,
  actionLabel,
  onAction,
  variant = 'ghost',
}: {
  label: string
  description: string
  actionLabel: string
  onAction: () => void
  variant?: 'ghost' | 'warm'
}) {
  return (
    <div className="border border-blush rounded-xl p-4 bg-orange-50 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-warm">{label}</p>
        <p className="text-xs text-text2 mt-0.5">{description}</p>
      </div>
      <button
        onClick={onAction}
        className={variant === 'warm' ? 'btn-warm' : 'btn-ghost'}
      >
        {actionLabel}
      </button>
    </div>
  )
}
