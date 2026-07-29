/**
 * use-constellation-run.ts — the constellation client (plan §6, D12). It:
 *  1. fires ONE POST /api/constellation-run when the sprint phase TRANSITIONS to
 *     "completed" (observed on the VALUE, so all four completion sites are caught
 *     — D3), with { sprintId, draft, substrateSnapshot };
 *  2. polls GET while the run is neither complete nor failed — the two-beat
 *     reveal (stars at `s3`, nodes at `complete`) is just successive GET bodies;
 *  3. auto-re-POSTs a `resumable` run (stale/failed) — the recovery path;
 *  4. exposes the node lifecycle actions (open / react / dismiss / set-aside) that
 *     PATCH node-status, with optimistic local updates.
 *
 * The E2E-vs-real split is entirely server-side, so this hook is identical in
 * both modes — it just talks to the route. Losing a background fetch never
 * surfaces to the writer (the zero-engagement path stays frictionless): a failed
 * POST/GET degrades to the honest failure state, never a thrown error.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SprintId } from "../../../domain/types/branded";
import type { SprintPhase } from "../../../domain/editor/sprint";
import type { RunStatus } from "../../../domain/constellation/run-types";
import type { NodeStatus } from "../../../domain/constellation/node-types";
import {
  buildNodeStatusRequest,
  buildRunRequest,
  CONSTELLATION_NODE_STATUS_ENDPOINT,
  CONSTELLATION_RUN_ENDPOINT,
  parseRunStartResponse,
  parseRunViewResponse,
  shouldKeepPolling,
  type BoardNode,
  type BoardRunView,
  type BoardStar,
  type NodeStatusChange,
} from "./constellation-glue";

/** How often the board re-reads the run while it's still working. Fast enough to
 * catch the two beats promptly; slow enough to be a trivial background cost. */
const POLL_INTERVAL_MS = 2_000;

/**
 * Recovery is BOUNDED and BACKED OFF. The server deliberately exempts resume/
 * retry re-POSTs from the per-user rate cap (so recovery is never itself
 * rate-limited), which means an unbounded client retry is unbounded model spend:
 * a run that fails fast and deterministically (bad key, provider outage, a
 * validation bug) would otherwise re-execute a full S1+4×S3 pipeline every poll
 * tick, for as long as a tab sits on the board. After these attempts the board
 * stops retrying by itself and waits for the writer's explicit "Try again".
 */
const MAX_AUTO_REPOSTS = 3;
const REPOST_BACKOFF_MS = [5_000, 20_000, 60_000];

/** What the hook reads at completion time — the current draft and the drip
 * substrate, supplied by the composition (it owns the editor + inference). Returns
 * `null` when there's nothing to run on (an empty draft), which suppresses the POST. */
export type RunInputReader = () => {
  readonly draft: string;
  readonly substrateSnapshot: string;
} | null;

export interface ConstellationRunState {
  /** True once a run has been POSTed for the current sprint. */
  readonly started: boolean;
  /** The run's status, or `null` before it starts. */
  readonly status: RunStatus | null;
  readonly stars: readonly BoardStar[];
  readonly nodes: readonly BoardNode[];
  readonly cruxStarId: string | null;
  readonly confidence: "high" | "low" | null;
  readonly failedStage: string | null;
  /** A stale/failed run the board offers to retry (auto-re-POST also fires). */
  readonly resumable: boolean;
  readonly actions: ConstellationRunActions;
}

export interface ConstellationRunActions {
  readonly open: (nodeId: string) => void;
  readonly react: (nodeId: string, reaction: string) => void;
  readonly dismiss: (nodeId: string) => void;
  readonly setAside: (nodeId: string) => void;
  readonly retry: () => void;
}

interface Deps {
  readonly sprintId: SprintId | null;
  readonly sprintPhase: SprintPhase;
  readonly getRunInput: RunInputReader;
}

