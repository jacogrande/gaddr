# Architecture

## 1. Governing Principle

**Functional core, imperative shell.**

All domain logic should be pure: data in, data out, no framework dependencies, no hidden side effects. All I/O lives at the boundary: auth, database, retrieval, HTTP, model calls, and background job execution.

The architecture and the testing strategy are the same decision:

- pure logic gets unit tests
- real workflows get E2E tests
- adapters are kept thin and explicit

If a behavior is hard to test without mocks, it usually belongs in a purer layer.

## 2. Product Model

The product is a 3-step writing platform:

1. Uninterrupted freewrite
2. Auto-annotated first draft, generated from a constellation of citations, counterarguments, and issues
3. Uninterrupted final draft

Internally, that breaks into four runtime stages:

1. **Freewrite session** - low-latency editor, timer, local persistence, no AI interruptions
2. **Constellation pass** - claim extraction, source retrieval, counterarguments, issue finding, provenance capture
3. **Annotation pass** - convert accepted findings into anchored notes on the draft
4. **Final draft session** - clean editing mode with annotations available but not dominating

Constellation is the bridge between the first and second steps. It is not a separate product.

## 3. Current Status

Today the repo contains:

- Better Auth integration
- a protected TipTap editor
- local-first persistence
- sprint timer and board transition shell
- theme support
- Playwright E2E coverage for auth, editor, sprint, theme, and navigation

The constellation intelligence, source retrieval, annotation pipeline, and dedicated final-draft mode are the next architecture layers to add.

## 4. Layered Architecture

```text
app/        -> Next.js shell, routes, rendering, client interaction
infra/      -> auth, database, retrieval, extraction, model, job adapters
domain/     -> pure types, invariants, ranking, annotation rules, ports
```

Dependencies point inward:

- `app/` can import from `infra/` and `domain/`
- `infra/` can import from `domain/`
- `domain/` imports only from `domain/` and the language standard library

## 5. Target Module Shape

This is the target shape of the system, not a claim that every module already exists.

```text
src/
  domain/
    types/
      result.ts
      errors.ts
      branded.ts
    editor/
      interaction-core.ts
    freewrite/
      sprint.ts
      draft.ts
      draft.schemas.ts
      draft.repository.ts
    constellation/
      claim.ts
      source.ts
      citation.ts
      counterargument.ts
      issue.ts
      constellation-run.ts
      constellation.repository.ts
      retrieval.port.ts
      analysis.port.ts
    annotation/
      annotation.ts
      annotation.schemas.ts
      annotation.repository.ts
      annotation-application.ts

  infra/
    auth/
    db/
    retrieval/
    extraction/
    llm/
    jobs/

  app/
    (auth)/
    (protected)/
      editor/
      constellation/
      draft/
```

The current repo only implements a subset of this shape, which is expected.

## 6. Domain Rules

### 6.1 Zero external imports

Files under `domain/` must not import from Next.js, React, Drizzle, Better Auth, or model SDKs.

### 6.2 Pure functions only

Domain code must not call:

- `Date.now()`
- `new Date()`
- `Math.random()`
- `fetch`
- `console`

Pass time, randomness, and fetched data in as parameters.

### 6.3 Result-based error handling

Expected business failures should return typed `Result<T, E>` values.

Examples:

- empty draft
- invalid callback URL
- unsupported citation shape
- missing provenance
- annotation anchor not found

### 6.4 Ports describe what the core needs

Domain ports should define the contract for infrastructure without saying how it is implemented.

```ts
export interface RetrievalPort {
  findSourcesForClaim(claim: Claim): Promise<Result<RetrievedSource[], RetrievalError>>;
}
```

### 6.5 Provenance is a domain concern

Constellation output is only useful if it remains explainable.

The domain should model enough structure to answer:

- which claim triggered a finding
- whether a finding is support, complication, contradiction, or issue
- which source backs it
- whether the content is sourced evidence, model inference, or heuristic feedback

Provenance is not "just UI metadata". It is part of the product's trust model.

### 6.6 No ghostwriting is a domain invariant

The system can challenge, annotate, and summarize. It cannot silently author the user's draft.

That rule should be enforced in pure validation logic, not left to prompt wording alone.

## 7. Infrastructure Rules

### 7.1 Adapters stay thin

Infrastructure should:

- perform I/O
- translate external payloads into domain types
- catch adapter-specific errors
- return domain-shaped results

It should not become a second business-logic layer.

### 7.2 Separate the typing path from the research path

The editor path must stay fast:

- local persistence
- minimal synchronous work during typing
- no blocking retrieval or annotation generation

The constellation and annotation paths can be asynchronous:

- background jobs
- streaming progress
- cached retrieval results

### 7.3 Schema drift is real

The DB schema should follow the product stages, not stale roadmap assumptions.

Current reality:

- the checked-in schema currently covers auth tables

Target additions:

- draft and draft versions
- constellation runs and claims
- sources and citations
- annotations and resolution state

## 8. App Shell Rules

### 8.1 Freewrite UI is not review UI

Do not mix active drafting with heavy critique chrome.

The app layer should preserve mode boundaries:

- freewrite surface
- constellation exploration
- annotation review
- final draft

### 8.2 Route handlers and actions stay thin

Each route/action should:

1. validate input
2. call domain logic through adapters
3. map the result to UI or HTTP output

### 8.3 Client components own interaction state

Client components can manage:

- editor selection
- open/closed panels
- sprint menu state
- active annotation selection

They should not own business rules like:

- whether a citation is valid
- whether an annotation can be applied
- whether a counterargument meets provenance requirements

## 9. Data Model Direction

A reasonable near-term data model is:

- `user`, `session`, `account`, `verification`
- `draft`
- `draft_version`
- `constellation_run`
- `claim`
- `source`
- `citation`
- `counterargument`
- `issue`
- `annotation`
- `annotation_resolution`

Not every stage needs to land at once. The important rule is that the data model should match the current product loop, not older publish/library assumptions.

## 10. Testing Strategy

### 10.1 Unit tests

Scope:

- pure domain logic
- editor interaction helpers
- ranking/filtering logic
- provenance validators
- annotation application rules

### 10.2 E2E tests

The executable workflow contract lives in:

- `eval/*.json`
- `test/e2e/*.pw.ts`

Current flows cover:

- auth
- editor behavior
- sprint timer and board transition
- theme
- navigation

Next flows to add:

- constellation retrieval and presentation
- annotation generation and navigation
- final-draft mode

### 10.3 Contract tests

When retrieval and model adapters arrive, add contract tests for:

- source metadata parsing
- provenance completeness
- ghostwriting rejection
- structured annotation output

## 11. Feature Workflow

Every meaningful feature should land in this order:

1. Define domain types and invariants.
2. Write unit tests for the pure logic.
3. Define the required ports.
4. Implement infrastructure adapters.
5. Wire the UI shell.
6. Add or update `eval/*.json` and `test/e2e/*.pw.ts`.

If the feature cannot be described as a user workflow and a typed domain contract, it is not ready to ship.

## 12. Explicitly Removed From the Core Story

These may return later, but they are not the current architecture center:

- public publishing pages
- portfolio dashboards
- social sharing surfaces
- standalone evidence libraries as the main product surface

The architecture should optimize for the writing loop we are actually building:

freewrite -> constellation -> annotated first draft -> final draft
