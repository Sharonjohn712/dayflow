import { beforeEach, describe, expect, it, vi } from 'vitest'

const create = vi.fn()
vi.mock('./prisma.js', () => ({ prisma: { llmEvent: { create } } }))

const { calcCostUsd, recordLlmEvent } = await import('./metrics.js')

describe('calcCostUsd', () => {
  it('prices llama-3.3-70b per million tokens', () => {
    expect(calcCostUsd('llama-3.3-70b-versatile', 1_000_000, 0)).toBeCloseTo(0.59)
    expect(calcCostUsd('llama-3.3-70b-versatile', 0, 1_000_000)).toBeCloseTo(0.79)
    expect(calcCostUsd('llama-3.3-70b-versatile', 1000, 500)).toBeCloseTo(0.000985)
  })

  it('returns 0 for an unknown model instead of throwing', () => {
    expect(calcCostUsd('some-new-model', 1000, 1000)).toBe(0)
  })

  it('returns 0 for zero tokens', () => {
    expect(calcCostUsd('llama-3.3-70b-versatile', 0, 0)).toBe(0)
  })
})

describe('recordLlmEvent', () => {
  beforeEach(() => create.mockReset())

  it('writes one row with the computed cost and defaults', async () => {
    await recordLlmEvent({
      userId: 'user_1',
      endpoint: 'review',
      model: 'llama-3.3-70b-versatile',
      inputTokens: 1000,
      outputTokens: 500,
      ttftMs: 120,
      totalMs: 900,
    })

    expect(create).toHaveBeenCalledTimes(1)
    const { data } = create.mock.calls[0][0]
    expect(data).toMatchObject({
      userId: 'user_1',
      endpoint: 'review',
      inputTokens: 1000,
      outputTokens: 500,
      ttftMs: 120,
      totalMs: 900,
      cached: false,
      error: null,
    })
    expect(data.costUsd).toBeCloseTo(0.000985)
  })

  it('records the error message when a call failed', async () => {
    await recordLlmEvent({
      userId: 'user_1',
      endpoint: 'suggestions',
      model: 'llama-3.3-70b-versatile',
      inputTokens: 0,
      outputTokens: 0,
      ttftMs: null,
      totalMs: 50,
      error: '503 Service Unavailable',
    })
    expect(create.mock.calls[0][0].data.error).toBe('503 Service Unavailable')
  })
})
