/**
 * Pure reducers and selectors over the discovery substrate.
 *
 * Every function is a pure transform: substrate + event -> new substrate. No
 * time, no randomness, no I/O — the orchestration shell supplies bursts and
 * findings, this module decides how they fold into themes, positions,
 * tensions, and ranked findings.
 */

import type { SprintId } from "../types/branded";
import type {
  Finding,
  PBurst,
  Position,
  ProvenanceTier,
  Substrate,
  Tension,
  Theme,
  TriageResult,
} from "./types";

const EXCERPT_MAX_CHARS = 160;

export function emptySubstrate(sprintId: SprintId): Substrate {
  return {
    sprintId,
    themes: [],
    positions: [],
    tensions: [],
    findings: [],
  };
}

function excerptOf(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length <= EXCERPT_MAX_CHARS
    ? collapsed
    : `${collapsed.slice(0, EXCERPT_MAX_CHARS - 1).trimEnd()}…`;
}

function upsertTheme(
  themes: readonly Theme[],
  label: string,
  seq: number,
): readonly Theme[] {
  const existing = themes.find((theme) => theme.label === label);
  if (!existing) {
    return [
      ...themes,
      { label, weight: 1, firstSeq: seq, lastSeq: seq },
    ];
  }
  return themes.map((theme) =>
    theme.label === label
      ? { ...theme, weight: theme.weight + 1, lastSeq: seq }
      : theme,
  );
}

/**
 * An internal tension exists when the writer both asserts and wonders about
 * the same theme — a sign they haven't settled where they stand. Recomputed
 * from positions so it never drifts out of sync with them.
 */
function recomputeTensions(positions: readonly Position[]): readonly Tension[] {
  const tensions: Tension[] = [];
  const byTheme = new Map<string, Position[]>();
  for (const position of positions) {
    if (!position.theme) continue;
    const group = byTheme.get(position.theme) ?? [];
    group.push(position);
    byTheme.set(position.theme, group);
  }
  for (const [theme, group] of byTheme) {
    const asserting = group.find((p) => p.intent === "asserting");
    const wondering = group.find((p) => p.intent === "wondering");
    if (asserting && wondering) {
      tensions.push({
        theme,
        assertingSeq: asserting.seq,
        wonderingSeq: wondering.seq,
      });
    }
  }
  return tensions;
}

/**
 * Fold a triage result into the substrate: record the position, update the
 * theme weight if triage named one, and recompute tensions.
 */
export function applyTriage(
  substrate: Substrate,
  burst: PBurst,
  triage: TriageResult,
): Substrate {
  const position: Position = {
    seq: burst.seq,
    intent: triage.intent,
    excerpt: excerptOf(burst.text),
    theme: triage.theme,
  };
  const positions = [...substrate.positions, position];
  const themes = triage.theme
    ? upsertTheme(substrate.themes, triage.theme, burst.seq)
    : substrate.themes;
  return {
    ...substrate,
    positions,
    themes,
    tensions: recomputeTensions(positions),
  };
}

const TIER_RANK: Record<ProvenanceTier, number> = {
  sourced: 0,
  inferred: 1,
  heuristic: 2,
};

/**
 * Findings ranked for display: sourced evidence first, then most-recent claim.
 * Pure and stable — callers can render this directly.
 */
export function rankFindings(
  findings: readonly Finding[],
): readonly Finding[] {
  return [...findings].sort((a, b) => {
    const byTier = TIER_RANK[a.tier] - TIER_RANK[b.tier];
    if (byTier !== 0) return byTier;
    return b.claimSeq - a.claimSeq;
  });
}

/** Append a finding and keep the findings list ranked. */
export function applyFinding(
  substrate: Substrate,
  finding: Finding,
): Substrate {
  return {
    ...substrate,
    findings: rankFindings([...substrate.findings, finding]),
  };
}
