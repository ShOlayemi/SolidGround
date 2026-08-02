# SolidGround

**SolidGround AI** — Relationship Intelligence Platform.

The first product, **Compatibility Blueprint™**, helps marriage-minded adults (25–45) assess relationship compatibility through a structured, AI-powered assessment. Unlike dating apps that optimize for attraction and swiping, SolidGround produces explainable compatibility profiles across values, communication, finances, lifestyle, and growth — starting with a single-user Blueprint and evolving toward pairwise **Alignment Match™** comparisons and an AI relationship coach.

## Stack

- Next.js 16 (App Router) + TypeScript (strict) + TailwindCSS v4
- Supabase (Auth, PostgreSQL, RLS)
- OpenAI (gpt-4o-mini) with a provider-abstracted AI layer — deterministic **MockProvider** for offline/zero-cost demos (`NEXT_PUBLIC_AI_MODE=mock`)
- Stripe, Resend, PostHog, Sentry (stubs/integrations as noted in the business plan)
- Deployed on Vercel; CI/CD via GitHub Actions

## Getting Started

```bash
bun install
cp .env.local.example .env.local   # fill in your Supabase keys
bun dev
```

Run the test suite with `bun test` (Vitest). Seed demo personas with `bun run seed-demo`.

## Structure

- `src/app` — routes (public, auth, dashboard, admin, api)
- `src/components` — shared UI components
- `src/lib` — domain logic (ai, scoring, pairings, billing, email, supabase)
- `supabase/migrations` — database migrations (26, all applied, full RLS)
- `test` — test setup and mocks

## Documentation

- `SITE.md` — site operations and publishing
- `CLAUDE.md` / `AGENTS.md` — agent conventions
- `design-spec.md` — design system notes
