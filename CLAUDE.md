# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

gaddr is a "Micro-Essay Continuous Learning Studio" — a SaaS platform where users write short (200-800 word) evidence-backed micro-essays and receive LLM coaching (never ghostwriting). Users build a "thinking portfolio" with version history, claim-evidence linking, and structured peer feedback.

## Tech Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Package manager:** bun
- **Auth:** Better Auth (integrated into Next.js, DB-backed sessions in Postgres)
- **Database:** Railway Postgres (users/sessions/essays/evidence)
- **Hosting:** Vercel (SSR/ISR, API routes, Server Actions, preview deployments)
- **Validation:** Zod (especially for assistant response schema enforcement)
- **Observability:** Sentry (server + client)

## Commands

```bash
bun install              # Install dependencies
bun run dev              # Start dev server
bun run build            # Production build
bun run lint             # ESLint (boundaries, purity, type-checked rules)
bun run typecheck        # TypeScript type checking
bun run knip             # Dead code detection
bun run check            # All checks: typecheck + lint + knip
bun test                 # Run all tests
bun test <path>          # Run a single test file
```

Database migrations (once ORM is chosen):
```bash
bun run db:migrate       # Run migrations
bun run db:push          # Push schema changes
```

## Architecture

**Functional core, imperative shell.** See `docs/architecture.md` for the full architecture document.

- `src/domain/` — Pure TypeScript. Zero framework imports. Types, schemas, pipelines, ports.
- `src/infra/` — Adapters implementing domain ports (Postgres, LLM, auth).
- `src/app/` — Next.js shell. Thin wiring only.

Dependencies point inward: `app/ -> infra/ -> domain/`. Never the reverse.

### Hard Rules (Enforced by ESLint)

All of these are enforced at lint time. The build fails on any violation.

- `domain/` must not import from `infra/`, `app/`, or any external library (Next.js, Drizzle, Better Auth, LLM SDKs, Sentry).
- `domain/` must not throw. Return `Result<T, E>` instead.
- `domain/` must not call `new Date()`, `Date.now()`, `Math.random()`, `fetch`, or `console`. Pass values as parameters.
- `domain/` must not use `as` type assertions. Fix the types instead.
- `infra/` must not import from `app/`.
- Unit tests (`test/unit/`) must only import from `domain/`.
- No barrel files (`index.ts` re-exports) in `domain/`.
- No parameter mutation (`no-param-reassign` with `props: true`).
- Exhaustive `switch` on discriminated unions (`switch-exhaustiveness-check`).
- No floating promises, no `!` non-null assertions, no loose equality.

### Data Flow

```
Client -> Next.js Server Actions / Route Handlers -> Railway Postgres
Auth flow -> Better Auth routes -> Railway Postgres
Coach review -> POST /api/review -> LLM -> Zod-validated JSON response
```

### Testing

- `bun test` — unit tests for `domain/` only. Must run under 5 seconds.
- `playwright test` — E2E tests organized by user workflow, run on every PR.
- Contract tests — LLM response validation, nightly schedule.

### MVP Database Schema

**essays:** id (UUID), user_id, title, content, status ('draft'|'published'), created_at, updated_at, published_at

Post-MVP tables: essay_versions, annotations, evidence_cards, objections

## The Authorship Rule (Hard Constraint)

The LLM assistant must **never** write, rewrite, or replace user prose. It may only return structured coaching artifacts:

- **Feedback:** inline comments + issue lists (problem -> why it matters -> question -> suggested action)
- **Questions:** Socratic prompts
- **Research:** sources, quotes, evidence cards
- **Argument analysis:** claim mapping, assumptions, counterclaims (structure only)
- **Checklists / next actions**

All assistant responses must be **structured JSON** validated with Zod. Reject any response containing replacement prose fields. No UI affordance should make it easy to swap in AI-written text.

## Auth (Better Auth)

- MVP: OAuth only (Google + GitHub) — no email vendor needed initially
- DB-backed sessions in Postgres
- Protect routes via Next.js middleware + server-side checks
- See `.agents/skills/better-auth-best-practices/SKILL.md` for detailed integration patterns

## Key Design Principles

- **Practice > Performance:** micro-essays are reps, not final exams — encourage quick drafts and frequent revision
- **Coaching > Generating:** LLM diagnoses issues and suggests actions; the user fixes their own writing
- **Constraints create craft:** fixed time/scope, variable outcome (10-min sprints, word limits, required counterarguments)
- **Evidence over vibes:** every claim should link to evidence cards; citation mismatches are flagged
- **Reward learning behaviors:** revision after feedback, adding evidence, addressing counterarguments — not volume or engagement

## Editor Performance Constraint (P0)

- Typing responsiveness is non-negotiable. The editor must feel instant under normal use and long documents.
- Prefer asynchronous/background persistence (idle callbacks, delayed flushes, blur/unload flush) over synchronous writes during active typing.
- Avoid per-keystroke expensive operations in the editing loop (full-document serialization, heavy decoration rebuilds, unnecessary re-renders).

## Reference Docs

- `docs/architecture.md` — full architecture document, dependency rules, testing strategy, feature workflow
- `docs/infra.md` — infrastructure plan and deployment checklist
- `docs/product-and-design-philosophy.md` — full product philosophy, UX patterns, metrics
- `docs/business-model.md` — revenue tiers, unit economics, GTM
- `.agents/skills/better-auth-best-practices/SKILL.md` — Better Auth integration guide
