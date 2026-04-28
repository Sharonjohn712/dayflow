import 'dotenv/config'
import Groq from 'groq-sdk'
import fs from 'node:fs/promises'
import path from 'node:path'
import { FIXTURES, type Fixture } from './fixtures.js'
import { buildReviewPrompt } from '../src/lib/review-prompt.js'
import { scoreReviewHeuristic, type ReviewScore } from './rubric.js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
const MODEL = process.env.EVAL_MODEL ?? 'llama-3.3-70b-versatile'

type RunResult = {
  fixture: Fixture
  review: string
  score: ReviewScore
  inputTokens: number
  outputTokens: number
  ms: number
}

async function generateReview(prompt: string): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const c = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })
  return {
    text: c.choices[0]?.message?.content ?? '',
    inputTokens: c.usage?.prompt_tokens ?? 0,
    outputTokens: c.usage?.completion_tokens ?? 0,
  }
}

async function main() {
  console.log(`▶ Running evals  ·  model=${MODEL}  ·  fixtures=${FIXTURES.length}\n`)

  const results: RunResult[] = []
  for (const fixture of FIXTURES) {
    const t0 = Date.now()
    const prompt = buildReviewPrompt(fixture.input)
    const { text, inputTokens, outputTokens } = await generateReview(prompt)
    const ms = Date.now() - t0
    const score = scoreReviewHeuristic(text, fixture)
    results.push({ fixture, review: text, score, inputTokens, outputTokens, ms })
    const struct = score.has_score_line ? '✓' : '✗'
    console.log(
      `${struct} ${fixture.id.padEnd(20)} total=${score.total.toFixed(2)}/5  ` +
        `acc=${score.accuracy.toFixed(1)} tone=${score.tone.toFixed(1)} act=${score.actionability.toFixed(1)}  ${ms}ms`,
    )
  }

  const avg = results.reduce((s, r) => s + r.score.total, 0) / results.length
  const passingStructure = results.filter((r) => r.score.has_score_line).length
  const totalInput = results.reduce((s, r) => s + r.inputTokens, 0)
  const totalOutput = results.reduce((s, r) => s + r.outputTokens, 0)
  const avgMs = results.reduce((s, r) => s + r.ms, 0) / results.length

  // Pricing matches lib/metrics.ts. Update both if Groq pricing changes.
  const PRICE: Record<string, { input: number; output: number }> = {
    'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
    'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
  }
  const p = PRICE[MODEL] ?? { input: 0, output: 0 }
  const totalCost = (totalInput * p.input + totalOutput * p.output) / 1_000_000

  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const reportDir = path.join(process.cwd(), 'evals', 'results')
  const reportPath = path.join(reportDir, `${ts}.md`)
  await fs.mkdir(reportDir, { recursive: true })

  let md = `# Eval Run — ${new Date().toISOString()}\n\n`
  md += `**Model:** \`${MODEL}\`\n\n`
  md += `**Summary**\n\n`
  md += `| Metric | Value |\n|---|---|\n`
  md += `| Fixtures | ${results.length} |\n`
  md += `| Avg score | **${avg.toFixed(2)}/5** |\n`
  md += `| Structure pass rate | ${passingStructure}/${results.length} |\n`
  md += `| Avg latency | ${avgMs.toFixed(0)} ms |\n`
  md += `| Total tokens (in/out) | ${totalInput} / ${totalOutput} |\n`
  md += `| Total cost | $${totalCost.toFixed(6)} |\n\n`
  md += `## Per-fixture\n\n`
  md += `| Fixture | Total | Acc | Tone | Action | Struct | ms | Notes |\n|---|---|---|---|---|---|---|---|\n`
  for (const r of results) {
    md += `| ${r.fixture.id} | ${r.score.total.toFixed(2)} | ${r.score.accuracy.toFixed(1)} | ${r.score.tone.toFixed(1)} | ${r.score.actionability.toFixed(1)} | ${r.score.has_score_line ? '✓' : '✗'} | ${r.ms} | ${r.score.notes.join('; ') || '—'} |\n`
  }
  md += `\n## Reviews\n\n`
  for (const r of results) {
    md += `### ${r.fixture.id} — ${r.fixture.label}\n\n`
    md += `_Expected tone: ${r.fixture.expected_tone}  ·  keywords: ${r.fixture.expected_keywords.join(', ')}_\n\n`
    md += '```\n' + r.review.trim() + '\n```\n\n'
    md += `Score: **${r.score.total.toFixed(2)}/5**  ·  ${r.score.notes.length ? r.score.notes.join('; ') : 'no issues'}\n\n---\n\n`
  }

  await fs.writeFile(reportPath, md)
  console.log(`\n📊 Avg ${avg.toFixed(2)}/5  ·  Structure ${passingStructure}/${results.length}  ·  Cost $${totalCost.toFixed(6)}`)
  console.log(`📝 Report: ${reportPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
