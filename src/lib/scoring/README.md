# Compatibility Blueprint™ Scoring Engine

## Architecture Overview

The scoring engine transforms 88 assessment answers into structured, explainable compatibility metrics. It is entirely deterministic — no AI, no randomization, no external API calls.

### Pipeline

```
Assessment Answers (DB)
    │
    ▼
compute.ts (orchestrator)
    │  ── loads question bank
    │  ── loads scoring config
    │  ── builds answer map
    ▼
engine.ts (pure functions)
    │  ── scoreQuestion()    — per-question 0–100
    │  ── scoreCategory()    — per-category aggregation
    │  ── computeAllResults() — full blueprint
    ▼
BlueprintResults
    │
    ▼
actions.ts (server actions)
    ── computeResults() — persist to DB
    ── getResults()    — fetch / auto-compute
```

## How Scores Are Calculated

### Per-Question Scoring

| Question Type | Formula |
|---|---|
| **likert_5 positive** | `(answer - 1) × 25` → 1→0, 2→25, 3→50, 4→75, 5→100 |
| **likert_5 negative** | `(5 - answer) × 25` → 1→100, 2→75, 3→50, 4→25, 5→0 |
| **single_choice** | Lookup in `choiceScoreMap`; unmapped values default to 50 |
| **Missing / invalid** | Default 50 |

### Per-Category Scoring

1. Score each question individually.
2. The category score is the **arithmetic mean** of all question scores (rounded to integer, 0–100).
3. **Unless** a deal-breaker is triggered — then the score is capped at `DEAL_BREAKER_CAP = 30`.

### Confidence

Confidence measures answer consistency within a category:

```
confidence = 100 - (standardDeviation × 10)
```
Clamped to [0, 100]. Consistent answers → high confidence. Scattered answers → low confidence.

### Overall Score

Weighted average across all 12 categories:

```
overall = Σ(score_i × weight_i) / Σ(weight_i)
```

Default weights are defined in `weights.ts`. Higher-weighted categories (core_values: 1.25, communication: 1.25, conflict_resolution: 1.2) contribute more to the overall score.

## Deal-Breaker Mechanics

Some questions are flagged as deal-breakers. If a user's answer crosses the configured threshold:

- The **entire category** score is capped at 30 (regardless of other answers).
- `dealBreakerTriggered` is set to `true` on the category result.

**Current deal-breakers:**

| Question | Threshold | Condition |
|---|---|---|
| `core_values_02` — "end relationship if core values differ" | ≥ 4 (agree/strongly agree) | Rigid incompatibility stance |
| `children_01` — "want children within 5 years" | ≤ 1 (strongly disagree) | Fundamental family goal mismatch |
| `family_04` — "family of origin comes first" | ≥ 4 (agree/strongly agree) | Unhealthy prioritization |

## Weight System

Weights control each category's influence on the overall score. Default weights range from 0.85 (social_life) to 1.25 (core_values, communication). Weights are configurable per computation and validated via `validateWeights()`.

## File Structure

```
src/lib/scoring/
  types.ts           — Scoring-specific types
  scoring-config.ts  — Per-question scoring metadata (88 entries)
  engine.ts          — Pure scoring functions
  weights.ts         — Default weights and validation
  compute.ts         — Orchestrator (pure data transformation)
  actions.ts         — Server actions (computeResults, getResults)
  __tests__/
    engine.test.ts   — Unit tests
```
