import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Live contract tests hit a deployed API; they have their own config.
    exclude: [...configDefaults.exclude, 'contract/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts', 'evals/rubric.ts'],
      exclude: [
        '**/*.test.ts',
        'src/test/**',
        'src/generated/**', // Prisma client, generated
        // Wiring only: starts the server, loads .env, builds the Prisma client.
        'src/index.ts',
        'src/env.ts',
        'src/lib/prisma.ts',
      ],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 90,
      },
    },
  },
})
