/**
 * mock-constellation-adapter.ts — deterministic S1/S3 ports for E2E mode (plan
 * §6, §8 step 5). The sibling of `mock-spark-adapter.ts`: it lets the agent-
 * browser evals drive the WHOLE runner (checkpointing, the two-beat reveal, the
 * lease, resume) with no `ANTHROPIC_API_KEY`/`DATABASE_URL` and no live model —
 * only the model call and the persistence are mocked; the orchestration is the
 * real `constellation-runner`.
 *
 * DETERMINISTIC (stable eval assertions): all content is a pure function of the
 * draft — stars grounded in real draft spans (so the board quotes the writer's
 * own words), nodes keyed to the eligible stars per kind. No `Math.random`.
 *
 * STAGED (the D12 two-beat is assertable): both ports can pause by
 * `stageDelayMs`, so a GET poll can observe the `s1` loading beat before stars,
 * and the `s3` stars-only beat before nodes. Zero in unit/contract tests (no real
 * delay); the E2E composition sets a modest value.
 *
 * HONEST SHAPES: the mock never emits a URL, a year-citation, or named-thinker
 * attribution (D7) — so the eval's "no node ever contains a citation" check
 * passes against the mock exactly as it must against the real validator.
 */

import { err, ok } from "../../domain/types/result";
import type { InferenceError } from "../../domain/types/errors";
import type {
  DiscoveryPort,
  NodeGenerationPort,
} from "../../domain/constellation/ports";
import type {
  Discovery,
  NodeKind,
  Star,
  ValidatedNode,
} from "../../domain/constellation/node-types";
import type { Result } from "../../domain/types/result";
import { eligibleStarsForKind } from "../../domain/constellation/node-gating";

export interface MockConstellationDeps {
  /** Pause each staged beat by this many ms so a GET poll can observe it
   * (default 0 — no delay in tests). */
  readonly stageDelayMs?: number;
}

/**
 * A draft containing this marker makes the mock S1 fail deterministically —
 * the eval affordance for the "partial failure degrades visibly, never a blank
 * board" workflow (§7), which is otherwise unreachable without a real outage.
 * E2E-only: the real adapters never look at draft content this way.
 */
export const E2E_FAIL_DISCOVERY_MARKER = "FORCE_CONSTELLATION_FAILURE";
/** Fails S3 instead, leaving S1's stars persisted — the PARTIAL constellation
 * (stars, no nodes) plus a visible failure line. */
export const E2E_FAIL_NODES_MARKER = "FORCE_CONSTELLATION_PARTIAL";

