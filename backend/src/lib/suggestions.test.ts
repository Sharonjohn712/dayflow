import { describe, expect, it } from 'vitest'
import { MAX_SUGGESTIONS, parseSuggestions } from './suggestions.js'

describe('parseSuggestions', () => {
  it('parses a bare JSON array of strings', () => {
    expect(parseSuggestions('["Reply to emails","10-min walk"]')).toEqual([
      'Reply to emails',
      '10-min walk',
    ])
  })

  it('strips markdown code fences around the JSON', () => {
    const raw = '```json\n["Review calendar","Stretch"]\n```'
    expect(parseSuggestions(raw)).toEqual(['Review calendar', 'Stretch'])
  })

  it('returns [] for text that is not JSON', () => {
    expect(parseSuggestions('Sure! Here are some ideas: walk, read')).toEqual([])
    expect(parseSuggestions('')).toEqual([])
  })

  it('returns [] when the JSON is not an array', () => {
    expect(parseSuggestions('{"suggestions":["a","b"]}')).toEqual([])
    expect(parseSuggestions('"just a string"')).toEqual([])
    expect(parseSuggestions('null')).toEqual([])
  })

  it('drops non-string and blank items', () => {
    expect(parseSuggestions('["Walk", 42, null, {"a":1}, "  ", " Read "]')).toEqual([
      'Walk',
      'Read',
    ])
  })

  it(`caps the list at ${MAX_SUGGESTIONS} items`, () => {
    const many = JSON.stringify(Array.from({ length: 10 }, (_, i) => `Task ${i}`))
    expect(parseSuggestions(many)).toHaveLength(MAX_SUGGESTIONS)
  })
})
