"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import type { SprintPhase } from "../../../domain/editor/sprint";
import type { SprintId } from "../../../domain/types/branded";
import {
  countWords,
  hasMinimumGround,
  hashSprintId,
  isCacheServable,
  selectSpark,
} from "../../../domain/spark/select-spark";
import {
  initialSparkSession,
  sparkSession,
  type SparkSessionEvent,
  type SparkSessionState,
} from "../../../domain/spark/spark-session";
import type { SparkLens } from "../../../domain/spark/types";
import { SPARK_PROMPT_VERSION } from "../../../infra/llm/prompts/spark";
import type { TriggerObserver } from "./use-trigger-detector";
import {
  SPARK_EVENT_FLUSH_BATCH_SIZE,
  SPARK_EVENT_FLUSH_INTERVAL_MS,
  SPARK_EVENT_MAX_BATCH,
  SUMMON_FALLBACK_TIMEOUT_MS,
  buildDismissedEvent,
  buildFadedEvent,
  buildInsufficientGroundEvent,
  buildRerolledEvent,
  buildServedEvent,
  cacheAgeMs,
  elapsedMs,
  eventCandidate,
  parseGenerateResponse,
  shouldAcceptSettle,
  shouldPrepare,
  shouldSettlePrepare,
  sprintLeaveDetail,
  telemetryEmitMode,
  telemetryForTransition,
  toCandidateSet,
  wordsSincePrepare,
  type ActiveCard,
  type ClientSparkEventPayload,
  type SparkCache,
  type TransitionTelemetry,
} from "./spark-glue";

const DRAFT_BLOCK_SEPARATOR = "\n\n";
const SPARK_GENERATE_ENDPOINT = "/api/spark";
const SPARK_EVENTS_ENDPOINT = "/api/spark/events";

export type UseSparkOptions = {
  readonly editor: TiptapEditor | null;
  /** The durable sprint id (plan §3.6), or null while idle. Cache + reducer reset
   * on *id change*, never on the running edge — mirroring `use-background-inference`. */
  readonly sprintId: SprintId | null;
  readonly sprintPhase: SprintPhase;
};

export type UseSparkResult = {
  /** Spark's consumer of the SINGLE trigger stream. `minimal-editor` composes one
   * combined observer fanning out to this and to `inference.observe`; a second
   * `useTriggerDetector` is forbidden (plan §5.1). */
  readonly observe: TriggerObserver;
  /** The card lifecycle state for rendering (the affordance is state-independent). */
  readonly state: SparkSessionState;
  /** ⌘. or affordance click. */
  readonly summon: () => void;
  /** "Different spark" — the one permitted re-roll. */
  readonly reroll: () => void;
  /** Fed from the editor's existing `onUpdate` stream (plan §5.1: reuse it, don't
   * add a second editor listener): the re-arm / card-end signal. */
  readonly notifyEdit: () => void;
};

/**
 * The lifecycle glue for Spark (the `use-background-inference` philosophy: the
 * hook wires; every decision delegates to the pure modules). It holds the reducer
 * state and the candidate cache, consumes the trigger stream as a SECOND consumer
 * for pre-warm, resolves a summon against the cache (or a fallback request), and
 * batches durable events — all while honoring the §5.3 contract: pre-warm and
 * event logging cause NO render, class change, cursor, or scroll effect.
 */
