# CLAUDE.md

This file provides guidance to coding agents working in this repository.

## Project Overview

gaddr is a 3-step writing platform:

1. Uninterrupted freewrite
2. Constellation review: after a writing sprint, the system gathers source-backed citations, steelmanned counterarguments, and issues found in the draft, then presents them in a constellation view
3. Uninterrupted final draft: the system turns accepted findings into annotations on a first draft, then returns the writer to a clean drafting surface to revise without inline AI interruptions

AI is allowed to retrieve, structure, question, and annotate. It is not allowed to ghostwrite the user's prose.

## Current Product Status

The repo currently implements auth, a protected TipTap editor, local-first persistence, sprint timing, theme support, and a Playwright eval harness. Citation retrieval, constellation intelligence, auto-annotation, and the dedicated final-draft workflow are the next major product layers.

## Tech Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Package manager:** bun
- **Auth:** Better Auth
- **Database:** Postgres via Drizzle ORM
- **Hosting:** Vercel
- **Testing:** Bun unit tests + Playwright E2E

## Commands

```bash
bun run dev              # Start dev server (Turbopack, port 8080)
bun run build            # Production build
bun run check            # Typecheck + lint
bun test                 # Bun test suite
bun run test:e2e         # Playwright E2E tests
bun run test:e2e:auth    # Playwright auth-only tests
bun run db:generate      # Generate Drizzle migration files
bun run db:migrate       # Run Drizzle migrations
bun run db:push          # Push schema changes directly
```

## Architecture

**Functional core, imperative shell.**

- `src/domain/` - Pure TypeScript. No framework imports. Types, invariants, ranking/filtering logic, annotation/constellation rules, ports.
- `src/infra/` - Adapters for auth, database, retrieval, extraction, and model calls.
- `src/app/` - Next.js shell. Routing, rendering, and thin UI wiring.

Dependencies point inward: `app -> infra -> domain`.

## Product Rules

- Freewrite and final draft are interruption-free. Do not put blocking AI critique in the active writing loop.
- Every AI-suggested citation or factual challenge must preserve provenance.
- Counterarguments should be steelmanned, not shallow or adversarial.
- Auto-annotations must point, question, and explain. They must not replace the writer's sentences with finished prose.
- Typing latency is P0. Retrieval, annotation, and constellation assembly must stay off the keystroke path.

## Hard Rules

- `domain/` must not import from `infra/`, `app/`, or any external library.
- `domain/` must not throw for expected business outcomes. Use `Result<T, E>`.
- `domain/` must not call `Date.now()`, `new Date()`, `Math.random()`, `fetch`, or `console`.
- `infra/` must not import from `app/`.
- Unit tests should target domain logic and other pure helpers.
- E2E tests should verify user workflows, not internal implementation details.

## Testing

- `eval/*.json` contains human-readable workflow specs.
- `test/e2e/*.pw.ts` contains the executable Playwright contract.
- `playwright.config.ts` boots the app in test mode and can bypass auth for protected-flow coverage.
- Current covered flows: auth, editor, sprint transition, theme, and navigation.

## Reference Docs

Read these before making design or architecture changes:

- `docs/product-and-design-philosophy.md`
- `docs/architecture.md`
- `docs/mvp-cycle.md`
- `docs/infra.md`
- `docs/agentic-ux-testing.md`
- `.agents/skills/better-auth-best-practices/SKILL.md`
