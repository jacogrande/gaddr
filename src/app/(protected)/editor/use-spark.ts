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
  shouldPrepare,
  shouldSettlePrepare,
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
  const emitTelemetry = useCallback(
    (telemetry: TransitionTelemetry) => {
      const sid = sprintIdRef.current;
      const card = activeCardRef.current;
      if (sid === null || card === null) {
        return;
      }
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

      if (telemetry !== null && (telemetry.kind === "served" || telemetry.kind === "rerolled")) {
        const candidate = eventCandidate(event);
        if (candidate !== null) {
          servedLensesRef.current = [...servedLensesRef.current, candidate.lens];
          const cache = cacheRef.current;
          const now = Date.now();
          activeCardRef.current = {
            lens: candidate.lens,
            question: candidate.question,
            promptVersion: cache?.set.promptVersion ?? SPARK_PROMPT_VERSION,
            preparedAtMs: cache?.preparedAtMs ?? now,
            preparedWordCount: cache?.preparedWordCount ?? readWordCount(),
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
      const sprintElapsedMs = elapsedMs(sprintStartedAtMsRef.current, Date.now());
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
        if (!shouldSettlePrepare(sid, sprintIdRef.current)) {
          return; // a prepare from a prior sprint must never populate this one's cache
        }
        const parsed = parseGenerateResponse(data);
        if (parsed === null) {
          return;
        }
        cacheRef.current = {
          set: toCandidateSet(sid, parsed),
          preparedAtMs: Date.now(),
          preparedWordCount: parsed.draftWordCount,
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
      const sprintElapsedMs = elapsedMs(sprintStartedAtMsRef.current, Date.now());
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
        cacheRef.current = {
          set,
          preparedAtMs: Date.now(),
          preparedWordCount: parsed.draftWordCount,
        };
        const candidate = selectSpark(set, servedLensesRef.current, hashSprintId(sid));
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
      // Quiet no-op below minimum ground: nothing renders, logged failed/insufficient-ground.
      enqueueEvent(
        buildInsufficientGroundEvent({
          eventId: crypto.randomUUID(),
          sprintId: sid,
          draftWordCount: wordCount,
          sprintElapsedMs: elapsedMs(sprintStartedAtMsRef.current, Date.now()),
          promptVersion: SPARK_PROMPT_VERSION,
        }),
      );
      return;
    }

    const cache = cacheRef.current;
    if (cache !== null && isCacheServable(cache.set, wordCount)) {
      const candidate = selectSpark(cache.set, servedLensesRef.current, hashSprintId(sid));
      if (candidate !== null) {
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
    dispatchSpark({ type: "reroll", candidate });
  }, [dispatchSpark]);

  const notifyEdit = useCallback(() => {
    if (sprintPhaseRef.current !== "running") {
      return;
    }
    dispatchSpark({ type: "edit" });
  }, [dispatchSpark]);

  const observe = useCallback<TriggerObserver>(
    (observation) => {
      const sid = sprintIdRef.current;
      if (sid === null || sprintPhaseRef.current !== "running") {
        return;
      }
      const wordCount = countWords(observation.text);
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
      // outcome) and mark in-flight before firing.
      lastPreparedWordCountRef.current = wordCount;
      prepareInFlightRef.current = true;
      void firePrepare(observation.text, wordCount, sid);
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
    sprintStartedAtMsRef.current = Date.now();
    stateRef.current = initialSparkSession();
    setState(initialSparkSession());
  }, [sprintId, flushEvents]);

  // When the sprint stops (leaves `running`), dismiss any live card and flush.
  // The machine is otherwise driven only while running (§3.4).
  useEffect(() => {
    const running = sprintPhase === "running";
    if (wasRunningRef.current && !running) {
      dispatchSpark({ type: "sprintEnd" });
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
