/**
 * constellation-runner.ts — the sprint-boundary sibling of `inference-runner.ts`
 * (plan §5.4, §8 step 5). Where that runner throttles the DURING-sprint drip in
 * memory, this one executes the SPRINT-END pipeline: durable, checkpointed, and
 * server-side. Same philosophy — every decision delegated to a pure function
 * (`decideExecution`, `shouldGenerateKind`, `assembleConstellation`); this shell
 * owns only orchestration and I/O.
 *
 * THE PIPELINE (D5): persist run (before any model call, D3) → S1 discovery →
 * checkpoint (CAS s1→s3, stars persisted) → S3 node generation (one call per
 * eligible kind, D9 skips the rest) → assemble (pure) → checkpoint (CAS
 * s3→complete, nodes persisted). Two beats reach the board: stars at `s3`, nodes
 * at `complete` (D12).
 *
 * EXECUTION MODEL (§5.4): `start()` does the cheap, synchronous decision (persist
 * or resume, lease, rate signal) and returns immediately; the route hands the
 * returned `execute` thunk to `waitUntil` so the writer never blocks on the
 * multi-minute run and the board's GET poll is the progress channel.
 *
 * THE LEASE (§5.4): a re-POST with an existing run_key executes ONLY when the run
 * is stale (its `updated_at` older than `staleAfterMs` — the prior invocation
 * presumed dead) or explicitly `failed` (a retry); a fresh in-flight run returns
 * its status without running. One rule covers zombie runs (platform kills persist
 * nothing) and concurrent double-fire (multi-site completion, StrictMode,
 * impatient reloads). Every checkpoint is a status-CAS, so even when the lease is
 * lost to a race the loser's write is discarded, never a double-apply.
 *
 * RESUME (§5.4): `execute()` rebuilds from DURABLE state (`getResumeState`), not
 * memory — if S1 already checkpointed it re-runs only S3, so "kill after S1 →
 * re-POST completes without re-running S1" holds. A `failed` run is first
 * status-CAS'd back to its resumable stage so the checkpoints can win again.
 *
 * CONTENT POSTURE (D11): the draft lives only in memory here; only model output +
 * short grounding spans persist, and telemetry is `hash(...)` + counts.
 */

import { createHash } from "node:crypto";

import type { RunId, SprintId, UserId } from "../../domain/types/branded";
import { runId as brandRunId } from "../../domain/types/branded";
import type { PersistenceError } from "../../domain/types/errors";
import { err, ok } from "../../domain/types/result";
import type { Result } from "../../domain/types/result";
import type {
  ConstellationRunRepo,
  DiscoveryPort,
  NodeGenerationPort,
} from "../../domain/constellation/ports";
import type { ValidatedNode } from "../../domain/constellation/node-types";
import type { RunStatus } from "../../domain/constellation/run-types";
import { shouldGenerateKind } from "../../domain/constellation/node-gating";
import { hintLensesForRun } from "../../domain/constellation/counterargument-lenses";
import { assembleConstellation } from "../../domain/constellation/assemble-constellation";
import { countWords } from "../../domain/spark/select-spark";
import type { InferenceAttempt } from "../llm/structured-call";
import {
  toOnAttempt,
  type InferenceAttemptSink,
} from "../db/inference-attempt-repo";
import type { ServedSparkQuestionsQuery } from "../db/served-spark-query";
import {
  DISCOVERY_PROMPT_VERSION,
  DISCOVERY_SCHEMA_VERSION,
} from "../llm/prompts/discovery";
import {
  NODE_GEN_KINDS,
  NODES_PROMPT_VERSION,
  NODES_SCHEMA_VERSION,
} from "../llm/prompts/nodes";

/**
 * How long a non-terminal run may sit untouched before a re-POST treats it as
 * dead and resumes it (§5.4). This MUST exceed the route's `maxDuration` (300s):
 * `updated_at` is touched only at the two checkpoints (s1→s3, s3→complete), so
 * during the S3 phase a perfectly healthy run's `updated_at` can be as old as the
 * whole run so far. If the horizon were shorter than the worst-case run, a
 * healthy-but-slow run would read as stale mid-flight and the client's auto-re-
 * POST would CLAIM AND RE-EXECUTE it concurrently (double model spend). At 360s >
 * 300s maxDuration a healthy run can never appear stale; a genuine platform kill
 * self-heals ~60s after the invocation's ceiling. (Run 2's fix for a shorter
 * recovery latency is an S3 heartbeat touch, not a shorter horizon.)
 */
