# Plan — Intelligence Layer Foundations & Timer UX

## Scope of Work Reviewed

This branch lands the substrate for the intelligence layer plus a substantial timer/wizard UX redesign.

## What Shipped (Committed)

| Area | Files |
|---|---|
| Trigger detector domain | `src/domain/editor/trigger-detector.ts` |
| Trigger detector hook | `src/app/(protected)/editor/use-trigger-detector.ts` |
| Trigger detector tests | `test/unit/editor/trigger-detector.test.ts` (20 tests) |
| Freewrite wizard | `src/app/(protected)/editor/freewrite-wizard.tsx` |
| Intelligence roadmap doc | `docs/intelligence-roadmap.md` |
| Background-inference research doc | `docs/research/background-inference-during-freewrite.md` |
| Editor wiring | `src/app/(protected)/editor/minimal-editor.tsx` |

## What Shipped (Uncommitted at Review Time)

| Area | Files |
|---|---|
| Sprint state persistence | `src/app/(protected)/editor/sprint-persistence.ts` |
| Resume option in wizard | `src/app/(protected)/editor/freewrite-wizard.tsx` |
| New-freewrite CTA in board | `src/app/(protected)/editor/canvas-flow.tsx`, `src/app/globals.css` |
| Persistence wiring, 1h staleness check, pause-on-leave, board-on-refresh, hover-driven timer controls (pause/play/+1m/stop) | `src/app/(protected)/editor/minimal-editor.tsx` |

## Architectural Decisions

1. **Trigger detector lives in `src/domain/editor/`** as a pure state machine. React adapter is the hook in the app layer. No framework deps in domain.
2. **Four trigger reasons:** `paragraph-ended`, `question-posed`, `idle-pause`, `word-volume`. Structural triggers (paragraph, question) ignore token gates; volume triggers (idle-pause, word-volume) gate on tokens since last fire.
3. **Sprint persistence uses absolute timestamps** (`endsAtMs`, `lastActiveAtMs`) so refresh continues the timer accurately, with absence-shift on restore to achieve "pause on leave" without explicit pause events.
4. **1-hour staleness threshold** (was 6h initially, lowered per user request). Beyond that, the wizard reappears with a "resume previous" affordance.
5. **Timer popover replaced** by hover-driven column of pause/play, +1m, and stop buttons. 1s debounce on hover-leave; controls stay open while paused.
6. **Board appears on refresh in completed phase** via `transition_in` set from the restoration effect, bypassing the 3s idle wait.

## Known Limitations / TODOs

1. **`minimal-editor.tsx` is 1525 lines.** Multiple concerns (sprint state, wizard, board, hover controls, slash menu, command palette, modifier badges, persistence) are intermingled. Custom-hook extraction is the right follow-up.
2. **No sign-out path from the editor.** `SignOutButton` was orphaned when the popover was removed. Not yet relocated.
3. **No E2E coverage** for the new flows (wizard, hover controls, resume, board refresh, new-freewrite CTA).
4. **`console.log` default observer** in the trigger detector is intentional for trial-and-error tuning. Must be gated before LLM wiring.
5. **Triggers fire regardless of sprint state.** Trial-and-error mode. Should sprint-gate before LLM calls go live.

## Verification

- `bun run typecheck` — PASS
- `bun run lint` — PASS
- `bun test` — 31 pass, 0 fail
