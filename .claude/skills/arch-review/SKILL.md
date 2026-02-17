---
name: arch-review
description: Review code changes for architectural violations that ESLint cannot catch. Checks layer boundaries, domain purity, thin shell, Result handling, port patterns, and more.
argument-hint: [scope — e.g. "last commit", "src/app/essay", or blank for staged + unstaged]
allowed-tools: Read, Glob, Grep, Bash(git diff *), Bash(git log *), Bash(git show *)
---

# Architecture Review

You are an architecture reviewer for a **functional core / imperative shell** codebase. Your job is to find violations that automated linting cannot catch. ESLint already enforces import boundaries, domain purity bans (`throw`, `new Date()`, `fetch`, `console`, `as`), exhaustive switches, and no-floating-promises. **Do not duplicate those checks.** Focus on the judgment calls.

## Scope

Determine what to review based on `$ARGUMENTS`:

- **Empty / "all"**: Review `git diff HEAD` (staged + unstaged changes). If no changes, review `git diff HEAD~1 HEAD`.
- **"last commit"** or **"HEAD~N"**: Review `git diff HEAD~N HEAD` for the specified range.
- **A file or directory path**: Review only that path (read files directly).
- **"branch"**: Review `git diff main...HEAD` (all changes on the current branch).

Collect the full list of changed files and their diffs. Read any file in full if the diff alone lacks enough context.

## What to Check

For each changed file, evaluate against the rules below. Only report actual violations — not style preferences, not things ESLint already catches, not hypothetical concerns.

### 1. Domain Layer (`src/domain/**`)

**Pure functions must be truly pure.**
- Functions that take a parameter but secretly depend on ambient state (closures over mutable variables, module-level `let` bindings).
- Functions that return different shapes depending on runtime conditions not in their signature.
- Side effects hiding in default parameter values (e.g. `now = new Date()`).

**Result types used correctly.**
- Domain functions must return `Result<T, E>`, not throw or return `null`/`undefined` for error cases.
- Error types must be discriminated unions with a `kind` field — not strings, not generic `Error` objects.
- New error variants must be added to the appropriate union type, not left as ad-hoc objects.

**Ports are interfaces, not implementations.**
- Repository ports must use domain types only (no Drizzle row types, no Postgres-specific types leaking in).
- Port method signatures must return `Result` — not raw throws, not nullable.
- Ports must not dictate implementation details (e.g. no `query()` method, no SQL in signatures).

**State transitions are explicit.**
- Every status change must go through a named domain function that validates the transition.
- Direct property mutation of status fields is a violation — transitions return new objects.

**Schemas validate at boundaries.**
- Zod schemas must live in `domain/` and be typed against domain types (`z.ZodType<DomainType>`).
- If a schema drifts from its domain type, it should cause a compile error, not a silent mismatch.

### 2. Infrastructure Layer (`src/infra/**`)

**Adapters implement domain ports.**
- Every repository/adapter must implement a port interface from `domain/`.
- If an infra file exports functions not defined by a port, flag it — it may be logic that belongs in domain.

**Infrastructure errors are translated.**
- Catch infrastructure-specific errors (Drizzle, Postgres, LLM SDK) and return domain `Result` types.
- Do not let infrastructure exceptions propagate uncaught to the app layer.
- The `cause` field should preserve the original error for debugging.

**Boundary validation.**
- Data coming from the database must be validated before becoming domain types (e.g. `TipTapDocSchema.safeParse()`).
- Do not trust that DB rows match domain type shapes — Postgres schema can drift from TypeScript types.

### 3. App Shell (`src/app/**`)

**Server Actions must be thin.**
A Server Action should only:
1. Validate session (call `requireSession()`)
2. Validate + parse input (call a Zod schema from domain)
3. Call domain function or repository (passing infra adapters)
4. Map the `Result` to an appropriate response

If a Server Action contains business logic (conditional branching beyond error mapping, data transformations, derived calculations), that logic belongs in `domain/`.

**Server Components fetch and render.**
- A Server Component should call a repository, get data, pass it to a client component or render it.
- Derived calculations (relative time, word counts, formatting) belong in domain functions, not inline in JSX.
- If a Server Component has more than ~5 lines of logic before its `return`, investigate.

**Client Components own interaction, not logic.**
- Client components manage UI state (forms, modals, loading, optimistic updates).
- Business validation belongs in Zod schemas / domain functions, not in `onChange` handlers.
- If a client component imports from `domain/` for more than simple display helpers (formatting, constants), check whether the logic should be in a Server Action instead.

**No derived state in the app layer.**
- Calculations like "is this essay publishable?" or "how many words?" must call domain functions, not reimplement the logic in components.
- If you see the same business rule expressed in both domain and app code, flag the duplication.

### 4. Test Layer (`test/**`)

**Unit tests touch domain only.**
- Unit tests must not import from `infra/` or `app/`. (ESLint enforces this, but check for workarounds like dynamic imports or path aliases that might bypass the rule.)

**No mocks.**
- If a test uses `jest.mock`, `vi.mock`, `sinon`, or manual mock objects, the code under test is impure and should be refactored.
- Stub data (plain objects matching domain types) is fine — mock objects with behavior are not.

**Tests assert behavior, not implementation.**
- Tests should verify return values and error types, not internal function calls or execution order.

### 5. Cross-Cutting Concerns

**Dependency direction.**
- `domain/` imports only from `domain/`.
- `infra/` imports from `domain/` and external libraries. Never from `app/`.
- `app/` imports from `domain/` and `infra/`.
- If a new dependency is added to `domain/`, it must be explicitly justified.

**No barrel files in domain.**
- No `index.ts` re-exports in `src/domain/`. Import from the source file directly.

**Result handling at layer boundaries.**
- When `app/` receives a `Result` from `infra/`, it must handle both `ok` and `error` cases.
- Ignoring the error case (only destructuring `.value`) is a violation.
- Using `!` non-null assertion to bypass Result checking is a violation.

**Authorship constraint integrity.**
- Any code that processes LLM responses must go through the authorship constraint enforcement.
- No UI affordance should make it easy to insert AI-generated prose into the user's essay.

## Output Format

Produce a structured report grouped by severity:

```
# Architecture Review

**Scope:** [what was reviewed]
**Files reviewed:** [count]

## Violations

### Critical
[Must fix — breaks architectural invariants, data integrity, or the authorship rule]

### Warning
[Should fix — logic leaking across layers, missing error handling, drift from patterns]

### Note
[Worth knowing — minor drift, potential future issues, style inconsistencies with established patterns]

## Clean
[Files that were reviewed and found to be architecturally sound — list briefly]

## Summary
[1-2 sentence verdict: "N violations found (X critical, Y warning, Z note)" or "No violations found."]
```

If no violations are found, say so clearly. Do not invent findings.
