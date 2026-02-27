# Architecture

## 1. Governing Principle

**Functional core, imperative shell.** All domain logic is pure — data in, data out, no side effects. All I/O (database, LLM, auth, HTTP) lives at the boundary. The architecture and the testing strategy are the same decision: pure code is unit tested, integration is verified end-to-end. There is no middle layer of mocks.

If you need a mock to test something, the code is at the wrong layer. Extract the pure logic or test via E2E. This is not a guideline — it is a hard rule.

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────┐
│  Next.js App Shell (app/)                        │
│  Server Components, Server Actions, Route        │
│  Handlers — thin wiring only                     │
└──────────────┬───────────────────────────────────┘
               │ calls
┌──────────────▼───────────────────────────────────┐
│  Infrastructure Adapters (infra/)                │
│  Postgres repositories, LLM client, auth         │
│  utilities — implement domain ports              │
└──────────────┬───────────────────────────────────┘
               │ implements
┌──────────────▼───────────────────────────────────┐
│  Domain Core (domain/)                           │
│  Types, pure functions, pipelines, schemas,      │
│  ports (interfaces) — zero external imports      │
└──────────────────────────────────────────────────┘
```

Dependencies point inward. `domain/` imports nothing from `infra/` or `app/`. `infra/` imports from `domain/` (to implement ports). `app/` imports from both.

---

## 3. Why This Architecture

### 3.1 Next.js wants to own your architecture. Don't let it.

App Router collapses data fetching, rendering, and mutation into the same files. This is convenient for prototyping and catastrophic for maintainability. Without discipline, domain logic ends up scattered across `page.tsx` and `actions.ts` files, tightly coupled to the framework, and testable only by booting the entire app.

Our response: treat Next.js as a delivery mechanism. It handles HTTP, rendering, and routing. It does not contain business logic.

### 3.2 Pure functions are the only reliable unit of software.

A pure function with typed inputs and outputs is deterministic, composable, and trivially testable. It does not break when you upgrade Next.js, swap your ORM, or change your LLM provider. Every piece of logic that can be pure must be pure.

### 3.3 Side effects are not logic.

Fetching from a database, calling an LLM API, and checking a session are I/O operations, not domain logic. They belong behind interfaces (ports) that the domain defines and infrastructure implements. The domain decides what data it needs and what shape it returns. Infrastructure decides how to get it.

### 3.4 The authorship constraint is an architectural concern.

The no-ghostwriting rule is not a prompt engineering detail or a UI copy choice. It is the product's core invariant. It must be enforced as a pure, testable function in the domain layer with its own schema, its own tests, and its own failure type. If this constraint is ever violated, the product is broken regardless of what the UI looks like.

---

## 4. Directory Structure

```
src/
  domain/
    types/
      result.ts              # Result<T, E>, ok(), err(), pipe, flatMap
      branded.ts             # Branded types: UserId, EssayId, EvidenceCardId
      errors.ts              # All domain error types (discriminated union)

    essay/
      essay.ts               # Essay type, state transitions, invariants
      essay.repository.ts    # Port: interface for essay persistence
      essay.schemas.ts       # Zod schemas for essay validation

    review/
      review.ts              # GadflyReview type, rubric structure
      review.pipeline.ts     # Composed pipeline: validate → call LLM → enforce constraints → structure result
      constraints.ts         # No-ghostwriting enforcement (pure validation)
      review.schemas.ts      # Zod schemas for review request/response
      review.port.ts         # Port: interface for LLM interaction

    evidence/
      evidence-card.ts       # EvidenceCard type, claim linking
      evidence.repository.ts # Port
      evidence.schemas.ts    # Zod schemas

  infra/
    db/
      schema.ts              # Drizzle schema definitions
      client.ts              # Database client setup
      essays.repository.ts   # Implements essay.repository port
      evidence.repository.ts # Implements evidence.repository port

    llm/
      client.ts              # LLM API client
      prompts/
        review.ts            # Prompt templates for gadfly review
      review.adapter.ts      # Implements review.port

    auth/
      auth.ts                # Better Auth configuration
      middleware.ts           # Next.js middleware for route protection
      require-session.ts     # Session extraction, returns Result<Session, AuthError>

  app/
    (protected)/
      editor/
        page.tsx
        actions.ts
      library/
        page.tsx
        actions.ts
    (public)/
      essay/[id]/
        page.tsx
    api/
      review/
        route.ts

  test/
    unit/                    # Mirrors domain/ structure
    e2e/                     # Playwright specs organized by user workflow
    contract/                # LLM contract tests (nightly, not per-commit)
    fixtures/                # Shared test data