export function useConstellationRun(deps: Deps): ConstellationRunState {
  const { sprintId, sprintPhase, getRunInput } = deps;

  const [view, setView] = useState<BoardRunView | null>(null);
  const [started, setStarted] = useState(false);

  // Latches keyed to the current sprint so effects don't refire spuriously.
  const startedSprintRef = useRef<string | null>(null);
  const prevPhaseRef = useRef<SprintPhase>(sprintPhase);
  const repostingRef = useRef(false);
  const repostCountRef = useRef(0);
  const nextRepostAtRef = useRef(0);
  // A synced mirror of `view` the poll interval reads without re-subscribing.
  const viewRef = useRef<BoardRunView | null>(null);
  /** Structural signature of the last applied view (see the poll's skip). */
  const viewSignatureRef = useRef<string>("");
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  // Keep the freshest reader/input without retriggering the fire effect.
  const getRunInputRef = useRef(getRunInput);
  getRunInputRef.current = getRunInput;

  // ── POST a run (initial fire + retry + auto-re-POST share this) ─────────────
  const postRun = useCallback(
    async (sid: SprintId): Promise<void> => {
      const input = getRunInputRef.current();
      if (input === null || input.draft.trim().length === 0) return;
      try {
        const res = await fetch(CONSTELLATION_RUN_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            buildRunRequest({
              sprintId: sid,
              draft: input.draft,
              substrateSnapshot: input.substrateSnapshot,
            }),
          ),
        });
        // 429/503 etc. still leave the run to a later poll/re-POST; a parsed body
        // just confirms the status early.
        if (res.ok || res.status === 202) {
          parseRunStartResponse(await res.json().catch(() => null));
        }
      } catch {
        // Network blip — the poll loop will still try to read; a real failure
        // surfaces as the honest failure state, never a thrown error.
      }
    },
    [],
  );

  // ── Fire ONCE when the phase transitions into "completed" ───────────────────
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = sprintPhase;
    if (sprintPhase !== "completed" || prev === "completed") return;
    if (sprintId === null) return;
    if (startedSprintRef.current === sprintId) return; // already fired this sprint
    // An empty sprint has nothing to run on. Check BEFORE latching `started`, or
    // the board would claim to be "reading what you wrote" over a blank draft —
    // a promise the system can't keep (and the poll would never resolve).
    const input = getRunInputRef.current();
    if (input === null || input.draft.trim().length === 0) return;
    startedSprintRef.current = sprintId;
    setStarted(true);
    void postRun(sprintId);
  }, [sprintPhase, sprintId, postRun]);

  // ── Reset when a new sprint begins ──────────────────────────────────────────
  useEffect(() => {
    if (sprintPhase === "running" && startedSprintRef.current !== sprintId) {
      // A fresh sprint: clear the prior constellation so the board is honest.
      startedSprintRef.current = null;
      repostingRef.current = false;
      repostCountRef.current = 0;
      nextRepostAtRef.current = 0;
      setStarted(false);
      setView(null);
    }
  }, [sprintPhase, sprintId]);

  // ── Poll GET while the run works; auto-re-POST a resumable run ───────────────
  useEffect(() => {
    if (!started || sprintId === null) return;
    let cancelled = false;

    const readOnce = async (): Promise<void> => {
      try {
        const res = await fetch(
          `${CONSTELLATION_RUN_ENDPOINT}?sprintId=${encodeURIComponent(sprintId)}`,
          { method: "GET" },
        );
        if (!res.ok) return;
        const next = parseRunViewResponse(await res.json().catch(() => null));
        if (cancelled) return;
        if (next !== null) {
          // Skip the state write when nothing actually changed: `parseRunView`
          // builds fresh arrays every poll, and a new identity re-runs the
          // board's framing effects — re-playing a 700ms camera move every 2s
          // through a multi-minute wait.
          const signature = JSON.stringify(next);
          if (signature !== viewSignatureRef.current) {
            viewSignatureRef.current = signature;
            setView(next);
          }
        }
        // Recovery: a stale/failed run auto-re-POSTs (exempt from the server's
        // rate cap), but BOUNDED and BACKED OFF — see MAX_AUTO_REPOSTS.
        if (
          next?.resumable === true &&
          !repostingRef.current &&
          repostCountRef.current < MAX_AUTO_REPOSTS &&
          Date.now() >= nextRepostAtRef.current
        ) {
          repostingRef.current = true;
          const backoff =
            REPOST_BACKOFF_MS[repostCountRef.current] ??
            REPOST_BACKOFF_MS[REPOST_BACKOFF_MS.length - 1] ??
            60_000;
          repostCountRef.current += 1;
          nextRepostAtRef.current = Date.now() + backoff;
          void postRun(sprintId).finally(() => {
            repostingRef.current = false;
          });
        }
      } catch {
        // Ignore; the next tick retries.
      }
    };

    void readOnce();
    const interval = window.setInterval(() => {
      // Stop polling once terminal AND not resumable (a resumable run keeps
      // polling so the re-POSTed run's progress shows).
      const current = viewRef.current;
      if (!shouldKeepPolling(current) && current?.resumable !== true) {
        window.clearInterval(interval);
        return;
      }
      void readOnce();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [started, sprintId, postRun]);

  // ── Node lifecycle actions (optimistic local update + PATCH) ────────────────
  /** PATCH one node change. Resolves TRUE only when the server actually applied
   * it — the caller rolls the optimistic update back otherwise. Once a node
   * reaches a terminal status the card replaces its actions with a settled
   * label, so a silently-failed write would strand the writer's reaction with no
   * way to notice or retry (and polling has already stopped by then). */
  const patch = useCallback(
    async (runId: string, change: NodeStatusChange): Promise<boolean> => {
      try {
        const res = await fetch(CONSTELLATION_NODE_STATUS_ENDPOINT, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildNodeStatusRequest(runId, [change])),
        });
        if (!res.ok) return false;
        const body: unknown = await res.json().catch(() => null);
        if (typeof body !== "object" || body === null) return false;
        const results = (body as { results?: unknown }).results;
        if (!Array.isArray(results)) return false;
        const row: unknown = results[0];
        return (
          typeof row === "object" &&
          row !== null &&
          (row as { updated?: unknown }).updated === true
        );
      } catch {
        return false;
      }
    },
    [],
  );

  const applyLocal = useCallback(
    (nodeId: string, status: NodeStatus, reaction: string | undefined): void => {
      viewSignatureRef.current = "";
      setView((current) => {
        if (current === null) return current;
        return {
          ...current,
          nodes: current.nodes.map((n) =>
            n.id === nodeId
              ? { ...n, status, reaction }
              : n,
          ),
        };
      });
    },
    [],
  );

  const mutate = useCallback(
    (
      nodeId: string,
      status: NodeStatusChange["status"],
      reaction?: string,
    ): void => {
      const runId = view?.runId;
      if (runId === undefined) return;
      // Remember the pre-change state so a rejected write can be rolled back
      // rather than left showing an action that never landed.
      const before = viewRef.current?.nodes.find((n) => n.id === nodeId);
      applyLocal(nodeId, status, reaction);
      const change: NodeStatusChange =
        reaction === undefined
          ? { nodeId, status }
          : { nodeId, status, reaction };
      void patch(runId, change).then((applied) => {
        if (applied || before === undefined) return;
        applyLocal(nodeId, before.status, before.reaction);
      });
    },
    [view?.runId, applyLocal, patch],
  );

  const open = useCallback(
    (nodeId: string) => {
      mutate(nodeId, "opened");
    },
    [mutate],
  );
  const react = useCallback(
    (nodeId: string, reaction: string) => {
      mutate(nodeId, "resolved", reaction);
    },
    [mutate],
  );
  const dismiss = useCallback(
    (nodeId: string) => {
      mutate(nodeId, "dismissed");
    },
    [mutate],
  );
  const setAside = useCallback(
    (nodeId: string) => {
      mutate(nodeId, "deferred");
    },
    [mutate],
  );
  const retry = useCallback(() => {
    if (sprintId === null) return;
    // An explicit tap resets the automatic-recovery budget: this is the writer
    // asking, not the client looping.
    repostCountRef.current = 0;
    nextRepostAtRef.current = 0;
    void postRun(sprintId);
  }, [sprintId, postRun]);

  const actions = useMemo<ConstellationRunActions>(
    () => ({ open, react, dismiss, setAside, retry }),
    [open, react, dismiss, setAside, retry],
  );

  return {
    started,
    status: view?.status ?? (started ? "s1" : null),
    stars: view?.stars ?? [],
    nodes: view?.nodes ?? [],
    cruxStarId: view?.cruxStarId ?? null,
    confidence: view?.confidence ?? null,
    failedStage: view?.failedStage ?? null,
    resumable: view?.resumable ?? false,
    actions,
  };
}
