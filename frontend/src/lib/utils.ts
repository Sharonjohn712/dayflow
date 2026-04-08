import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 6 + i)
    return d.toISOString().slice(0, 10)
  })
}

export function habitStreak(checks: string[]): number {
  const checkSet = new Set(checks)
  let streak = 0
  const d = new Date()
  while (true) {
    const key = d.toISOString().slice(0, 10)
    if (!checkSet.has(key)) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export function greeting(name?: string): string {
  const h = new Date().getHours()
  const n = name ? `, ${name}` : ''
  if (h < 12) return `Good morning${n} 🌅`
  if (h < 17) return `Good afternoon${n} ☀️`
  return `Good evening${n} 🌙`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
    hour:    '2-digit',
    minute:  '2-digit',
  })
}

// Day-of-week initial for habit tracker header
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
export function dowInitial(dateStr: string): string {
  return DOW[new Date(dateStr + 'T12:00:00').getDay()]
}