```

---

## 5. The Domain Layer — Rules

### 5.1 Zero external imports.

Files under `domain/` must not import from Next.js, Drizzle, Prisma, any LLM SDK, Better Auth, or any other framework or infrastructure library. They import only from other `domain/` files and from the TypeScript/JavaScript standard library.

**Enforcement:** A lint rule or CI check should fail the build if `domain/` contains disallowed imports.

### 5.2 All functions are pure.

Every exported function in `domain/` is deterministic: same input, same output, no side effects. No `fetch`, no `fs`, no `Date.now()` (pass timestamps as parameters), no `Math.random()` (pass generators as parameters), no `console.log`.

### 5.3 Ports define what infrastructure must provide.

A port is a TypeScript interface defined in the domain layer. It describes what the domain needs without specifying how to get it.

```typescript
// domain/essay/essay.repository.ts
export interface EssayRepository {
  findById(id: EssayId, userId: UserId): Promise<Result<Essay, NotFoundError>>;
  save(essay: Essay): Promise<Result<Essay, PersistenceError>>;
  listByUser(userId: UserId): Promise<Result<Essay[], PersistenceError>>;
}
```

Infrastructure implements this interface. The domain never sees the implementation.

### 5.4 Domain types enforce invariants at construction.

Use smart constructors that return `Result` types. An `EssayId` is not a `string` — it is a branded type that can only be created through a validated constructor. An Essay in `published` status must have non-empty content. These rules are enforced by the type system and constructor functions, not by runtime checks scattered throughout the codebase.

### 5.5 State transitions are explicit.

An essay moves through defined states: `draft → published → unpublished`. Each transition is a function that takes the current state and returns `Result<NewState, TransitionError>`. You cannot publish a draft with empty content. You cannot unpublish a draft. These transitions are the domain logic, they are pure, and they are unit tested.

### 5.6 Zod schemas are defined in the domain.

Schemas live alongside the types they validate. They are the single source of truth for validation at every boundary: Server Action input, Route Handler request/response, LLM response parsing. Types are derived from schemas via `z.infer<>`.

---

## 6. The Result Type — Error Handling Philosophy

### 6.1 No thrown exceptions for domain errors.

Domain functions return `Result<T, E>` where `E` is a discriminated union of possible errors. Thrown exceptions are reserved for truly exceptional conditions (programmer errors, infrastructure failures). Business rule violations, validation failures, and not-found conditions are expected outcomes, not exceptions.

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

### 6.2 Domain errors are typed and exhaustive.

```typescript
type ReviewError =
  | { kind: "not_found" }
  | { kind: "unauthorized" }
  | { kind: "llm_timeout"; partial: PartialFeedback | null }
  | { kind: "ghostwriting_detected"; violations: string[] }
  | { kind: "validation_failed"; issues: ZodIssue[] };
```

Every consumer of a `Result` must handle all error variants. TypeScript's exhaustive checking via `switch` on `error.kind` enforces this at compile time.

### 6.3 Pipeline composition via Result chaining.

The review pipeline reads as a sequence of named steps:

```typescript
export const runReview = (input: ReviewInput) =>
  pipe(
    validateInput(input),
    flatMap(fetchEssay),
    flatMap(checkOwnership),
    flatMap(callLlm),
    flatMap(enforceAuthorshipConstraint),
    flatMap(structureReviewResult),
  );
