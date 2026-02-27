# Gadfly Technical Design

## 1. Purpose

Define the architecture for a built-in LLM Gadfly that improves writing quality without writing on the user's behalf.

The Gadfly is invisible by default. It appears only as contextual annotations in the editor.

## 2. Product Invariant

The Gadfly must never generate replacement prose for the user.

Allowed output:

1. Diagnosis of a specific writing issue.
2. High-level rule explanation.
3. Socratic question that helps the user revise.
4. Severity and category metadata.

Disallowed output:

1. Rewrite suggestions.
2. "Replace with..." text.
3. Full sentence or paragraph alternatives.
4. Auto-inserted prose.

## 3. Canonical Terminology

Use these terms consistently across docs, APIs, and UI copy:

1. `GadflyReview`
2. `gadfly feedback`
3. `gadfly artifacts`
4. `gadfly-review` naming for routes/tests

## 4. UX Behavior

1. User types normally in the editor.
2. Editor captures incremental changes (diffs + current doc state).
3. Analysis is debounced and sent to the Gadfly API.
4. API returns annotation tool calls (add/update/remove).
5. Editor highlights affected text spans.
6. Hovering a highlight shows a compact side comment with:
   - Why the sentence is weak.
   - Which high-level writing rule is being violated.
   - One Socratic question.

No separate chat panel. No AI composition surface.

## 5. Architecture (Hexagonal Fit)

### 5.1 App Layer (UI + Transport)

1. Capture editor transactions and produce changed ranges.
2. Debounce outbound analysis calls.
3. Render highlights and hover cards.
4. Keep typing path non-blocking (network never blocks key handling).

### 5.2 Domain Layer (Pure Core)

1. `analyzeCandidateRanges`: decides which ranges are worth analysis.
2. `validateGadflyArtifact`: rejects ghostwriting-like outputs.
3. `mergeAnnotations`: stable add/update/remove semantics.
4. `resolveAnchor`: rebases annotations after document edits.

All domain functions are deterministic and testable without UI.

### 5.3 Infra Layer (LLM Adapter + Persistence)

1. `GadflyPort` for model calls.
2. Anthropic adapter implementing tool-use loop.
3. Structured output validation at adapter boundary.
4. Optional persistence for annotation history/telemetry.

## 6. Data Contracts

```ts
type GadflyAnchor = {
  blockId: string;
  from: number;
  to: number;
  quote: string;
};

type GadflyAnnotation = {
  id: string;
  anchor: GadflyAnchor;
  category: "clarity" | "structure" | "evidence" | "tone" | "logic";
  severity: "low" | "medium" | "high";
  explanation: string;
  rule: string;
  question: string;
};

type GadflyAction =
  | { type: "annotate"; annotation: GadflyAnnotation }
  | { type: "clear"; annotationId: string };
```

Tool payloads must not include any field intended for replacement text.

## 7. Request Flow

`POST /api/gadfly/analyze`

```ts
type GadflyAnalyzeRequest = {
  noteId: string;
  docVersion: number;
  changedRanges: Array<{ from: number; to: number }>;
  plainText: string;
  contextWindow: Array<{ from: number; to: number; text: string }>;
};
```

Pipeline:

1. Validate request schema.
2. Build focused context from changed ranges.
3. Call Gadfly adapter with tool schema.
4. Filter/validate returned artifacts.
5. Return normalized `GadflyAction[]`.

## 8. Anti-Ghostwriting Guardrails

Defense in depth:

1. Prompt-level constraints (no rewriting policy).
2. Tool schema without rewrite fields.
3. Domain validation rejects imperative rewrite patterns.
4. Response sanitizer strips unsafe artifacts.
5. Contract tests enforce the invariant continuously.

Example rejection patterns:

1. `replace with`
2. `rewrite as`
3. `change to`
4. Backtick-wrapped sentence alternatives

## 9. Performance Budgets

1. Keydown-to-paint: under 16 ms target.
2. Analysis debounce: 400-700 ms after idle typing.
3. Max one in-flight analyze request per editor.
4. Abort stale requests when new edits arrive.
5. Annotation render updates in under 8 ms target.

Implementation notes:

1. Compute diffs incrementally from editor transactions.
2. Use request cancellation (`AbortController`) aggressively.
3. Avoid full-document re-analysis on every keystroke.
4. Keep all heavy parsing off the keydown path.

## 10. Extensibility Model

Future Gadfly capabilities should use namespaced tools:

1. `writing.*` for sentence-level quality guidance.
2. `research.*` for evidence-gathering prompts.
3. `counterpoint.*` for adversarial thinking prompts.
4. `question.*` for Socratic probes.

Each namespace must preserve the same no-ghostwriting policy.

## 11. Testing Strategy

### 11.1 Unit (Domain)

1. Artifact validation and rejection rules.
2. Annotation merge and rebase logic.
3. Range-selection heuristics.

### 11.2 Contract (LLM Adapter)

1. Tool-call parsing from real provider payloads.
2. Ghostwriting rejection against adversarial outputs.
3. Schema compatibility across model versions.

### 11.3 E2E (Playwright)

1. Typing remains smooth with Gadfly enabled.
2. Highlights appear on problematic sentences only.
3. Hover card content is explanatory, not rewriting.
4. Editing invalidates or reanchors stale annotations.

## 12. Rollout Plan

1. Phase 1: sentence diagnostics + hover explanations.
2. Phase 2: stronger anchor rebasing and telemetry.
3. Phase 3: add `research.*` and `counterpoint.*` namespaces.
4. Phase 4: tuning pass using latency + usefulness metrics.