export const RUN_STALE_AFTER_MS = 360_000;

/** The composite version fingerprints, folded into the run_key AND stored on the
 * run (so a prompt/schema bump is a NEW run_key — never a silently-confounded
 * resume of an old one). */
export const CONSTELLATION_PROMPT_VERSION = `${DISCOVERY_PROMPT_VERSION}+${NODES_PROMPT_VERSION}`;
export const CONSTELLATION_SCHEMA_VERSION = `${DISCOVERY_SCHEMA_VERSION}+${NODES_SCHEMA_VERSION}`;

/**
 * run_key = hash(sprintId ‖ draft ‖ promptVersions ‖ schemaVersions ‖ modelIds),
 * NUL-separated (the spark `computeSparkInputHash` pattern; `\u0000` so a field
 * split can't collide). Same sprint + same draft + same versions + same model →
 * same key → a re-POST resumes instead of duplicating (D3). The draft is hashed,
 * never stored — the key proves "same draft" without persisting it (D11).
 *
 * THE SPRINT ID IS PART OF THE KEY, and must be: a run row carries the sprint it
 * was created for, and the board reads runs BY SPRINT. Without it, finishing a
 * second sprint over an unchanged draft resolves to the FIRST sprint's run row,
 * which the new sprint's read can never find — so the board sits on "Reading
 * what you wrote…" forever. Found by executing the eval workflows; a unit test
 * would not have caught it, since it needs two real sprints over one draft.
 */
export function computeRunKey(input: {
  readonly sprintId: SprintId;
  readonly draft: string;
  readonly promptVersion: string;
  readonly schemaVersion: string;
  readonly modelId: string;
}): string {
  const material = `${input.sprintId}\u0000${input.draft}\u0000${input.promptVersion}\u0000${input.schemaVersion}\u0000${input.modelId}`;
  return createHash("sha256").update(material).digest("hex");
}

/**
 * The lease + persist decision, pure so the lease laws are unit-tested without a
 * clock or a DB (plan §7 contract lane):
 *  - `complete` → nothing to do.
 *  - a just-created run → execute (fresh run).
 *  - a `failed` run → execute (retry; the caller resets it to its resumable
 *    stage first).
 *  - a non-terminal EXISTING run → execute only if stale (prior invocation
 *    presumed dead); otherwise it is in-flight and the caller returns status.
 */
export type ExecDecision = "executable" | "in-flight" | "complete";

export function decideExecution(
  snapshot: {
    readonly createdFresh: boolean;
    readonly status: RunStatus;
    readonly updatedAtMs: number;
  },
  nowMs: number,
  staleAfterMs: number,
): ExecDecision {
  if (snapshot.status === "complete") return "complete";
  if (snapshot.createdFresh) return "executable";
  if (snapshot.status === "failed") return "executable";
  const age = nowMs - snapshot.updatedAtMs;
  return age >= staleAfterMs ? "executable" : "in-flight";
}

/** The POST's input: identity + the draft (in memory only) + the client-sent
 * substrate snapshot (fenced + shape-validated downstream, D8). */
export interface ConstellationRunInput {
  readonly userId: UserId;
  readonly sprintId: SprintId;
  readonly draft: string;
  readonly substrateSnapshot: string;
}

/**
 * The per-user rate limiter shape the runner consults — declared structurally so
 * infra does not import the app-layer limiter (the composition passes it in). The
 * rate check lives HERE, not in the route, because charging must be atomic with
 * the novel-vs-resume decision (only `createOrGet` knows if the run is new), and a
 * rate-denied novel run must not leave a durable, later-resumable phantom row.
 */
export interface RunRateLimiter {
  check(
    key: string,
    nowMs: number,
  ): { readonly allowed: boolean; readonly retryAfterSeconds?: number };
}

/**
 * What `start()` hands back. `executable` carries the `execute` thunk the route
 * gives to `waitUntil` — and crucially, `start()` has ALREADY WON THE EXECUTION
 * LEASE by the time it returns `executable` (the fresh insert, a failed→stage
 * transition, or a stale-claim), so at most one invocation ever executes a given
 * run. `novel` is informational (the run was brand-new). `in-flight` means
 * another invocation owns the lease (or the run is fresh) — return status, don't
 * run. `rate-limited` means a novel run hit the per-user cap (its phantom row was
 * deleted). `complete` is terminal.
 */
