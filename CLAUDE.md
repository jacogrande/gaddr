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
bun run dev              # Start dev server (Turbopack, port 8080)
bun run build            # Production build
bun run check            # Verification gate: typecheck + lint (runs on agent stop)
bun run knip             # Dead code detection (run manually)
bun test                 # Unit tests (domain/ only, <5s)
bun run test:e2e         # Playwright E2E tests
bun run db:migrate       # Drizzle migrations
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

### Testing

- Unit tests (`test/unit/`) — domain/ only, pure functions, no mocks. Must run under 5 seconds.
- E2E tests (`test/e2e/`) — Playwright, organized by user workflow. Playwright MCP is available for browser interaction.
- Contract tests — LLM response validation, nightly schedule.

## The Authorship Rule (Hard Constraint)

The LLM assistant must **never** write, rewrite, or replace user prose. It may only return structured coaching artifacts:

- **Feedback:** inline comments + issue lists (problem -> why it matters -> question -> suggested action)
- **Questions:** Socratic prompts
- **Research:** sources, quotes, evidence cards
- **Argument analysis:** claim mapping, assumptions, counterclaims (structure only)
- **Checklists / next actions**

All assistant responses must be **structured JSON** validated with Zod. Reject any response containing replacement prose fields. No UI affordance should make it easy to swap in AI-written text.

## Auth (Better Auth)

OAuth only (Google + GitHub), DB-backed sessions in Postgres. See `.agents/skills/better-auth-best-practices/SKILL.md` for integration patterns.

## Editor Performance Constraint (P0)

- Typing responsiveness is non-negotiable. The editor must feel instant under normal use and long documents.
- Prefer asynchronous/background persistence (idle callbacks, delayed flushes, blur/unload flush) over synchronous writes during active typing.
- Avoid per-keystroke expensive operations in the editing loop (full-document serialization, heavy decoration rebuilds, unnecessary re-renders).

## Reference Docs

Read these before making design or architecture decisions — they are the system of record:

- `docs/architecture.md` — dependency rules, data flow, testing strategy, feature workflow
- `docs/product-and-design-philosophy.md` — design principles, UX patterns, metrics
- `docs/infra.md` — infrastructure plan and deployment checklist
- `docs/business-model.md` — revenue tiers, unit economics, GTM
- `docs/gadfly-technical-design.md` — LLM coaching pipeline design
- `.agents/skills/better-auth-best-practices/SKILL.md` — Better Auth integration guide
