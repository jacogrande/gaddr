import { describe, expect, test } from "bun:test";
import { sprintId as makeSprintId } from "../../../src/domain/types/branded";
import type { SprintId } from "../../../src/domain/types/branded";
import { ok, type Result } from "../../../src/domain/types/result";
import type { InferenceError } from "../../../src/domain/types/errors";
import type {
  AnalysisPort,
  TriagePort,
} from "../../../src/domain/constellation/ports";
import type {
  Finding,
  PBurst,
  TriageResult,
} from "../../../src/domain/constellation/types";
import {
  createInferenceRunner,
  type BurstInput,
} from "../../../src/infra/jobs/inference-runner";

function sid(raw: string): SprintId {
  const result = makeSprintId(raw);
  if (!result.ok) throw new Error("test sprint id");
  return result.value;
}

const SID = sid("sprint-1");
const SID2 = sid("sprint-2");

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function triage(overrides: Partial<TriageResult> = {}): TriageResult {
  return {
    intent: "testing",
    themeDelta: "new-direction",
    retrievalSignals: [],
    tier: "inferred",
    ...overrides,
  };
}

type Deferred<T> = { readonly promise: Promise<T>; readonly resolve: (value: T) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/** Triage port whose every call hangs until the test resolves it. */
function controllableTriage() {
  const calls: Array<{
    readonly burst: PBurst;
    readonly deferred: Deferred<Result<TriageResult, InferenceError>>;
  }> = [];
  const port: TriagePort = {
    triage(burst) {
      const d = deferred<Result<TriageResult, InferenceError>>();
      calls.push({ burst, deferred: d });
      return d.promise;
    },
  };
  return { port, calls };
}

/** Analysis port that records its calls and returns a valid finding at once. */
function recordingAnalysis() {
  const analyzed: PBurst[] = [];
  const port: AnalysisPort = {
    analyze(burst): Promise<Result<Finding, InferenceError>> {
      analyzed.push(burst);
      const finding: Finding = {
        kind: "counter-position",
        tier: "inferred",
        claimSeq: burst.seq,
        pointer: "p",
        note: "What is the strongest case against this?",
      };
      return Promise.resolve(ok(finding));
    },
  };
  return { port, analyzed };
}

function input(text: string): BurstInput {
  return { text, fullText: text, reason: "production-pause" };
}

describe("createInferenceRunner", () => {
  test("folds a resolved triage into the substrate and notifies subscribers", async () => {
    const triagePort = controllableTriage();
    const analysis = recordingAnalysis();
    const runner = createInferenceRunner({
      triage: triagePort.port,
      analysis: analysis.port,
    });
    runner.reset(SID);

    let latest = runner.snapshot();
    runner.subscribe((s) => {
      latest = s;
    });

    runner.submit(input("the meaning of work"));
    expect(triagePort.calls).toHaveLength(1);
    expect(triagePort.calls[0]?.burst.sprintId).toBe(SID);

    triagePort.calls[0]?.deferred.resolve(ok(triage({ theme: "work" })));
    await flush();

    expect(latest.positions).toHaveLength(1);
    expect(latest.themes).toHaveLength(1);
    expect(analysis.analyzed).toHaveLength(0); // testing intent, no signals
  });

  test("escalates an asserting burst to analysis and stores the finding", async () => {
    const triagePort = controllableTriage();
    const analysis = recordingAnalysis();
    const runner = createInferenceRunner({
      triage: triagePort.port,
      analysis: analysis.port,
    });
    runner.reset(SID);
    let latest = runner.snapshot();
    runner.subscribe((s) => {
      latest = s;
    });

    runner.submit(input("the real issue is freedom"));
    triagePort.calls[0]?.deferred.resolve(ok(triage({ intent: "asserting" })));
    await flush();

    expect(analysis.analyzed).toHaveLength(1);
    expect(latest.findings).toHaveLength(1);
    expect(latest.findings[0]?.kind).toBe("counter-position");
  });

  test("runs one triage at a time and drops the oldest queued burst", async () => {
    const triagePort = controllableTriage();
    const analysis = recordingAnalysis();
    const runner = createInferenceRunner(
      { triage: triagePort.port, analysis: analysis.port },
      { maxConcurrent: 1, maxQueued: 1 },
    );
    runner.reset(SID);

    runner.submit(input("A"));
    runner.submit(input("B"));
    runner.submit(input("C"));

    // Only A is in flight; B was bumped from the queue by C.
    expect(triagePort.calls).toHaveLength(1);
    expect(triagePort.calls[0]?.burst.text).toBe("A");

    triagePort.calls[0]?.deferred.resolve(ok(triage()));
    await flush();

    expect(triagePort.calls).toHaveLength(2);
    expect(triagePort.calls[1]?.burst.text).toBe("C");
  });

  test("reset abandons in-flight work and starts a clean substrate", async () => {
    const triagePort = controllableTriage();
    const analysis = recordingAnalysis();
    const runner = createInferenceRunner({
      triage: triagePort.port,
      analysis: analysis.port,
    });
    runner.reset(SID);

    runner.submit(input("stale burst"));
    runner.reset(SID2);

    // Resolve the now-stale triage; its result must be discarded.
    triagePort.calls[0]?.deferred.resolve(ok(triage({ theme: "stale" })));
    await flush();

    expect(runner.snapshot().sprintId).toBe(SID2);
    expect(runner.snapshot().positions).toHaveLength(0);
  });

  test("reset mid-flight does not corrupt the throttle for the next sprint", async () => {
    const triagePort = controllableTriage();
    const analysis = recordingAnalysis();
    const runner = createInferenceRunner(
      { triage: triagePort.port, analysis: analysis.port },
      { maxConcurrent: 1, maxQueued: 1 },
    );
    runner.reset(SID);

    // A is in flight when the sprint is reset.
    runner.submit(input("A"));
    runner.reset(SID2);

    // The now-stale A resolves after the reset. It must not touch the counter.
    triagePort.calls[0]?.deferred.resolve(ok(triage()));
    await flush();

    // New sprint: one in flight, one queued — the throttle must still hold.
    runner.submit(input("B"));
    runner.submit(input("C"));
    expect(triagePort.calls).toHaveLength(2); // A + B; C is queued, not running
    expect(triagePort.calls[1]?.burst.text).toBe("B");
  });

  test("a higher maxConcurrent allows multiple triage calls in flight", () => {
    const triagePort = controllableTriage();
    const analysis = recordingAnalysis();
    const runner = createInferenceRunner(
      { triage: triagePort.port, analysis: analysis.port },
      { maxConcurrent: 2, maxQueued: 1 },
    );
    runner.reset(SID);

    runner.submit(input("A"));
    runner.submit(input("B"));

    expect(triagePort.calls).toHaveLength(2);
  });

  test("a disposed runner ignores further submissions", () => {
    const triagePort = controllableTriage();
    const analysis = recordingAnalysis();
    const runner = createInferenceRunner({
      triage: triagePort.port,
      analysis: analysis.port,
    });
    runner.reset(SID);
    runner.dispose();

    runner.submit(input("after dispose"));
    expect(triagePort.calls).toHaveLength(0);
  });
});
