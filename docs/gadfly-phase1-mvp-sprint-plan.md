# Gadfly Phase 1 MVP Sprint Plan

## Goal

Ship a clean, non-intrusive Gadfly reviewer that runs in the background while the user writes, plus a dev-only debug pane for prompt/response/token visibility.

## Scope

In scope:

1. Debounced analysis while typing.
2. Inline sentence highlights.
3. Hover card with Socratic feedback.
4. No-ghostwriting safeguards.
5. Dev-only debug side pane with full request/response visibility.

Out of scope:

1. Multi-pass agent workflows.
2. Research/counterpoint tools.
3. Production-visible debug UI.

## Sprint Deliverables

1. `POST /api/gadfly/analyze` route.
2. Anthropic Gadfly adapter with structured tool outputs.
3. Domain validators for request/action parsing and anti-ghostwriting checks.
4. Debounced client hook with cancellation for stale requests.
5. Inline highlight extension for TipTap.
6. Hover card UX for explanations/questions.
7. Dev-only debug pane with:
   - outbound payload
   - inbound payload
   - token usage
   - latency
   - request status/errors

## UX Behavior (Phase 1)

1. User types normally.
2. After 600ms idle, changed ranges are analyzed.
3. If user continues typing, stale request is aborted.
4. Gadfly highlights weak sentences.
5. Hovering a highlight shows:
   - diagnosis
   - high-level rule
   - one Socratic question
6. Debug pane is hidden by default and toggled in dev mode with `Cmd/Ctrl+Shift+D`.

## Technical Contracts

### Request

```ts
type GadflyAnalyzeRequest = {
  noteId: string;
  docVersion: number;
  changedRanges: Array<{ from: number; to: number }>;
  plainText: string;
  contextWindow: Array<{ from: number; to: number; text: string }>;
};
```

### Response

```ts
type GadflyAnalyzeResponse = {
  requestId: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  latencyMs: number;
  actions: GadflyAction[];
  droppedArtifacts: Array<{ reason: string; artifactSnippet: string }>;
  rawResponse: unknown;
};
```

## Guardrails

1. Prompt-level no-ghostwriting policy.
2. Tool schema excludes rewrite fields.
3. Domain validator rejects rewrite-like patterns.
4. Invalid artifacts are dropped and logged.

## Testing

1. Unit: parsing/validation and action merge logic.
2. Integration: API route status + response shape.
3. E2E: typing flow, debug pane visibility, non-blocking UX.

## Acceptance Criteria

1. Typing remains responsive with Gadfly enabled.
2. Highlights/hover cards appear without opening intrusive UI.
3. Debug pane shows exact request/response and token usage in dev.
4. Rewriting suggestions are rejected by guardrails.