function delay(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

/** Words of the draft, whitespace-split and emptiness-filtered. */
function words(draft: string): readonly string[] {
  return draft.split(/\s+/).filter((w) => w.length > 0);
}

/** A verbatim draft span of up to `count` words starting at `start`, so the
 * board's quoted grounding is genuinely the writer's own sentence fragment.
 * Falls back to a short generic span for a draft too thin to slice. */
function span(draft: string, start: number, count: number): string {
  const ws = words(draft);
  const slice = ws.slice(start, start + count);
  return slice.length >= 2 ? slice.join(" ") : "the draft's opening idea";
}

/**
 * A deterministic S1 `Discovery`: three core stars (asserting / testing /
 * wondering — one of each so every S3 kind has an eligible target and the
 * two-beat + composition guarantees are exercised) plus one off-map seed. Star
 * ids are the domain-local refs the real adapter assigns (`s1…`, `o1…`).
 */
function mockDiscovery(draft: string): Discovery {
  const ws = words(draft);
  const stride = Math.max(1, Math.floor(ws.length / 4));
  const stars: readonly Star[] = [
    {
      id: "s1",
      label: "Your central claim",
      intent: "asserting",
      weight: 5,
      grounding: span(draft, 0, 6),
      kind: "star",
    },
    {
      id: "s2",
      label: "The idea you're testing",
      intent: "testing",
      weight: 3,
      grounding: span(draft, stride, 6),
      kind: "star",
    },
    {
      id: "s3",
      label: "An open thread you're exploring",
      intent: "wondering",
      weight: 2,
      grounding: span(draft, stride * 2, 6),
      kind: "star",
    },
  ];
  const offMapSeeds: readonly Star[] = [
    {
      id: "o1",
      label: "A dimension the draft never opens",
      intent: "wondering",
      weight: 1,
      grounding: "an adjacent question the topic invites but the draft leaves untouched",
      kind: "off-map",
    },
  ];
  return {
    brief:
      "A working summary of the draft's throughline, in the tool's own words — a co-thinker's read, never a copy of your sentences.",
    stars,
    offMapSeeds,
    confidence: ws.length >= 40 ? "high" : "low",
  };
}

/** The scent line + body for one kind — provocation-shaped, never a verdict,
 * never a citation. */
function nodeContent(
  kind: NodeKind,
): { readonly payoff: string; readonly body: string } {
  switch (kind) {
    case "counterargument":
      return {
        payoff: "The strongest sincere case against this",
        body: "Argued as its best advocate would: the opposing position, taken at full strength, and what it would take to answer it — a provocation, not a verdict on you.",
      };
    case "question":
      return {
        payoff: "What would have to be true for this to hold?",
        body: "A genuine question that opens a dimension the star leaves implicit — it points at what is unexamined without smuggling in an answer.",
      };
    case "argument":
      return {
        payoff: "Taken all the way, here is what you'd be committing to",
        body: "Follow the position to its end and name the commitment it implies — is that where you mean to go? A commitment test, not a compliment.",
      };
    case "direction":
      return {
        payoff: "A line of inquiry worth pursuing",
        body: "A lead the draft could follow, why it matters, and how you'd check it — a direction of thought, not a conclusion or a reading list.",
      };
    case "evidence":
    case "citation":
      // No Run 1 generator; the runner never asks the mock for these.
      return { payoff: "", body: "" };
  }
}

/** One node per eligible star for this kind (capped at two so a cluster stays
 * legible), keyed to the star's local id and grounded in its span. */
function mockNodes(
  kind: NodeKind,
  stars: readonly Star[],
): readonly ValidatedNode[] {
  const targets = eligibleStarsForKind(stars, kind).slice(0, 2);
  return targets.map((star) => {
    const { payoff, body } = nodeContent(kind);
    return {
      kind,
      tier: "inferred",
      starId: star.id,
      payoff,
      body,
      grounding: star.grounding,
    };
  });
}

export function createMockDiscoveryPort(
  deps: MockConstellationDeps = {},
): DiscoveryPort {
  const stageDelayMs = deps.stageDelayMs ?? 0;
  return {
    async discover(input): Promise<Result<Discovery, InferenceError>> {
      // The `s1` loading beat: pause so the board's first poll sees status s1
      // before the stars land.
      await delay(stageDelayMs);
      if (input.draft.includes(E2E_FAIL_DISCOVERY_MARKER)) {
        return err<InferenceError>({
          kind: "InferenceError",
          reason: "transport",
          message: "E2E forced discovery failure",
        });
      }
      return ok(mockDiscovery(input.draft));
    },
  };
}

export function createMockNodeGenerationPort(
  deps: MockConstellationDeps = {},
): NodeGenerationPort {
  const stageDelayMs = deps.stageDelayMs ?? 0;
  let firstCall = true;
  return {
    async generate(input): Promise<Result<readonly ValidatedNode[], InferenceError>> {
      // The `s3` stars-only beat: pause on the FIRST kind call (right after the
      // S1 checkpoint set status s3 + persisted stars) so a poll observes stars
      // before any node. Later kind calls don't re-pay it.
      if (firstCall) {
        firstCall = false;
        await delay(stageDelayMs);
      }
      if (input.draft.includes(E2E_FAIL_NODES_MARKER)) {
        return err<InferenceError>({
          kind: "InferenceError",
          reason: "transport",
          message: "E2E forced node-generation failure",
        });
      }
      return ok(mockNodes(input.kind, input.stars));
    },
  };
}
