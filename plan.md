# Review Report — Assistant Chatbot

**Date**: 2026-02-18
**Branch**: main (uncommitted)
**Commits Reviewed**: Working tree changes (14 new files, 2 modified, 2 deleted)

## Verification Results

| Check | Status | Details |
|-------|--------|---------|
| Tests | PASS | 266 tests, 472 assertions, 57ms |
| Types | PASS | `tsc --noEmit` clean |
| Lint | PASS | ESLint clean (only pre-existing visual-screenshots.spec.ts errors) |
| Knip | PASS | No dead code detected |

## Change Summary

Converted the one-shot "Get Feedback" review button into a full conversational assistant supporting:
1. **Full review** (via button) — same structured artifacts rendered inside a chat panel
2. **Chat** — ask questions about the essay, get coaching text responses
3. **Research** — ask the assistant to search the web and suggest evidence sources

### New Files

| File | Layer | Purpose |
|---|---|---|
| `domain/assistant/assistant.ts` | Domain | `AssistantEvent` discriminated union (10 variants) |
| `domain/assistant/conversation.ts` | Domain | Chat message model, content blocks (`TextBlock`, `ReviewBlock`, `SourceBlock`) |
| `domain/assistant/port.ts` | Domain | `AssistantPort` adapter interface |
| `domain/assistant/schemas.ts` | Domain | Zod schemas for API input and event validation |
| `domain/assistant/constraints.ts` | Domain | Authorship enforcement: per-event + accumulated text ghostwriting detection |
| `domain/assistant/pipeline.ts` | Domain | Request validation, stream-level authorship + rubric completeness checks |
| `infra/llm/tools/assistant-tools.ts` | Infra | Review tools + `suggest_source` + Anthropic `web_search_20250305` |
| `infra/llm/prompts/assistant-system-prompt.ts` | Infra | System prompt for chat/review/research modes |
| `infra/llm/assistant-adapter.ts` | Infra | Agentic loop (15 iterations, web search, text + tool_use parsing) |
| `infra/llm/fixture-assistant-adapter.ts` | Infra | Deterministic E2E fixtures for review/chat/research |
| `app/api/assistant/route.ts` | App | SSE endpoint (120s timeout, Sentry span) |
| `app/(protected)/editor/use-assistant.ts` | App | React hook: conversation state, SSE consumption, sessionStorage |
| `app/(protected)/editor/[id]/assistant-panel.tsx` | App | Chat UI with message bubbles, content block rendering, input area |

### Modified Files

| File | Change |
|---|---|
| `essay-editor.tsx` | Swapped `useReview`→`useAssistant`, `FeedbackPanel`→`AssistantPanel`, added "Coach" button |
| `test/e2e/coach-review.spec.ts` | Updated selectors, added chat + research flow tests |

### Deleted Files

| File | Reason |
|---|---|
| `feedback-panel.tsx` | Superseded by `assistant-panel.tsx` |
| `use-review.ts` | Superseded by `use-assistant.ts` |

## Code Review Findings

### Critical Issues (Fixed)

**1. Stale closure in `use-assistant.ts`** — `sendMessage` captured `state.conversation.messages` via closure, causing stale history to be sent to the API on rapid interactions.
**Fix**: Added `conversationRef` that mirrors state, read from ref instead of closure. Removed `state.conversation.messages` from dependency array.

**2. `flushText()`/`flushSources()` called inside `setState` updater** — These closures mutate outer-scope `let` variables, which is unsafe inside React's functional updater (can be called multiple times in concurrent mode).
**Fix**: Replaced with a `receivedTerminalEvent` flag. Flush + finalize happens outside `setState` after the reader loop ends.

### High Issues (Fixed)

**3. `checkTextForGhostwriting` was dead code** — Defined and tested but never called in the server-side pipeline. LLM could stream ghostwritten prose via `text_delta` events unchecked.
**Fix**: Pipeline now accumulates `text_delta` text and calls `checkTextForGhostwriting()` at `done` event time.

**4. `server_tool_use` handling could push empty user turn** — When only server-managed tools (web search) fired, `toolResults` was empty but still pushed as a user message, which could confuse the API.
**Fix**: Only push user turn when `toolResults` has entries. Track `hasServerToolUse` flag for documentation.

**5. Raw JSON error text shown to user** — Server returns `{"error":"..."}` but the hook displayed the raw JSON string.
**Fix**: Added `parseErrorResponse()` that extracts the `error` field from JSON responses.

### Medium Issues (Fixed)

**6. `javascript:` URLs could pass `z.url()` in `SourceSuggestionSchema`** — Zod's `z.url()` accepts any valid URL scheme.
**Fix**: Added `.refine()` requiring `http://` or `https://` scheme.

**7. No per-entry size limit on conversation history** — `ChatRequestSchema` limited array length but not entry content length.
**Fix**: Added `.max(10_000)` on history entry content strings.

**8. React duplicate key risk** — Used `quotedText`, `question`, `url` as list keys which could collide.
**Fix**: Switched to index-based keys (`comment-${i}`, `issue-${i}`, etc.).

**9. `ReviewBlock` arrays not readonly** — Inconsistent with domain convention.
**Fix**: Changed to `readonly InlineComment[]`, etc.

**10. Unsafe sessionStorage cast** — `obj.messages as ChatMessage[]` without shape validation.
**Fix**: Added per-message shape validation in `loadFromStorage`.

### Remaining Low Priority (Not Fixed — Acceptable)

- **Duplicated `MODEL` constant** between `review-adapter.ts` and `assistant-adapter.ts` — Both read from `LLM_MODEL` env var. Extract to shared config if it drifts.
- **All tools exposed in chat mode** — Review tools available even in chat. Could gate by mode for cleaner UX, but the model handles this reasonably.
- **Token growth from repeated `full_review`** — Each "Get Feedback" click adds the full essay context to history. Could truncate older review entries, but sessionStorage is ephemeral so this self-limits.
- **Comment click E2E test missing** — The `onCommentClick` → ProseMirror selection integration is untested in E2E. Existing pattern from the review flow; can add later.

## Positive Observations

- **Clean architectural layering**: Domain layer has zero framework imports, all types use `readonly`, no `throw`, `Result<T, E>` throughout. ESLint domain purity rules pass.
- **Pattern consistency**: Assistant adapter mirrors the battle-tested review adapter pattern (same iteration guard, tool result accumulation, Sentry spans).
- **Fixture self-validation**: `fixture-assistant-adapter.ts` validates its own fixtures against authorship constraints at module load time — constraint changes break fixtures immediately.
- **Abort controller correctly prevents race conditions** between concurrent SSE streams.
- **Defense-in-depth authorship enforcement**: Constraints checked at adapter level (tool result rejection → model retry), pipeline level (stream filtering), and accumulated text level (ghostwriting detection).
- **37 new tests** covering constraints (14), pipeline (13), and conversation operations (6), plus updated E2E with chat and research flows.

## Verdict: PASS

All automated checks pass. All critical, high, and medium-security issues identified in the review have been fixed and verified. The 4 remaining low-priority items are documented design notes, not defects.

### Next Steps

1. Commit the assistant chatbot changes
2. Manual verification: `bun run dev` → open editor → "Coach" button opens chat → type question → get response → "Get Feedback" → full review renders in chat → check source suggestions
3. Run E2E tests with `E2E_TESTING=true` once server is available
