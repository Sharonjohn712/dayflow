import { defineConfig } from 'vitest/config'

// Live contract tests only (contract/), run against a deployed API.
// See contract/live.test.ts for the environment variables.
export default defineConfig({
  test: {
    include: ['contract/**/*.test.ts'],
    testTimeout: 90_000, // a sleeping Render service can take ~60s to answer
    hookTimeout: 90_000,
  },
})
