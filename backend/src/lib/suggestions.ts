// Parses the model's reply to the task-suggestions prompt.
// The model is asked for a bare JSON array of 6 strings, but may wrap it in
// code fences or return something else entirely, so anything that isn't an
// array is treated as "no suggestions" and non-string items are dropped.
export const MAX_SUGGESTIONS = 6

export function parseSuggestions(raw: string): string[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  return parsed
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_SUGGESTIONS)
}