export type RunStartOutcome =
  | {
      readonly kind: "executable";
      readonly runId: RunId;
      readonly status: RunStatus;
      readonly novel: boolean;
      readonly execute: () => Promise<void>;
    }
  | { readonly kind: "in-flight"; readonly runId: RunId; readonly status: RunStatus }
  | { readonly kind: "complete"; readonly runId: RunId; readonly status: RunStatus }
  | { readonly kind: "rate-limited"; readonly retryAfterSeconds: number }
  | { readonly kind: "error"; readonly error: PersistenceError };

/** A factory that binds the run's telemetry sink into a port — the runner builds
 * `onAttempt` (runId-stamped + token-tallying) per run, then asks for ports wired
 * to it. The composition closes each factory over its client/model/effort. */
export type DiscoveryPortFactory = (
  onAttempt: (attempt: InferenceAttempt) => void,
) => DiscoveryPort;
export type NodesPortFactory = (
  onAttempt: (attempt: InferenceAttempt) => void,
) => NodeGenerationPort;

export interface ConstellationRunnerDeps {
  readonly repo: ConstellationRunRepo;
  readonly makeDiscoveryPort: DiscoveryPortFactory;
  readonly makeNodesPort: NodesPortFactory;
  readonly attemptSink: InferenceAttemptSink;
  readonly servedSparkQuestions: ServedSparkQuestionsQuery;
  /** Per-user NOVEL-run cap (~6/hr). Charged only for a brand-new run_key;
   * resume/retry re-POSTs are exempt (§6). A denied novel run's phantom row is
   * deleted so it can never be drained later as a free resume. */
  readonly rateLimiter: RunRateLimiter;
  /** The constellation model id (S1 and S3 share it, D6) — folded into run_key
   * and stored on the run. */
  readonly modelId: string;
  /** Infra owns randomness: mint a fresh run uuid. Defaults to `crypto.randomUUID`. */
  readonly newRunId?: () => RunId;
  /** Injected clock (infra may read one); defaults to `Date.now`. */
  readonly clock?: () => number;
  /** Staleness horizon; defaults to `RUN_STALE_AFTER_MS`. */
  readonly staleAfterMs?: number;
}

/** Fixed Retry-After (s) when the novel-run cap trips — an hour-scale bucket, so
 * a minute of backoff comfortably covers the client. */
const RATE_LIMIT_RETRY_AFTER_SECONDS = 60;

export interface ConstellationRunner {
  start(input: ConstellationRunInput): Promise<RunStartOutcome>;
}

function defaultNewRunId(): RunId {
  const raw = crypto.randomUUID();
  const branded = brandRunId(raw);
  // `crypto.randomUUID()` always satisfies the structural UUID brand; the guard
  // is a belt-and-suspenders narrow, never expected to fail.
  return branded.ok ? branded.value : (raw as RunId);
}

