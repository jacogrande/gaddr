/**
 * Domain types for the background-inference / constellation layer.
 *
 * These are pure data shapes shared by the trigger path, the tiered inference
 * ports, and the in-memory substrate. No framework or SDK types leak in here:
 * an adapter translates Anthropic payloads into these on the way in.
 *
 * Vocabulary follows intelligence-roadmap.md Phase 1 (Discovery Substrate):
 * themes, tentative-positions with an intent axis, and internal tensions.
 */

import type { SprintId } from "../types/branded";
import type { BoundaryType, TriggerReason } from "../editor/trigger-detector";

/**
 * Provenance tier. Every finding is tagged so the UI can render — and the
 * writer can trust — sourced evidence differently from model inference.
 *  - "sourced"   — verified against a real retrieved span
 *  - "inferred"  — model reasoning over the freewrite text, no external source
 *  - "heuristic" — pattern-level signal, no model judgement
 */
export type ProvenanceTier = "sourced" | "inferred" | "heuristic";

/** The intent axis a tentative position is taken with. */
export type PositionIntent = "asserting" | "testing" | "wondering";

/** Is this burst circling a concern we've seen, or opening a new one? */
export type ThemeDelta = "recurring" | "new-direction" | "none";

/**
 * Signals that justify escalating a burst from cheap triage to expensive,
 * retrieval-grounded analysis. Mirrors the "signals that justify Sonnet" set
 * in background-inference-during-freewrite.md.
 */
export type RetrievalSignal =
  | "declarative-claim"
  | "near-citation"
  | "named-entity"
  | "emotional-marker"
  | "hedging-shift"
  | "topic-shift"
  | "backtrack";

/**
 * A pause-bounded production burst — the unit of background work. Produced by
 * the orchestration shell from a trigger emission; the `seq` is a monotonic
 * per-sprint index so downstream findings can point back at the burst that
 * produced them without carrying the text twice.
 */
export type PBurst = {
  readonly sprintId: SprintId;
  readonly seq: number;
  readonly text: string;
  readonly reason: TriggerReason;
  readonly boundary?: BoundaryType;
};

/** Tier-1 (Haiku triage) output. Routing + substrate read this. */
export type TriageResult = {
  readonly intent: PositionIntent;
  readonly themeDelta: ThemeDelta;
  readonly retrievalSignals: readonly RetrievalSignal[];
  readonly tier: ProvenanceTier;
  /** The concern this burst is circling, if triage could name one. */
  readonly theme?: string;
};

export type FindingKind =
  | "citation"
  | "counter-position"
  | "steelman"
  | "assumption"
  | "further-reading";

/** A source span backing a `sourced` finding. */
export type SourceRef = {
  readonly title: string;
  readonly url: string;
  readonly span: string;
};

/**
 * Tier-2 (Sonnet analysis) output. A finding POINTS, QUESTIONS, or COMPARES —
 * it never carries replacement prose for the user's draft. The no-ghostwriting
 * validator enforces that invariant before a finding enters the substrate.
 */
export type Finding = {
  readonly kind: FindingKind;
  readonly tier: ProvenanceTier;
  /** The burst (`PBurst.seq`) this finding responds to. */
  readonly claimSeq: number;
  /** Short reference to what in the draft this points at. */
  readonly pointer: string;
  /** The question / explanation. Meta voice, not the writer's sentences. */
  readonly note: string;
  /** Present iff `tier === "sourced"`. */
  readonly source?: SourceRef;
};

/** A concern the writer keeps returning to. */
export type Theme = {
  readonly label: string;
  readonly weight: number;
  readonly firstSeq: number;
  readonly lastSeq: number;
};

/** A position the writer is taking, tagged with how committed they are. */
export type Position = {
  readonly seq: number;
  readonly intent: PositionIntent;
  readonly excerpt: string;
  readonly theme?: string;
};

/** Two positions on the same theme pulling in different directions. */
export type Tension = {
  readonly theme: string;
  readonly assertingSeq: number;
  readonly wonderingSeq: number;
};

/**
 * The per-sprint discovery substrate. Pure data; lives in memory for now,
 * rebuilt from scratch each sprint via `emptySubstrate`. A repository port can
 * persist this later without changing the reducers.
 */
export type Substrate = {
  readonly sprintId: SprintId;
  readonly themes: readonly Theme[];
  readonly positions: readonly Position[];
  readonly tensions: readonly Tension[];
  readonly findings: readonly Finding[];
};
