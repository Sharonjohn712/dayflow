import { describe, expect, it } from 'vitest'
import { buildReviewPrompt, type ReviewInput } from './review-prompt.js'

const base: ReviewInput = {
  userName: null,
  tasks: [],
  goals: [],
  habits: [],
  journalText: null,
}

describe('buildReviewPrompt', () => {
  it('reports completion counts and percentage', () => {
    const prompt = buildReviewPrompt({
      ...base,
      tasks: [
        { text: 'Ship doc', category: 'WORK', done: true },
        { text: 'Run', category: 'HEALTH', done: true },
        { text: 'Call mom', category: 'PERSONAL', done: false },
      ],
    })
    expect(prompt).toContain('Tasks: 2/3 done (67%)')
    expect(prompt).toContain('Completed: [WORK] Ship doc, [HEALTH] Run')
    expect(prompt).toContain('Pending: [PERSONAL] Call mom')
  })

  it('handles an empty day without dividing by zero', () => {
    const prompt = buildReviewPrompt(base)
    expect(prompt).toContain('Tasks: 0/0 done (0%)')
    expect(prompt).toContain('Completed: none')
    expect(prompt).toContain('Pending: none')
    expect(prompt).toContain('Goals: none')
    expect(prompt).toContain('Habits: none tracked')
    expect(prompt).toContain('Latest journal: no entry')
  })

  it('includes goals, habits and the journal entry', () => {
    const prompt = buildReviewPrompt({
      ...base,
      goals: [{ text: 'Half-marathon', progress: 60 }],
      habits: [
        { name: 'Meditate', doneToday: true },
        { name: 'Water', doneToday: false },
      ],
      journalText: 'Felt focused.',
    })
    expect(prompt).toContain('Goals: "Half-marathon" (60%)')
    expect(prompt).toContain('Habits: Meditate: done; Water: not done')
    expect(prompt).toContain('Latest journal: Felt focused.')
  })

  it('addresses the user by name only when a name is given', () => {
    const named = buildReviewPrompt({ ...base, userName: 'Sam' })
    expect(named).toContain('Their name is Sam.')
    expect(named).toContain('Address Sam by name at least once.')

    const anonymous = buildReviewPrompt(base)
    expect(anonymous).not.toContain('Their name is')
    expect(anonymous).not.toContain('by name')
  })

  it('always ends with the SCORE instruction the frontend parses', () => {
    const prompt = buildReviewPrompt(base)
    expect(prompt.trim().split('\n').at(-1)).toBe('Final line must be: SCORE: [0-100]')
  })
})