export function createConstellationRunner(
  deps: ConstellationRunnerDeps,
): ConstellationRunner {
  const clock = deps.clock ?? Date.now;
  const newRunId = deps.newRunId ?? defaultNewRunId;
  const staleAfterMs = deps.staleAfterMs ?? RUN_STALE_AFTER_MS;

  /** markFailed, swallowing its own error — `execute()` must never throw (it runs
   * detached under `waitUntil`). If markFailed itself fails, staleness is the
   * backstop: the run stops being touched and eventually reads resumable. */
  async function failSafe(
    runId: RunId,
    stage: string,
    reason: string,
  ): Promise<void> {
    await deps.repo.markFailed({ runId, failedStage: stage, errorReason: reason });
  }

  /** Run the pipeline for a run whose EXECUTION LEASE `start()` already won, so
   * exactly one invocation reaches here per run. It reads durable state as the
   * source of truth (resume-safe) and runs from the first incomplete stage. The
   * whole body is wrapped so NOTHING can throw out of the detached `waitUntil`
   * callback — any unexpected throw becomes an honest `failed` row (the never-
   * throw invariant, made real rather than merely documented). */
  async function execute(runId: RunId, input: ConstellationRunInput): Promise<void> {
    const { userId, sprintId, draft, substrateSnapshot } = input;
    try {
      // Served spark questions: an S1 warm-start input AND assembly's dedup guard.
      // Fail-open — the dedup is a nicety, not correctness, and a run must not die
      // because a telemetry read blipped.
      const servedRead = await deps.servedSparkQuestions(userId, sprintId);
      const servedSparks: readonly string[] = servedRead.ok ? servedRead.value : [];

      // Per-run telemetry: stamp runId on every attempt, and tally per-stage
      // tokens for the (best-effort) run rollup. inference_attempt is authoritative.
      const baseOnAttempt = toOnAttempt(deps.attemptSink, userId);
      const tally = { discIn: 0, discOut: 0, nodeIn: 0, nodeOut: 0 };
      const onAttempt = (attempt: InferenceAttempt): void => {
        baseOnAttempt({ ...attempt, runId });
        if (attempt.stage === "discovery") {
          tally.discIn += attempt.inputTokens;
          tally.discOut += attempt.outputTokens;
        } else if (attempt.stage.startsWith("nodes:")) {
          tally.nodeIn += attempt.inputTokens;
          tally.nodeOut += attempt.outputTokens;
        }
      };
      const discoveryPort = deps.makeDiscoveryPort(onAttempt);
      const nodesPort = deps.makeNodesPort(onAttempt);

      // Durable state is the source of truth. `start()` has already leased and
      // normalized this run to a resumable stage (s1 or s3), so no status reset
      // happens here — a lost stage CAS below can only mean a raced completion.
      const resumeRead = await deps.repo.getResumeState(runId);
      if (!resumeRead.ok) {
        await failSafe(runId, "load", resumeRead.error.message);
        return;
      }
      if (resumeRead.value === null) return; // run vanished — nothing to do
      let { brief, stars } = resumeRead.value;
      const { status } = resumeRead.value;
      if (status === "complete") return; // race: already done

      const s1Checkpointed = brief !== null && stars.length > 0;

      // ── S1 discovery ──
      if (!s1Checkpointed) {
        const discovered = await discoveryPort.discover({
          draft,
          substrateSnapshot,
          servedSparks,
        });
        if (!discovered.ok) {
          await failSafe(runId, "discovery", discovered.error.reason);
          return;
        }
        const saved = await deps.repo.saveDiscovery({
          runId,
          discovery: discovered.value,
          inputTokens: tally.discIn,
          outputTokens: tally.discOut,
        });
        if (!saved.ok) {
          await failSafe(runId, "discovery", saved.error.message);
          return;
        }
        if (saved.value) {
          brief = discovered.value.brief;
          stars = [...discovered.value.stars, ...discovered.value.offMapSeeds];
        } else {
          // CAS lost — another invocation checkpointed S1. Continue with theirs so
          // the two never diverge on which stars the board shows.
          const reread = await deps.repo.getResumeState(runId);
          if (!reread.ok || reread.value === null) return;
          if (reread.value.status === "complete") return;
          brief = reread.value.brief;
          stars = reread.value.stars;
        }
      }

      if (brief === null || stars.length === 0) {
        await failSafe(runId, "discovery", "missing S1 output after checkpoint");
        return;
      }

      // ── S3 node generation ── one call per ELIGIBLE kind (D9 skips the rest).
      const collected: ValidatedNode[] = [];
      for (const kind of NODE_GEN_KINDS) {
        if (!shouldGenerateKind(stars, kind)) continue;
        const hints = kind === "counterargument" ? hintLensesForRun(runId) : [];
        const generated = await nodesPort.generate({
          draft,
          brief,
          stars,
          kind,
          hints,
        });
        if (!generated.ok) {
          await failSafe(runId, `nodes:${kind}`, generated.error.reason);
          return;
        }
        collected.push(...generated.value);
      }

      // ── Assemble (pure) + the complete checkpoint ──
      const constellation = assembleConstellation({
        runId,
        stars,
        nodes: collected,
        servedSparkQuestions: servedSparks,
      });
      const savedNodes = await deps.repo.saveNodes({
        runId,
        constellation,
        inputTokens: tally.nodeIn,
        outputTokens: tally.nodeOut,
      });
      if (!savedNodes.ok) {
        await failSafe(runId, "assemble", savedNodes.error.message);
        return;
      }
      // A lost CAS here means the run is already `complete` (another invocation
      // finished it) — terminal and correct, no failure.
    } catch {
      // A dependency broke its Result contract and threw. Convert it to an honest
      // failed row rather than leaking out of `waitUntil` (which would strand the
      // run at its last checkpoint until staleness). D11 (binding): the thrown
      // value's message is NOT persisted — every other failure path here surfaces
      // a fixed-vocabulary reason, and a raw exception string could in principle
      // carry draft-adjacent content into `error_reason` (which GET exposes). A
      // fixed reason keeps the content posture intact; a contract-violating throw
      // is a bug to fix at the source, not to forward to the client.
      await failSafe(runId, "unknown", "unexpected runner error");
    }
  }

  /**
   * Win the EXECUTION LEASE for a resume/retry candidate (an existing run that is
   * stale or `failed`). Returns whether this invocation won — a loss means a
   * concurrent invocation already claimed it, so the caller returns `in-flight`.
   * The claim is exclusive by construction:
   *  - `failed` → `transition(failed → target)`: the status change is the mutex
   *    (only one concurrent claimant moves it off `failed`), and retry is
   *    immediate (no staleness wait).
   *  - stale at its own stage → `claimStaleRun`: the `updated_at < cutoff`
   *    precondition the winning bump invalidates is the mutex.
   *  - off-checkpoint (defensive; `assembling` is never persisted in Run 1) →
   *    normalize with an exclusive status change.
   * `target` (the resumable stage) is read from durable state so a run with S1
   * already checkpointed resumes at S3, never re-running S1.
   */
  async function claimForResume(
    runId: RunId,
    nowMs: number,
  ): Promise<Result<boolean, PersistenceError>> {
    const resume = await deps.repo.getResumeState(runId);
    if (!resume.ok) return err(resume.error);
    if (resume.value === null) return ok(false); // vanished
    const current = resume.value.status;
    if (current === "complete") return ok(false); // raced to done
    const s1Checkpointed =
      resume.value.brief !== null && resume.value.stars.length > 0;
    const target: RunStatus = s1Checkpointed ? "s3" : "s1";
    if (current === "failed") {
      return deps.repo.transition({ runId, from: "failed", to: target });
    }
    if (current === target) {
      return deps.repo.claimStaleRun({
        runId,
        expectedStatus: current,
        staleBeforeMs: nowMs - staleAfterMs,
      });
    }
    return deps.repo.transition({ runId, from: current, to: target });
  }

  return {
    async start(input): Promise<RunStartOutcome> {
      const runKey = computeRunKey({
        sprintId: input.sprintId,
        draft: input.draft,
        promptVersion: CONSTELLATION_PROMPT_VERSION,
        schemaVersion: CONSTELLATION_SCHEMA_VERSION,
        modelId: deps.modelId,
      });
      const snap = await deps.repo.createOrGet({
        runId: newRunId(),
        userId: input.userId,
        sprintId: input.sprintId,
        runKey,
        draftWordCount: countWords(input.draft),
        promptVersion: CONSTELLATION_PROMPT_VERSION,
        schemaVersion: CONSTELLATION_SCHEMA_VERSION,
        modelId: deps.modelId,
      });
      if (!snap.ok) {
        return { kind: "error", error: snap.error };
      }
      const { runId, status, createdFresh } = snap.value;
      const nowMs = clock();

      if (status === "complete") {
        return { kind: "complete", runId, status };
      }

      if (createdFresh) {
        // Brand-new run — already leased by the unique-index insert. Charge the
        // NOVEL cap here; a denied novel run must NOT leave a durable row behind,
        // or a later (rate-exempt) resume re-POST could drain it and defeat the
        // per-user cap. The row has no stars/nodes yet, so the delete is clean.
        const verdict = deps.rateLimiter.check(input.userId, nowMs);
        if (!verdict.allowed) {
          // Best-effort compensating delete. Accepted residual (LOW): if this
          // delete itself fails transiently, the phantom row survives and — after
          // the staleness horizon — a later exempt resume could drain it, the very
          // bypass this closes. It is contingent on a DB failure (not attacker-
          // triggerable on demand); a fully durable fix is create-only-after-the-
          // rate-check (an extra pre-read on the hot path), deferred as not worth
          // that cost for a coarse, per-instance backstop.
          await deps.repo.deleteRun(runId);
          return {
            kind: "rate-limited",
            retryAfterSeconds:
              verdict.retryAfterSeconds ?? RATE_LIMIT_RETRY_AFTER_SECONDS,
          };
        }
        return {
          kind: "executable",
          runId,
          status,
          novel: true,
          execute: () => execute(runId, input),
        };
      }

      // Existing run. Fresh + non-terminal → another invocation owns it. Stale or
      // failed → a resume/retry candidate that must WIN THE LEASE before running.
      const decision = decideExecution(snap.value, nowMs, staleAfterMs);
      if (decision === "in-flight") {
        return { kind: "in-flight", runId, status };
      }
      const claimed = await claimForResume(runId, nowMs);
      if (!claimed.ok) {
        return { kind: "error", error: claimed.error };
      }
      if (!claimed.value) {
        // Lost the lease to a concurrent resume/retry — it is running the pipeline.
        return { kind: "in-flight", runId, status };
      }
      return {
        kind: "executable",
        runId,
        status,
        novel: false,
        execute: () => execute(runId, input),
      };
    },
  };
}
