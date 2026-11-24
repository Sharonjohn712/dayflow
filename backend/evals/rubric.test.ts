import { describe, expect, it } from 'vitest'
import type { Fixture } from './fixtures.js'
import { scoreReviewHeuristic } from './rubric.js'

const fixture: Fixture = {
  id: 'test-day',
  label: 'Test day',
  expected_keywords: ['focus', 'momentum'],
  expected_tone: 'celebratory',
  input: { tasks: [], goals: [], habits: [], journalText: null },
}

const strongReview = `What a great day — you kept your focus and built real momentum.
You should be proud of the strong work on the planning doc.
Tomorrow, try to focus on the weekend trip first thing.
SCORE: 88`

describe('scoreReviewHeuristic', () => {
  it('gives a full score to a review that hits every check', () => {
    const s = scoreReviewHeuristic(strongReview, fixture)
    expect(s.accuracy).toBe(5)
    expect(s.tone).toBe(5)
    expect(s.actionability).toBe(5)
    expect(s.has_score_line).toBe(true)
    expect(s.total).toBe(5)
    expect(s.notes).toEqual([])
  })

  it('scores accuracy by the share of expected keywords present', () => {
    const s = scoreReviewHeuristic('You kept your focus.\nSCORE: 70', fixture)
    expect(s.accuracy).toBe(2.5)
    expect(s.notes).toContain('Missing keywords: momentum')
  })

  it('fails structure when SCORE is not the last line', () => {
    const s = scoreReviewHeuristic('SCORE: 80\nThen some trailing text', fixture)
    expect(s.has_score_line).toBe(false)
    expect(s.notes).toContain('Missing SCORE: [0-100] final line')
  })

  it('flags a tone mismatch when no tone cues appear', () => {
    const s = scoreReviewHeuristic('You kept your focus.\nSCORE: 50', fixture)
    expect(s.tone).toBe(0)
    expect(s.notes.some((n) => n.startsWith('Tone mismatch'))).toBe(true)
  })

  it('gives neutral fixtures a fixed middle tone score', () => {
    const s = scoreReviewHeuristic(strongReview, { ...fixture, expected_tone: 'neutral' })
    expect(s.tone).toBe(3)
  })

  it('splits actionability between a forward reference and a specific verb', () => {
    expect(scoreReviewHeuristic('Tomorrow is new.\nSCORE: 1', fixture).actionability).toBe(2.5)
    expect(scoreReviewHeuristic('Try a walk.\nSCORE: 1', fixture).actionability).toBe(2.5)
    expect(scoreReviewHeuristic('Nice.\nSCORE: 1', fixture).actionability).toBe(0)
  })

  it('weights the total 50/25/25', () => {
    // accuracy 2.5 (1 of 2 keywords), tone 0 (no celebratory cues), actionability 5
    const s = scoreReviewHeuristic('Keep your focus. Tomorrow, try again.\nSCORE: 60', fixture)
    expect([s.accuracy, s.tone, s.actionability]).toEqual([2.5, 0, 5])
    expect(s.total).toBeCloseTo(2.5 * 0.5 + 0 * 0.25 + 5 * 0.25)
  })
})
