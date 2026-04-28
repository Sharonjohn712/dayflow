// Single source of truth for the day-review prompt.
// Imported by routes/ai.ts (production) and evals/run-evals.ts (evaluation).

export type ReviewInput = {
  userName?: string | null
  tasks: { text: string; category: string; done: boolean }[]
  goals: { text: string; progress: number }[]
  habits: { name: string; doneToday: boolean }[]
  journalText: string | null
}

export function buildReviewPrompt(input: ReviewInput): string {
  const { userName, tasks, goals, habits, journalText } = input

  const done = tasks.filter((t) => t.done).length
  const total = tasks.length
  const pct = total ? Math.round((done / total) * 100) : 0

  const habitSummary = habits
    .map((h) => `${h.name}: ${h.doneToday ? 'done' : 'not done'}`)
    .join('; ')

  const completed = tasks.filter((t) => t.done).map((t) => `[${t.category}] ${t.text}`).join(', ') || 'none'
  const pending = tasks.filter((t) => !t.done).map((t) => `[${t.category}] ${t.text}`).join(', ') || 'none'
  const goalsLine = goals.map((g) => `"${g.text}" (${g.progress}%)`).join('; ') || 'none'

  return `You are Dayflow, a warm and insightful AI productivity coach. Analyze this person's day.
${userName ? `Their name is ${userName}.` : ''}

TODAY:
- Tasks: ${done}/${total} done (${pct}%)
- Completed: ${completed}
- Pending: ${pending}
- Goals: ${goalsLine}
- Habits: ${habitSummary || 'none tracked'}
- Latest journal: ${journalText || 'no entry'}

Write a warm, concise review (3–4 paragraphs):
1. Overall verdict
2. What they did well (specific)
3. Habits & patterns
4. One motivating insight for tomorrow

Tone: warm, direct, honest. Prose only, no bullets.${userName ? ` Address ${userName} by name at least once.` : ''}
Final line must be: SCORE: [0-100]`
}
