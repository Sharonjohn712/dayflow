// Splits the streamed day review into prose and the trailing "SCORE: N" line.
export function parseReview(raw: string): { text: string; score: number | null } {
  const m = raw.match(/SCORE:\s*(\d+)/i)
  const score = m ? Number(m[1]) : null
  const text  = raw.replace(/SCORE:\s*\d+/i, '').trim()
  return { text, score }
}
