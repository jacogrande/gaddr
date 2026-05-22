# Plan — Trigger Detector Redesign Review

## Scope

Review the trigger detector rewrite shipped in commits `b51cbe8` (detector + hook), `0539461` (tests), `c62626e` (docs). This implements all three phases of the redesign described in `docs/research/trigger-units-and-cadence.md`.

## What Changed

| Area | Files |
|---|---|
| Detector domain | `src/domain/editor/trigger-detector.ts` — full rewrite |
| Hook | `src/app/(protected)/editor/use-trigger-detector.ts` — new options, burst tracking, async gate |
| Tests | `test/unit/editor/trigger-detector.test.ts` — 35 tests covering boundaries, triggers, adaptive |
| Docs | `docs/research/trigger-units-and-cadence.md` — new research + implementation notes |
| Docs | `docs/research/background-inference-during-freewrite.md` — stale trigger names updated |

## Architectural Decisions

1. **Triggers carry metadata.** `TriggerEmission` includes `boundary`, `pauseDurationMs`, `thresholdMs`. Downstream consumers route on the metadata.
2. **Detector stays pure and sync.** Async completion check lives in the hook layer (Phase 3 pluggable interface), not in the domain. Domain emits candidates; hook gates delivery.
3. **State carries pause history.** Phase 2 calibration ringbuffer lives in `TriggerDetectorState` so the detector remains a pure function of state + event.
4. **Startup state suppresses initial pauses.** `lastEditAtMs` and `lastTriggerAtMs` both initialize to creation time, so `production-pause` doesn't fire just because time passed since mount.

## Verification

- `bun run typecheck` — PASS
- `bun run lint` — PASS
- `bun test` — 61 pass / 0 fail, 99 expect() calls

## Known Issue (review finding)

The hook updates `lastDeliveredTextRef` synchronously when triggers fire, *before* the async completion check resolves. If a Phase 3 check rejects a trigger, the burst tracking has already advanced — the next delivered trigger will receive a burst missing the rejected trigger's content. Not active until a real `semanticCompletionCheck` is wired; flagged as High for that moment.