```

Each step returns `Result`. If any step fails, the pipeline short-circuits with the typed error. No nested try/catch, no thrown exceptions as control flow.

---

## 7. The Infrastructure Layer — Rules

### 7.1 Adapters implement domain ports.

Every file in `infra/` that interacts with external systems must implement a port defined in `domain/`. The adapter handles I/O and translates between external formats and domain types.

### 7.2 Infrastructure errors are translated to domain errors.

If Drizzle throws a connection error, the repository adapter catches it and returns `Result` with a `PersistenceError`. If the LLM API times out, the adapter returns `Result` with an `LlmTimeoutError`. The domain never sees infrastructure-specific error types.

### 7.3 Database schema is infrastructure, not domain.

Drizzle/Prisma schema definitions live in `infra/db/`. They describe how domain types are stored, not what they are. The repository adapter maps between database rows and domain types. The domain does not know or care that essays are stored in a Postgres table.

---

## 8. The App Shell — Rules

### 8.1 Server Actions and Route Handlers are thin.

A Server Action should do exactly three things:

1. Validate input (call the Zod schema from domain)
2. Call a domain function or pipeline (passing infrastructure adapters)
3. Return the result or translate errors to the appropriate response

If a Server Action contains an `if` statement that isn't input validation or error mapping, logic is leaking into the shell.

### 8.2 Server Components fetch and render.

A Server Component calls a repository (via infra) to get data, passes it to a client component as props. It does not transform, filter, or compute derived data — that logic belongs in the domain layer.

### 8.3 Client components own interaction, not logic.

Client components manage UI state (form inputs, modals, loading states). They call Server Actions for mutations. They do not contain business logic. If a client component is validating business rules, that validation belongs in a Zod schema in the domain.

---

## 9. Testing Strategy

### 9.1 Unit Tests — `bun test`

**Scope:** `src/domain/` only. Every test file mirrors the domain file it tests.

**What is tested:**

- No-ghostwriting constraint: valid gadfly artifacts accepted, replacement prose rejected. Property-based tests with `fast-check` to verify the constraint holds against thousands of generated response shapes.
- Essay state transitions: every valid transition succeeds, every invalid transition returns the correct error.
- Review pipeline: each step tested individually with synthetic data. Composed pipeline tested with known inputs and expected outputs.
- Zod schemas: edge cases, missing fields, malformed data. Especially the review response schema — this is the contract that enforces the authorship rule.
- Result type utilities: pipe, flatMap, mapError behave correctly with ok and error values.
- Claim-evidence linking: citation mismatches detected, unsupported claims flagged.
- Branded type constructors: valid inputs produce values, invalid inputs return errors.

**What is NOT tested:**

- Server Actions, Route Handlers (wiring — covered by E2E)
- React components (rendering — covered by E2E)
- Database repositories (SQL correctness — covered by E2E)
- Auth middleware (integration — covered by E2E)
- Configuration, re-exports, type definitions
- Any code that requires mocking to test

**Performance standard:** Unit test suite completes in under 5 seconds. If it doesn't, impure code has leaked into the domain layer.

### 9.2 E2E Tests — Playwright

**Scope:** the running application against a real test database.

**Organized by user workflow, not by page or component:**

```
e2e/
  auth.spec.ts              # OAuth sign-in, session persistence, sign-out, unauthorized redirects
  write-and-publish.spec.ts # Create draft → edit content → publish → verify public page
  gadfly-review.spec.ts     # Write essay → request review → gadfly feedback displayed → resolve issues
  evidence.spec.ts          # Create evidence card → attach to claim → verify on published view
  revision.spec.ts          # Publish → edit → new version → version history visible
  error-states.spec.ts      # LLM timeout → partial feedback shown; validation failure → clear error
