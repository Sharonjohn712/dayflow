// Decides which browser origins may call the API.
//   ALLOWED_ORIGIN          comma-separated exact origins (default: local Vite dev server)
//   ALLOWED_ORIGIN_PATTERN  optional regex matched against the whole origin, for
//                           per-PR Vercel preview URLs on the staging backend, e.g.
//                           https://dayflow-[a-z0-9-]+-myteam\.vercel\.app
export function originMatcher(env: { ALLOWED_ORIGIN?: string; ALLOWED_ORIGIN_PATTERN?: string }) {
  const exact = (env.ALLOWED_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  const pattern = env.ALLOWED_ORIGIN_PATTERN
    ? new RegExp(`^(?:${env.ALLOWED_ORIGIN_PATTERN})$`)
    : null

  return (origin: string): string | null =>
    exact.includes(origin) || pattern?.test(origin) ? origin : null
}
