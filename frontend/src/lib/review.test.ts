import { describe, expect, it } from 'vitest'
import { parseReview } from './review'

describe('parseReview', () => {
  it('splits the prose from the trailing score line', () => {
    expect(parseReview('Great day, Sam.\n\nKeep it up tomorrow.\nSCORE: 82')).toEqual({
      text: 'Great day, Sam.\n\nKeep it up tomorrow.',
      score: 82,
    })
  })

  it('is case-insensitive and tolerates missing whitespace', () => {
    expect(parseReview('Nice.\nscore:75').score).toBe(75)
  })

  it('returns a null score when the model omits the line', () => {
    expect(parseReview('A review with no score.')).toEqual({
      text: 'A review with no score.',
      score: null,
    })
  })

  it('handles a partial stream that has not reached the score yet', () => {
    expect(parseReview('Overall a solid')).toEqual({ text: 'Overall a solid', score: null })
    expect(parseReview('Overall a solid day.\nSCORE:')).toEqual({
      text: 'Overall a solid day.\nSCORE:',
      score: null,
    })
  })

  it('returns empty text for an empty stream', () => {
    expect(parseReview('')).toEqual({ text: '', score: null })
  })
})