```

**What E2E verifies:**

- Auth works end-to-end (Better Auth + middleware + session + redirect)
- Server Actions wire correctly to domain logic and database
- Forms validate, submit, and display results
- The review endpoint returns gadfly feedback and the UI renders it
- Error states surface correctly to the user
- Accessibility (axe-core integration in Playwright for automated a11y audits)
- Visual regression (Playwright screenshot comparison for editor and publish pages)

**E2E runs on every PR** against Vercel preview deployments.

### 9.3 Contract Tests — LLM Provider

**Scope:** verify that the LLM provider returns responses that conform to the review response schema and do not violate the authorship constraint.

**Not run on every commit.** These hit a real LLM API, cost money, and are slow. Run nightly on a schedule and on-demand before releases.

**What they catch:** prompt drift, model behavior changes, schema-compliant but semantically wrong responses (e.g., gadfly artifacts that technically pass Zod but contain thinly disguised replacement prose).

### 9.4 Forbidden Testing Practices

- **No mocks.** If a function requires mocking infrastructure to test, it belongs in a different layer. Extract the pure logic or test via E2E.
- **No testing trivial code.** A function that passes through to another function does not need its own test. A type definition does not need a test.
- **No snapshot tests for logic.** Snapshot tests are acceptable for visual regression only (Playwright screenshots). Never snapshot JSON output as a substitute for specific assertions.
- **No test files outside `test/`.** Domain test files live in `test/unit/`, E2E in `test/e2e/`, contracts in `test/contract/`.

---

## 10. Adding a New Feature

Every new feature follows this sequence. There are no exceptions.

### Step 1: Model the domain.

Define the types, invariants, and state transitions in `domain/`. Write the Zod schemas. Determine what ports are needed (new repository methods, new external service interfaces). Write the pure functions.

### Step 2: Unit test the domain.

Test every invariant, every state transition, every validation edge case. If the feature involves LLM interaction, test the constraint enforcement and response parsing with synthetic data. All unit tests pass before moving to step 3.

### Step 3: Implement infrastructure.

Write the database migrations, implement repository methods, build adapters. If a new external service is introduced, implement its adapter behind the port defined in step 1.

### Step 4: Wire into the app shell.

Create or modify Server Actions, Route Handlers, Server Components, and Client Components. Keep them thin — validate input, call domain, return result.

### Step 5: Write E2E tests.

Add Playwright specs that verify the feature works from the user's perspective. Cover the happy path and meaningful error states.

### Step 6: Verify.

All unit tests pass (under 5 seconds). All E2E tests pass. No domain files import from infrastructure or framework. Lint and type checks pass.

---

## 11. Handling Specific Future Features

### Evidence Cards and Claim Linking

Model `EvidenceCard` as a domain type with its own invariants (must have source, must have at least one claim connection). Claim-evidence validation is a pure function in the domain. The "citation mismatch" check is a unit-testable function that takes an essay's claims and evidence cards and returns a list of issues.

### Version History

Each publish creates a snapshot in `essay_versions`. The version diff is a pure function: takes two essay versions, returns structured changes. No event sourcing, no CQRS — a versions table with immutable rows is sufficient.

### Objections and Peer Feedback

An `Objection` is a domain type anchored to a specific claim. Moderation rules are pure functions (does this objection meet content standards?). The objection-response-revision loop is a state machine modeled in the domain.

### Gamification (XP and Progress)

XP calculations are pure functions. An `XpEvent` is a discriminated union (evidence_added, counterargument_addressed, revision_after_feedback). The scoring function maps events to points. The progress dashboard reads computed state. No side effects in scoring logic.

### Research Packets (LLM-assisted Source Discovery)

This adds a new LLM interaction port. The research pipeline follows the same pattern as the review pipeline: validate input → call LLM → parse response → enforce constraints (no generated prose, only source metadata) → return structured result. Same authorship constraint applies.

### Rate Limiting and Quotas

Quota checking is a domain concern (does this user have remaining review passes?). Quota state is persisted via a repository port. The domain function returns `Result<_, QuotaExceeded>`. Rate limiting at the HTTP level (request frequency) is infrastructure — implemented in middleware, not in the domain.

---

## 12. What We Explicitly Do Not Use

| Pattern | Reason |
|---|---|
| Dependency injection containers | TypeScript modules and function parameters are sufficient. |
| Class-based OOP | TypeScript's type system favors discriminated unions and functions over inheritance hierarchies. |
| Event sourcing | Adds operational complexity with no benefit at our scale. Version history is a simple snapshots table. |
| CQRS | One database, one app. Separate read/write models are unjustified overhead. |
| Microservices | One product, one team, one deployment unit. A well-structured monolith is the correct choice. |
| Abstract factories / strategy pattern via inheritance | Use functions. A function parameter that satisfies an interface is all the polymorphism needed. |
| Mocking libraries | If you need jest.mock or sinon, the code under test is impure and should be refactored. |
| Barrel files (index.ts re-exports) | They obscure import chains, break tree-shaking, and create circular dependency risks. Import directly from the source file. |

---

## 13. Enforced Rules

All rules below are enforced by `eslint.config.mjs` and `tsconfig.json`. A violation fails the build. There is no escape hatch — if a rule blocks you, the code belongs in a different layer.

### Layer Boundaries (`no-restricted-imports`)

1. `domain/` must not import from `infra/`, `app/`, or any external framework/library (Next.js, React, Drizzle, Prisma, Better Auth, LLM SDKs, Sentry).
2. `infra/` may import from `domain/` and external libraries. It must not import from `app/`.
3. `app/` may import from `domain/` and `infra/`.
4. No circular imports at any level (`import-x/no-cycle`).
5. Unit test files (`test/unit/`) must only import from `domain/`. If a test needs infra or app imports, it is an E2E test.
6. No barrel files (`index.ts` re-exports) in `domain/`.

All import paths use the `@/` alias (mapped to `src/` in `tsconfig.json`). The lint rules match against both alias and relative paths. To add a new external package to `domain/`, you must explicitly add it to the allowed list in `eslint.config.mjs`. This forces the architectural conversation.

### Domain Purity (`no-restricted-syntax`, `no-restricted-globals`, `no-restricted-properties`)

Domain code must be pure. The following are banned in `src/domain/**`:

- `throw` statements — return `Result<T, E>` instead.
- `new Date()`, `Date.now()`, `Date.parse()` — pass timestamps as function parameters.
- `Math.random()` — pass random values as parameters or use a port.
- `fetch()` — define a port interface for HTTP calls.
- `console` — no logging in domain; instrument at infra/app boundary.
- `as` type assertions — fix the types, don't cast. `as const` is permitted.

### Type Safety (`strictTypeChecked` + manual rules)

The ESLint config uses `tseslint.configs.strictTypeChecked` with type-aware parsing (`parserOptions.projectService`). Key rules:

- `switch-exhaustiveness-check` — every `switch` on a discriminated union must handle all variants. No lazy `default` on exhaustive switches.
- `no-floating-promises` — every promise must be awaited or explicitly voided.
- `no-non-null-assertion` — no `!` operator. Narrow the type properly.
- `no-unnecessary-condition` — catches dead code and always-true/false conditions.
- `consistent-type-assertions` — `as` casts banned in domain, object literal assertions banned everywhere.
- `no-unused-vars` — with `_` prefix ignore pattern for intentionally unused variables.

### Code Quality (built-in ESLint)

- `prefer-const` — use `const` unless reassignment is needed.
- `no-param-reassign` with `props: true` — never mutate function parameters.
- `eqeqeq` — strict equality only, no `==`.

### TypeScript Compiler (`tsconfig.json`)

- `strict: true` — full strict mode.
- `noUncheckedIndexedAccess: true` — array/object index access returns `T | undefined`, forcing explicit checks.
- `isolatedModules: true` — required for bun and Next.js/SWC single-file transpilation.

### Dead Code Detection (`knip`)

`bunx knip` detects unused files, exports, types, and dependencies. Run `bun run knip` locally, enforce in CI with `knip --max-issues 0`.
