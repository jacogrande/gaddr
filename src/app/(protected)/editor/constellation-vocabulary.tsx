"use client";

/**
 * constellation-vocabulary.tsx — the board's TYPE ENCODING, in one place (plan
 * §6: "type encoded redundantly: kind chip = icon + label + colour family —
 * never colour alone"). The 2026-03 audit's failure #4 (all islands identical
 * visual weight) and the colour-blind case are both answered here: identity is
 * carried by the ICON and the WORD first; the tone is a third, reinforcing
 * channel, drawn from tokens that already exist in both themes so nothing
 * invents a hue that fights the warm-paper palette.
 */

import {
  CompassIcon,
  FileTextIcon,
  PathIcon,
  QuestionIcon,
  QuotesIcon,
  ScalesIcon,
  type Icon,
} from "@phosphor-icons/react";
import type { NodeKind } from "../../../domain/constellation/node-types";
import type { PositionIntent } from "../../../domain/constellation/types";

export interface KindMeta {
  /** The word on the chip — identity never rests on colour. */
  readonly label: string;
  readonly Icon: Icon;
  /** The CSS custom property carrying this kind's tone (both themes define it). */
  readonly toneVar: string;
  /** Read aloud by assistive tech and used for the card's aria-label. */
  readonly aria: string;
}

/**
 * Tones are drawn from the EXISTING highlight/accent ramp, warmest → coolest by
 * how much the card pushes on the writer: the steelman (counterargument) carries
 * the strongest tone, a direction the quietest.
 */
export const KIND_META: Readonly<Record<NodeKind, KindMeta>> = {
  counterargument: {
    label: "Counter",
    Icon: ScalesIcon,
    toneVar: "--highlight-high",
    aria: "Counterargument",
  },
  argument: {
    label: "Stakes",
    Icon: PathIcon,
    toneVar: "--highlight-medium",
    aria: "Argument — a commitment test",
  },
  question: {
    label: "Question",
    Icon: QuestionIcon,
    toneVar: "--accent-strong",
    aria: "Question",
  },
  direction: {
    label: "Direction",
    Icon: CompassIcon,
    toneVar: "--highlight-low",
    aria: "Research direction",
  },
  // Sourced tier — no Run 1 generator, but the board must not crash if one ever
  // arrives (forward-compatible, per the taxonomy living in the domain from day one).
  evidence: {
    label: "Evidence",
    Icon: FileTextIcon,
    toneVar: "--accent",
    aria: "Evidence",
  },
  citation: {
    label: "Citation",
    Icon: QuotesIcon,
    toneVar: "--accent",
    aria: "Citation",
  },
};

/** The writer's stance on a star, as a plain word (never colour alone). */
export const INTENT_LABEL: Readonly<Record<PositionIntent, string>> = {
  asserting: "asserting",
  testing: "testing",
  wondering: "wondering",
};

/**
 * A rough read-time for a card body, shown on the card face (§6 "read-time
 * estimate"). 240 wpm; floored at one minute so nothing reads as "0 min".
 */
export function readMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter((w) => w.length > 0).length;
  return Math.max(1, Math.round(words / 240));
}

/**
 * Whether a read-time is worth showing. `NODE_BODY_MAX_CHARS` caps a body at
 * ~150 words, so in Run 1 `readMinutes` can only ever return 1 — a chip reading
 * "1 min" on every card forever is furniture, not information. Showing it only
 * past a minute means the field appears by itself once bodies actually vary
 * (Run 2's sourced tier), instead of needing to be remembered.
 */
export function showsReadTime(body: string): boolean {
  return readMinutes(body) > 1;
}

/** The kind chip — icon + word + tone, the redundant encoding in one element. */
export function KindChip({ kind }: { readonly kind: NodeKind }): React.JSX.Element {
  const meta = KIND_META[kind];
  const { Icon: KindIcon } = meta;
  return (
    <span
      className="gaddr-kind-chip"
      style={{ ["--chip-tone" as string]: `var(${meta.toneVar})` }}
    >
      <KindIcon size={13} weight="bold" aria-hidden />
      {meta.label}
    </span>
  );
}
