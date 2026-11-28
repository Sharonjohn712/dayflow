// In-memory stand-in for lib/prisma.js. Route tests mock the real module with:
//   vi.mock('../lib/prisma.js', () => import('../test/prisma-mock.js'))
// and then stub return values per test via `prisma.<model>.<method>`.
import { vi } from 'vitest'

const model = () => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  upsert: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
})

export const prisma = {
  task: model(),
  goal: model(),
  habit: model(),
  habitCheck: model(),
  journalEntry: model(),
  llmEvent: model(),
}

export function resetPrismaMock() {
  for (const m of Object.values(prisma)) {
    for (const fn of Object.values(m)) fn.mockReset()
  }
}
