# Infra Doc - 3-Step Writing Platform

## 1. Goal

Ship a writing platform that supports:

1. uninterrupted freewrite
2. a source-grounded constellation pass
3. auto-annotated first draft
4. uninterrupted final draft

The key infra decision is to keep the typing path fast while allowing the research and annotation path to do heavier work in the background.

## 2. Recommended Stack

### App and Hosting

- **Next.js (App Router) + TypeScript**
- deploy on **Vercel**

Use the web app for:

- editor UI
- auth routes
- protected app pages
- thin route handlers and server actions

### Auth

- **Better Auth**
- DB-backed sessions in Postgres

### Database

- **Postgres** via Drizzle ORM

Use it for:

- auth tables
- draft persistence
- constellation runs
- findings and provenance
- annotations
- versioning / resolution state

### Retrieval and Analysis

Keep this vendor-agnostic in the docs.

You will need adapters for:

- source discovery / search
- source fetch or extraction
- structured model analysis

Those adapters should live behind domain ports so providers can change without rewriting product logic.

### Background Work

Freewrite should stay synchronous and low-latency.

Constellation and annotation generation should be designed so they can run:

- inline for small loads early on, or
- on a background worker / queue once latency becomes a problem

The architecture should not assume every constellation run can finish inside a single request forever.

## 3. Runtime Components

### 3.1 Web App

Responsibilities:

- render freewrite editor
- render constellation board
- render annotated first draft
- render final draft mode
- authenticate users
- kick off constellation / annotation runs

### 3.2 Postgres

Responsibilities:

- durable persistence
- session state
- draft versions
- constellation runs and findings
- annotations and resolution state

### 3.3 Retrieval Adapter

Responsibilities:

- discover relevant sources for extracted claims
- return source metadata in a normalized format

### 3.4 Extraction Adapter

Responsibilities:

- fetch source details when needed
- normalize titles, URLs, snippets, authors, dates, and excerpts

### 3.5 Analysis Adapter

Responsibilities:

- map claims to supporting or challenging material
- generate structured issues and counterarguments
- generate annotation candidates

### 3.6 Optional Worker

Add a worker when:

- retrieval chains take too long
- source fetching fans out across many URLs
- annotation generation becomes too expensive for request time budgets

## 4. Data Flow

### 4.1 Freewrite

Flow:

- user writes in the editor
- draft persists locally immediately
- server-side persistence can happen asynchronously
- no retrieval or annotation work should block typing

### 4.2 Constellation

Flow:

- sprint completes or user explicitly requests analysis
- system snapshots the draft
- claims are extracted
- sources are discovered and normalized
- counterarguments and issues are generated
- findings are stored with provenance

### 4.3 Annotation

Flow:

- accepted or selected constellation findings are transformed into annotations
- annotations are anchored to the draft
- the first draft is reopened with notes attached

### 4.4 Final Draft

Flow:

- the user enters a cleaner writing mode
- annotations remain available on demand
- resolved and ignored state is persisted
- a later draft version can be stored without losing review history

## 5. Suggested Data Model

Current schema reality in the repo is still auth-focused. The target product schema should grow toward:

- `user`
- `session`
- `account`
- `verification`
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

Not all tables need to ship at once. The important point is that the data model should follow the current product loop.

## 6. Performance Rules

### 6.1 Freewrite path

The freewrite path must be lightweight:

- local-first persistence
- no blocking network work
- no synchronous full-document analysis on keystrokes
- no expensive UI recomputation tied to typing cadence

### 6.2 Review path

Constellation and annotation work can be slower, but should still be:

- observable
- cancelable or restartable
- resumable after failure

### 6.3 Final draft path

Final draft mode should inherit the same low-latency rules as freewrite mode.

## 7. Trust and Safety Rules

### 7.1 Provenance is mandatory

Every surfaced citation should preserve enough metadata to inspect its origin.

### 7.2 No ghostwriting

The infrastructure should not normalize or store generated replacement prose as if it were a valid annotation or citation.

### 7.3 Separate evidence from inference

The system should store whether a finding is:

- directly source-backed
- model-inferred
- heuristic writing feedback

That distinction matters for both UX and debugging.

## 8. Environments

- **Local**: fastest loop for editor and harness work
- **Preview**: per-PR deployments on Vercel
- **Production**: main branch deployment

If constellation runs become asynchronous, keep the same environment split for workers and any queue infrastructure.

## 9. Observability

Minimum useful observability:

- route and job failure logging
- constellation run status and timing
- source fetch failure counts
- annotation generation success / failure
- editor latency regressions caught in tests

Do not wait for a full observability stack before instrumenting the constellation pipeline. Basic structured logs are enough to start.

## 10. Deployment Checklist

1. Web app deploys cleanly.
2. Auth secrets and database URL are configured.
3. Migrations are applied.
4. Protected editor works.
5. E2E harness passes for the current covered flows.
6. Constellation and annotation adapters are configured before those features are enabled.

## 11. Practical Recommendation

Start with:

- Next.js on Vercel
- Better Auth in-app
- Postgres as the primary store
- thin retrieval / extraction / analysis adapters behind ports

Add a worker only when constellation latency or fan-out justifies it.

The system should be architected for asynchronous review work now, even if the first version still runs inline.
