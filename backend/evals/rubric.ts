import type { Fixture } from './fixtures.js'

export type ReviewScore = {
  accuracy: number       // 0-5: review mentions expected keywords
  tone: number           // 0-5: tone matches expected
  actionability: number  // 0-5: tomorrow advice is specific
  has_score_line: boolean
  total: number          // weighted
  notes: string[]
}

const TONE_WORDS: Record<string, string[]> = {
  celebratory: ['great', 'wonderful', 'crushed', 'momentum', 'win', 'proud', 'strong', 'impressive'],
  compassionate: ['gentle', 'rest', 'kind', 'okay', 'tough', 'tomorrow', 'recover', 'compassion'],
  motivating: ['tomorrow', 'forward', 'next', 'try', 'consider', 'start', 'momentum'],
  neutral: [],
}

// Heuristic-only rubric. Cheap, deterministic, runs without an LLM judge.
// Upgrade path: add an LLM-judge variant in `judge.ts` for nuanced cases.
export function scoreReviewHeuristic(review: string, fixture: Fixture): ReviewScore {
  const r = review.toLowerCase()
  const notes: string[] = []

  // accuracy: how many expected_keywords are present
  const matched = fixture.expected_keywords.filter((k) => r.includes(k.toLowerCase()))
  const accuracy = fixture.expected_keywords.length === 0
    ? 5
    : (matched.length / fixture.expected_keywords.length) * 5
  if (matched.length < fixture.expected_keywords.length) {
    const missing = fixture.expected_keywords.filter((k) => !matched.includes(k))
    notes.push(`Missing keywords: ${missing.join(', ')}`)
  }

  // structure: final non-empty line is "SCORE: [0-100]"
  const lines = review.trim().split('\n').filter((l) => l.trim())
  const lastLine = lines[lines.length - 1] ?? ''
  const has_score_line = /SCORE:\s*\d{1,3}\b/.test(lastLine)
  if (!has_score_line) notes.push('Missing SCORE: [0-100] final line')

  // tone: keyword presence for the expected tone
  const expectedToneWords = TONE_WORDS[fixture.expected_tone] ?? []
  const toneMatches = expectedToneWords.filter((w) => r.includes(w))
  const tone =
    expectedToneWords.length === 0
      ? 3
      : Math.min(5, (toneMatches.length / Math.min(3, expectedToneWords.length)) * 5)
  if (expectedToneWords.length > 0 && toneMatches.length === 0) {
    notes.push(`Tone mismatch: expected ${fixture.expected_tone}, no matching cues`)
  }

  // actionability: explicit "tomorrow" + a specific verb
  const hasTomorrow = /\b(tomorrow|next)\b/i.test(review)
  const hasSpecificVerb = /\b(try|consider|focus on|start|aim|prioriti[sz]e|pick|choose)\b/i.test(review)
  const actionability = (hasTomorrow ? 2.5 : 0) + (hasSpecificVerb ? 2.5 : 0)
  if (!hasTomorrow) notes.push('No forward-looking "tomorrow/next" reference')
  if (!hasSpecificVerb) notes.push('No specific actionable verb')

  // weighted total
  const total = accuracy * 0.5 + tone * 0.25 + actionability * 0.25

  return { accuracy, tone, actionability, has_score_line, total, notes }
}
