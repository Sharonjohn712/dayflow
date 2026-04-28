import { prisma } from './prisma.js'

// Pricing in USD per 1M tokens. Update when Groq changes pricing.
// Source: https://groq.com/pricing
const PRICING: Record<string, { input: number; output: number }> = {
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
}

export function calcCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? { input: 0, output: 0 }
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000
}

export type LlmEventInput = {
  userId: string
  endpoint: string
  model: string
  inputTokens: number
  outputTokens: number
  ttftMs: number | null
  totalMs: number
  cached?: boolean
  error?: string | null
}

export async function recordLlmEvent(e: LlmEventInput): Promise<void> {
  const costUsd = calcCostUsd(e.model, e.inputTokens, e.outputTokens)
  await prisma.llmEvent.create({
    data: {
      userId: e.userId,
      endpoint: e.endpoint,
      model: e.model,
      inputTokens: e.inputTokens,
      outputTokens: e.outputTokens,
      ttftMs: e.ttftMs,
      totalMs: e.totalMs,
      costUsd,
      cached: e.cached ?? false,
      error: e.error ?? null,
    },
  })
}