export function useSpark({
  editor,
  sprintId,
  sprintPhase,
}: UseSparkOptions): UseSparkResult {
  const [state, setState] = useState<SparkSessionState>(initialSparkSession);

  // `stateRef` mirrors `state` so `dispatchSpark` can compute the transition and
  // its telemetry OUTSIDE a setState updater — React double-invokes updaters in
  // StrictMode, which would double-log; keeping side effects out of the updater
  // is what makes the hook StrictMode-safe here.
  const stateRef = useRef<SparkSessionState>(state);

  // Live values captured for closures that run long after render (async resolves,
  // key handlers). Assigned during render, the file's established idiom.
  const editorRef = useRef<TiptapEditor | null>(editor);
  editorRef.current = editor;
  const sprintIdRef = useRef<SprintId | null>(sprintId);
  sprintIdRef.current = sprintId;
  const sprintPhaseRef = useRef<SprintPhase>(sprintPhase);
  sprintPhaseRef.current = sprintPhase;

  const cacheRef = useRef<SparkCache | null>(null);
  const servedLensesRef = useRef<readonly SparkLens[]>([]);
  const lastPreparedWordCountRef = useRef<number | null>(null);
  const prepareInFlightRef = useRef(false);
  const activeCardRef = useRef<ActiveCard | null>(null);
  const sprintStartedAtMsRef = useRef<number>(Date.now());
  const lastResetSprintIdRef = useRef<SprintId | null>(null);
  const wasRunningRef = useRef(false);
  // Monotonic request sequence: every generate request (prepare OR summon)
  // captures the next value at FIRE time, and the cache records the seq that
  // wrote it — so a stale settle can never regress a fresher one (plan §3.3
  // staleness; see `shouldAcceptSettle`). Never reset: a reload/new sprint
  // clears the cache (cacheSeq → null), so monotonicity across sprints is fine.
  const requestSeqRef = useRef(0);
  // Latches the below-minimum-ground `failed`/`insufficient-ground` log to at
  // most once per resting period, so a held ⌘. (OS key auto-repeat, ~15–30/s)
  // cannot flood durable rows. Cleared on the next edit (re-arm) and on reset.
  const insufficientGroundLoggedRef = useRef(false);
  // The prepare-time metadata of the SET a candidate about to be dispatched was
  // selected from. Each dispatch site stamps this immediately before a
  // candidate-bearing dispatch; `dispatchSpark` consumes it (one-shot) when
  // building the active card. Reading `cacheRef` at dispatch time instead would
  // race the keep-freshest rule: a fresher prepare may have won the cache while
  // a summon serves its OWN response, and the served/faded staleness telemetry
  // would then describe the wrong preparation.
  const pendingServeContextRef = useRef<{
    readonly preparedAtMs: number;
    readonly preparedWordCount: number;
    readonly promptVersion: string;
  } | null>(null);

  const queueRef = useRef<ClientSparkEventPayload[]>([]);
  const flushTimerRef = useRef<number | null>(null);

  // Unmount cancellation for the summon-fallback path (plan §5.1: the sprint-id
  // guard covers sprint changes but not unmount). `mountedRef` gates every
  // dispatch from that async path, and `summonTimeoutRef` tracks the pending
  // fizzle timer so the unmount cleanup can clear it — a dead instance must
  // neither dispatch nor leave a timer armed. One slot suffices: the reducer
  // admits at most one pending summon at a time (summon is ignored while
  // `summoning`). StrictMode-safe: the effect body re-arms the flag on the
  // simulated second mount.
  const mountedRef = useRef(true);
  const summonTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (summonTimeoutRef.current !== null) {
        window.clearTimeout(summonTimeoutRef.current);
        summonTimeoutRef.current = null;
      }
    };
  }, []);

  const readWordCount = useCallback((): number => {
    const current = editorRef.current;
    if (!current) {
      return 0;
    }
    return countWords(current.getText({ blockSeparator: DRAFT_BLOCK_SEPARATOR }));
  }, []);

  // ── Event queue: flush on size/interval, sendBeacon on pagehide (plan §5.1) ──

  const flushEvents = useCallback(() => {
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (queueRef.current.length === 0) {
      return;
    }
    const batch = queueRef.current.splice(0, queueRef.current.length);
    while (batch.length > 0) {
      const chunk = batch.splice(0, SPARK_EVENT_MAX_BATCH);
      void fetch(SPARK_EVENTS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
        keepalive: true,
      }).catch(() => undefined); // losing telemetry is acceptable; blocking the writer is not
    }
  }, []);

  const flushBeacon = useCallback(() => {
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (queueRef.current.length === 0) {
      return;
    }
    const canBeacon =
      typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function";
    if (!canBeacon) {
      flushEvents();
      return;
    }
    const batch = queueRef.current.splice(0, queueRef.current.length);
    while (batch.length > 0) {
      const chunk = batch.splice(0, SPARK_EVENT_MAX_BATCH);
      const blob = new Blob([JSON.stringify(chunk)], { type: "application/json" });
      navigator.sendBeacon(SPARK_EVENTS_ENDPOINT, blob);
    }
  }, [flushEvents]);

  const enqueueEvent = useCallback(
    (payload: ClientSparkEventPayload) => {
      queueRef.current.push(payload);
      if (queueRef.current.length >= SPARK_EVENT_FLUSH_BATCH_SIZE) {
        flushEvents();
        return;
      }
      if (flushTimerRef.current === null) {
        flushTimerRef.current = window.setTimeout(() => {
          flushTimerRef.current = null;
          flushEvents();
        }, SPARK_EVENT_FLUSH_INTERVAL_MS);
      }
    },
    [flushEvents],
  );

  // Build and enqueue the durable event a transition warrants. Reads the served
  // card's captured context (`activeCardRef`) so a `faded`/`dismissed` reports the
  // exact spark that was on screen, plus the live counts.
  //
  // The sprint id comes from the CARD, not from `sprintIdRef`: a STOP nulls the
  // live id in the same commit that ends the sprint, so a `dismissed`/`sprint-end`
  // for a card that was up at stop would otherwise be dropped (null id → early
  // return). The card carries the sprint it belongs to, so the row is attributed
  // even after the live id is gone.
  //
  // Delivery timing follows `telemetryEmitMode` (spark-glue):
  //  - keystroke-path transitions (faded, escape, served/rerolled) DEFER the
  //    O(draft) `readWordCount` + enqueue via queueMicrotask — typing latency is
  //    P0 (plan §5.3) and no draft-length work may sit on the keydown/capture
  //    path. The flush is already async, so ordering and payload content are
  //    unchanged; only the timing shifts.
  //  - phase-edge dismissals (sprint-end / sprint-paused) enqueue SYNCHRONOUSLY:
  //    they come from a stop/pause click or the timer (not the typing path), and
  //    the phase-edge effect calls flushEvents() right after the dispatch — a
  //    deferred enqueue would land AFTER that boundary flush and strand the
  //    dismissal (on STOP the reset-effect flush is also skipped via the null-id
  //    early-return, so the boundary flush is the only reliable carrier).
  // `card` is snapshotted before any deferral so a later serve cannot swap it
  // out from under a pending faded/dismissed row.
  const emitTelemetry = useCallback(
    (telemetry: TransitionTelemetry) => {
      const card = activeCardRef.current;
      if (card === null) {
        return;
      }
      const sid = card.sprintId;
      const deliver = () => {
      const now = Date.now();
      const wordCount = readWordCount();
      const sprintElapsedMs = elapsedMs(sprintStartedAtMsRef.current, now);
      const eventId = crypto.randomUUID();
      switch (telemetry.kind) {
        case "served":
          enqueueEvent(
            buildServedEvent({
              eventId,
              sprintId: sid,
              lens: card.lens,
              question: card.question,
              draftWordCount: wordCount,
              sprintElapsedMs,
              cacheAgeMs: cacheAgeMs(card.preparedAtMs, now),
              wordsSincePrepare: wordsSincePrepare(card.preparedWordCount, wordCount),
              promptVersion: card.promptVersion,
            }),
          );
          return;
        case "rerolled":
          enqueueEvent(
            buildRerolledEvent({
              eventId,
              sprintId: sid,
              lens: card.lens,
              question: card.question,
              draftWordCount: wordCount,
              sprintElapsedMs,
              promptVersion: card.promptVersion,
            }),
          );
          return;
        case "faded":
          enqueueEvent(
            buildFadedEvent({
              eventId,
              sprintId: sid,
              lens: card.lens,
              question: card.question,
              draftWordCount: wordCount,
              sprintElapsedMs,
              cacheAgeMs: cacheAgeMs(card.preparedAtMs, now),
              wordsSincePrepare: wordsSincePrepare(card.preparedWordCount, wordCount),
              promptVersion: card.promptVersion,
            }),
          );
          return;
        case "dismissed":
          enqueueEvent(
            buildDismissedEvent({
              eventId,
              sprintId: sid,
              lens: card.lens,
              question: card.question,
              detail: telemetry.detail,
              draftWordCount: wordCount,
              sprintElapsedMs,
              promptVersion: card.promptVersion,
            }),
          );
          return;
      }
      };
      if (telemetryEmitMode(telemetry) === "sync") {
        deliver();
      } else {
        queueMicrotask(deliver);
      }
    },
    [enqueueEvent, readWordCount],
  );

  // The one place reducer events are applied. Computes the next state ONCE
  // (outside setState), records the served lens + active-card context on a
  // serve/reroll, emits telemetry, then commits — reference-equal no-ops skip the
  // re-render (the reducer returns the same object for ignored events).
  //
  // Telemetry AND the served-lens append are gated on the reducer actually
  // transitioning: `telemetryForTransition` returns null when `next === prev`,
  // so an event the reducer ignores (e.g. a `reroll` after the one re-roll is
  // spent — where the bare classifier would wrongly say "rerolled") can never
  // emit telemetry or pollute the served-lens rotation state.
  const dispatchSpark = useCallback(
    (event: SparkSessionEvent) => {
      const prev = stateRef.current;
      const next = sparkSession(prev, event);
      const telemetry = telemetryForTransition(prev, event, next);

      // One-shot consume of the serve context the dispatch site stamped (see
      // `pendingServeContextRef`): cleared unconditionally so an ignored
      // dispatch (e.g. a late candidatesReady outside `summoning`) cannot leak
      // a stale context into a future serve.
      const serveContext = pendingServeContextRef.current;
      pendingServeContextRef.current = null;

      if (telemetry !== null && (telemetry.kind === "served" || telemetry.kind === "rerolled")) {
        const candidate = eventCandidate(event);
        const sid = sprintIdRef.current;
        // A serve/reroll only reaches here with a live sprint (summon and reroll
        // both early-return on a null id), so `sid` is non-null — captured onto
        // the card so a later dismissal can be attributed to this sprint even
        // after a STOP nulls the live id.
        if (candidate !== null && sid !== null) {
          servedLensesRef.current = [...servedLensesRef.current, candidate.lens];
          activeCardRef.current = {
            sprintId: sid,
            lens: candidate.lens,
            question: candidate.question,
            // From the dispatch site's stamp — the metadata of the SET this
            // candidate actually came from, immune to a fresher prepare having
            // replaced cacheRef in the meantime. The fallbacks only cover a
            // (should-be-unreachable) unstamped dispatch.
            promptVersion: serveContext?.promptVersion ?? SPARK_PROMPT_VERSION,
            preparedAtMs: serveContext?.preparedAtMs ?? Date.now(),
            preparedWordCount: serveContext?.preparedWordCount ?? readWordCount(),
          };
        }
      }

      if (telemetry !== null) {
        emitTelemetry(telemetry);
      }

      if (next !== prev) {
        stateRef.current = next;
        setState(next);
      }
    },
    [emitTelemetry, readWordCount],
  );

  // ── Pre-warm: POST reason:"prepare"; NOTHING renders (the §5.3 contract) ──────

  const firePrepare = useCallback(
    async (draft: string, wordCount: number, sid: SprintId): Promise<void> => {
      // Stamp identity + freshness at FIRE time: `seq` orders this request against
      // every other, and `firedAtMs`/`wordCount` anchor the cache to the ground
      // it was built on — never to the settle moment (a slow prepare must not
      // look fresh, plan §3.3).
      const seq = (requestSeqRef.current += 1);
      const firedAtMs = Date.now();
      const sprintElapsedMs = elapsedMs(sprintStartedAtMsRef.current, firedAtMs);
      try {
        const response = await fetch(SPARK_GENERATE_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            draft,
            draftWordCount: wordCount,
            sprintElapsedMs,
            sprintId: sid,
            reason: "prepare",
          }),
        });
        if (!response.ok) {
          return; // silent; the word-delta throttle already advanced, so we don't hammer
        }
        const data: unknown = await response.json();
        const parsed = parseGenerateResponse(data);
        if (parsed === null) {
          return;
        }
        // Write only if this is still the current sprint AND no fresher request
        // (a later prepare, or a summon-fallback) already wrote the cache.
        if (
          !shouldAcceptSettle(seq, cacheRef.current?.seq ?? null, sid, sprintIdRef.current)
        ) {
          return;
        }
        cacheRef.current = {
          set: toCandidateSet(sid, parsed),
          preparedAtMs: firedAtMs,
          preparedWordCount: wordCount,
          seq,
        };
      } catch {
        // Transport failure — swallow. No UI, ever, from pre-warm (§5.3).
      } finally {
        // Sprint-scoped clear: a stale prepare fired for sprint A settling after
        // the id changed must not clear sprint B's one-in-flight guard (B may
        // have its own prepare running — a foreign clear would allow a double
        // prepare). On an id change the reset effect owns the guard instead.
        if (shouldSettlePrepare(sid, sprintIdRef.current)) {
          prepareInFlightRef.current = false;
        }
      }
    },
    [],
  );

  // ── Summon-fallback: POST reason:"summon"; placeholder → card or fizzle ───────

  const fireSummonRequest = useCallback(
    async (draft: string, wordCount: number, sid: SprintId): Promise<void> => {
      const seq = (requestSeqRef.current += 1);
      const firedAtMs = Date.now();
      const sprintElapsedMs = elapsedMs(sprintStartedAtMsRef.current, firedAtMs);
      // No explicit "settled" latch is needed: the reducer's laws make every
      // ordering idempotent. `candidatesReady` and `failed` take effect ONLY in
      // `summoning` (§3.4), so a late timeout after a card showed, or a late
      // response after a timeout fizzled, is a harmless no-op. Dispatches are
      // guarded on mount + same-sprint; the timer is registered in
      // `summonTimeoutRef` so the unmount cleanup can cancel it.
      const timeoutId = window.setTimeout(() => {
        if (summonTimeoutRef.current === timeoutId) {
          summonTimeoutRef.current = null;
        }
        if (mountedRef.current && sprintIdRef.current === sid) {
          dispatchSpark({ type: "failed" }); // ~4s fizzle (plan §5.2)
        }
      }, SUMMON_FALLBACK_TIMEOUT_MS);
      summonTimeoutRef.current = timeoutId;

      const clearFallbackTimer = () => {
        window.clearTimeout(timeoutId);
        if (summonTimeoutRef.current === timeoutId) {
          summonTimeoutRef.current = null;
        }
      };

      // May this async path still act? Re-read through a call so the check is
      // fresh after every await (both refs mutate outside this closure).
      const isLive = () => mountedRef.current && sprintIdRef.current === sid;

      try {
        const response = await fetch(SPARK_GENERATE_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            draft,
            draftWordCount: wordCount,
            sprintElapsedMs,
            sprintId: sid,
            reason: "summon",
          }),
        });
        clearFallbackTimer();
        if (!isLive()) {
          return; // unmounted or sprint changed under us — drop
        }
        if (!response.ok) {
          dispatchSpark({ type: "failed" });
          return;
        }
        const data: unknown = await response.json();
        if (!isLive()) {
          return;
        }
        const parsed = parseGenerateResponse(data);
        if (parsed === null) {
          dispatchSpark({ type: "failed" });
          return;
        }
        const set = toCandidateSet(sid, parsed);
        // Serve from THIS response unconditionally (it is what the writer
        // summoned). Write it to the cache only if it is still the freshest
        // request — a prepare that fired later must not be regressed by this
        // summon's settle, nor vice versa (plan §3.3; `shouldAcceptSettle`).
        if (
          shouldAcceptSettle(seq, cacheRef.current?.seq ?? null, sid, sprintIdRef.current)
        ) {
          cacheRef.current = {
            set,
            preparedAtMs: firedAtMs,
            preparedWordCount: wordCount,
            seq,
          };
        }
        const candidate = selectSpark(set, servedLensesRef.current, hashSprintId(sid));
        // Stamp THIS response's fire-time metadata for the serve — never read
        // back from cacheRef, which a fresher prepare may have won (the served
        // staleness telemetry must describe the set actually served).
        pendingServeContextRef.current = {
          preparedAtMs: firedAtMs,
          preparedWordCount: wordCount,
          promptVersion: parsed.promptVersion,
        };
        dispatchSpark({ type: "candidatesReady", candidate });
      } catch {
        clearFallbackTimer();
        if (isLive()) {
          dispatchSpark({ type: "failed" });
        }
      }
    },
    [dispatchSpark],
  );

  // ── Public actions ────────────────────────────────────────────────────────

  const summon = useCallback(() => {
    const sid = sprintIdRef.current;
    if (sid === null || sprintPhaseRef.current !== "running") {
      return;
    }
    // The affordance is armed only in `resting`; summoning is otherwise a no-op
    // (the reducer ignores it, and re-arm requires the writer to write again).
    if (stateRef.current.status !== "resting") {
      return;
    }
    const current = editorRef.current;
    if (!current) {
      return;
    }
    const draft = current.getText({ blockSeparator: DRAFT_BLOCK_SEPARATOR });
    const wordCount = countWords(draft);

    if (!hasMinimumGround(wordCount)) {
      // Quiet no-op below minimum ground: nothing renders. Log it at most ONCE
      // per resting period — a held ⌘. auto-repeats ~15–30×/s and the TipTap
      // shortcut API exposes no `event.repeat`, so without this latch every
      // repeat would append a durable failed/insufficient-ground row. The latch
      // clears on the next edit (`notifyEdit`), so a fresh below-ground summon
      // after the writer types can log again.
      if (!insufficientGroundLoggedRef.current) {
        insufficientGroundLoggedRef.current = true;
        enqueueEvent(
          buildInsufficientGroundEvent({
            eventId: crypto.randomUUID(),
            sprintId: sid,
            draftWordCount: wordCount,
            sprintElapsedMs: elapsedMs(sprintStartedAtMsRef.current, Date.now()),
            promptVersion: SPARK_PROMPT_VERSION,
          }),
        );
      }
      return;
    }

    const cache = cacheRef.current;
    if (cache !== null && isCacheServable(cache.set, wordCount)) {
      const candidate = selectSpark(cache.set, servedLensesRef.current, hashSprintId(sid));
      if (candidate !== null) {
        // Stamp the serving set's metadata for the dispatch (see
        // `pendingServeContextRef`): here the cache IS the set being served.
        pendingServeContextRef.current = {
          preparedAtMs: cache.preparedAtMs,
          preparedWordCount: cache.preparedWordCount,
          promptVersion: cache.set.promptVersion,
        };
        dispatchSpark({ type: "summon", candidate }); // fresh cache → render synchronously
        return;
      }
    }
    // Stale, missing, or fully-rotated cache → quiet placeholder + fallback request.
    dispatchSpark({ type: "summon", candidate: null });
    void fireSummonRequest(draft, wordCount, sid);
  }, [dispatchSpark, enqueueEvent, fireSummonRequest]);

  const reroll = useCallback(() => {
    if (sprintPhaseRef.current !== "running") {
      return;
    }
    const currentState = stateRef.current;
    if (currentState.status !== "showing" || !currentState.rerollAvailable) {
      return;
    }
    const sid = sprintIdRef.current;
    if (sid === null) {
      return;
    }
    const cache = cacheRef.current;
    // Re-roll picks from the SAME set with the just-served lens now excluded
    // (it is already in servedLensesRef), so no second model call — instant, once.
    const candidate =
      cache !== null ? selectSpark(cache.set, servedLensesRef.current, hashSprintId(sid)) : null;
    if (cache !== null && candidate !== null) {
      // The reroll candidate is selected from the CURRENT cache, so its
      // metadata is the correct serve context for the rerolled card.
      pendingServeContextRef.current = {
        preparedAtMs: cache.preparedAtMs,
        preparedWordCount: cache.preparedWordCount,
        promptVersion: cache.set.promptVersion,
      };
    }
    dispatchSpark({ type: "reroll", candidate });
  }, [dispatchSpark]);

  const notifyEdit = useCallback(() => {
    if (sprintPhaseRef.current !== "running") {
      return;
    }
    // An edit re-arms below-ground logging (a new resting period begins).
    insufficientGroundLoggedRef.current = false;
    dispatchSpark({ type: "edit" });
  }, [dispatchSpark]);

  const observe = useCallback<TriggerObserver>(
    (observation) => {
      const sid = sprintIdRef.current;
      if (sid === null || sprintPhaseRef.current !== "running") {
        return;
      }
      // Word count is O(draft) and this runs on the keystroke path, so it is
      // passed to `shouldPrepare` as a MEMOIZED thunk: the cheap O(1) gates
      // (in-flight, reason, boundary) run first, and the count is computed at
      // most once, only when a trigger actually qualifies (plan §5.3).
      let cachedCount: number | null = null;
      const wordCount = (): number =>
        (cachedCount ??= countWords(observation.text));
      if (
        !shouldPrepare({
          reason: observation.reason,
          boundary: observation.boundary,
          currentWordCount: wordCount,
          lastPreparedWordCount: lastPreparedWordCountRef.current,
          inFlight: prepareInFlightRef.current,
        })
      ) {
        return;
      }
      // Advance the throttle anchor at ATTEMPT time (bounds cost regardless of
      // outcome) and mark in-flight before firing. `wordCount()` reuses the
      // memoized value shouldPrepare already computed — no second count.
      const count = wordCount();
      lastPreparedWordCountRef.current = count;
      prepareInFlightRef.current = true;
      void firePrepare(observation.text, count, sid);
    },
    [firePrepare],
  );

  // ── Lifecycle effects ─────────────────────────────────────────────────────

  // Reset the cache + reducer on sprint-id CHANGE (never the running edge, §3.6).
  // Idempotent: keyed on the last id we reset for, so StrictMode's double-invoke
  // (refs persist across the simulated remount) does not double-reset or
  // double-prepare.
  useEffect(() => {
    if (sprintId === null) {
      return;
    }
    if (lastResetSprintIdRef.current === sprintId) {
      return;
    }
    lastResetSprintIdRef.current = sprintId;
    flushEvents(); // ship the previous sprint's queued events before clearing
    cacheRef.current = null;
    servedLensesRef.current = [];
    lastPreparedWordCountRef.current = null;
    prepareInFlightRef.current = false;
    activeCardRef.current = null;
    insufficientGroundLoggedRef.current = false;
    pendingServeContextRef.current = null;
    sprintStartedAtMsRef.current = Date.now();
    stateRef.current = initialSparkSession();
    setState(initialSparkSession());
  }, [sprintId, flushEvents]);

  // When the sprint leaves `running` (stop, natural completion, OR pause),
  // dismiss any live card and flush. The dismissal detail distinguishes a pause
  // (running → paused, resumes under the same id → `sprint-paused`) from a true
  // end (running → idle | completed → `sprint-end`), so a pause with a card up
  // is no longer mislogged as an end of a sprint that in fact continues.
  //
  // Boundary-flush guarantee: phase-edge dismissals are enqueued SYNCHRONOUSLY
  // inside the dispatch (`telemetryEmitMode` → "sync"), so the flushEvents()
  // below ships them. Were they deferred to a microtask (like keystroke-path
  // telemetry), they would land AFTER this flush and strand — on a STOP the
  // reset effect never flushes either (the id is null), leaving only the 4s
  // timer/pagehide. The machine is otherwise driven only while running (§3.4).
  useEffect(() => {
    const running = sprintPhase === "running";
    if (wasRunningRef.current && !running) {
      dispatchSpark({ type: "sprintEnd", detail: sprintLeaveDetail(sprintPhase) });
      flushEvents();
    }
    wasRunningRef.current = running;
  }, [sprintPhase, dispatchSpark, flushEvents]);

  // While a card is up OR a summon is pending, any bare keystroke ends it
  // (fades / dismisses / abandons the pending summon), and Escape dismisses —
  // including the summoning placeholder, whose fromSummoning(escape)→spent
  // transition would otherwise be unreachable. Capture phase so it beats the
  // editor; command chords (⌘/Ctrl/Alt) and bare modifier presses are NOT
  // "writing" and are ignored. The key still reaches the editor, whose content
  // change flows back as an `edit` (re-arm) via `notifyEdit`.
  useEffect(() => {
    if (state.status !== "showing" && state.status !== "summoning") {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (
        event.key === "Shift" ||
        event.key === "Meta" ||
        event.key === "Control" ||
        event.key === "Alt"
      ) {
        return;
      }
      if (event.key === "Escape") {
        dispatchSpark({ type: "escape" });
        return;
      }
      dispatchSpark({ type: "keystroke" });
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [state.status, dispatchSpark]);

  // Beacon the queue on pagehide; flush on unmount. Losing events is acceptable.
  useEffect(() => {
    const onPageHide = () => {
      flushBeacon();
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      flushEvents();
    };
  }, [flushBeacon, flushEvents]);

  return { observe, state, summon, reroll, notifyEdit };
}
