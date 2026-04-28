# Dayflow Evals

A heuristic eval harness for the AI day-review prompt. Catches regressions before users see them.

## Run

```bash
cd backend
npm run evals
```

Output: `backend/evals/results/{timestamp}.md` with per-fixture scores, reviews, and summary metrics (avg score, latency, token cost).

## What it scores

For each of the 12 fixture days (productive, burnout, sick, weekend, etc.), the rubric checks:

| Score | What it measures | Weight |
|---|---|---|
| **Accuracy** | Review mentions the expected keywords for that day's context | 50% |
| **Tone** | Tone matches expected (celebratory / compassionate / motivating) | 25% |
| **Actionability** | Has explicit "tomorrow/next" + specific verb (try, focus, etc.) | 25% |
| **Structure** | Final line is `SCORE: [0-100]` (pass/fail, not weighted) | — |

Total is on a 0-5 scale. Aim for **>4.0 average** with **100% structure pass rate**.

## When to run

- **Before every PR that touches `lib/review-prompt.ts` or `routes/ai.ts`**.
- **After upgrading the model** (e.g., `llama-3.3-70b` → newer). Run with `EVAL_MODEL=...` and compare results.
- **Quarterly** to catch drift if Groq updates the model under the hood.

## Adding fixtures

Edit `fixtures.ts`. A good fixture has:
- A clear scenario the prompt could miss (sick day, broken streak, empty state)
- 2-4 `expected_keywords` that a *good* review would include
- An `expected_tone` matching what a thoughtful coach would use

Aim for diversity over volume — 20 well-chosen days beat 100 similar ones.

## Upgrade path

The current rubric is heuristic (cheap, deterministic). Add an LLM-judge variant in `judge.ts` when:
- You need to score nuance the heuristic misses (e.g., "is the insight actually insightful")
- You're picking between two prompt versions and need a tiebreaker

Use a stronger or different model than the one being judged to reduce bias.
