"use client";

import { SparkleIcon } from "@phosphor-icons/react";

/**
 * The spark affordance: a small fixed glyph at the sprint surface's edge, the
 * VISIBLE path to summoning (the ⌘. hotkey is only an accelerator). It is
 * VISUALLY CONSTANT (plan §5.2 / the §5.3 contract): no animation, no badge, no
 * hover pulse, and — critically — no enabled/disabled duality. Its DOM is
 * identical in every pre-summon state, so a typing-driven threshold crossing can
 * never change it. Below-minimum-ground and every other gate live in the hook;
 * the glyph does not react. Rendered by `minimal-editor` only while the sprint is
 * `running`.
 */
export function SparkAffordance({
  onSummon,
  shortcutHint,
}: {
  readonly onSummon: () => void;
  readonly shortcutHint: string;
}) {
  return (
    <button
      type="button"
      data-testid="spark-affordance"
      aria-label={`Summon a spark (${shortcutHint})`}
      title={`Summon a spark  ·  ${shortcutHint}`}
      onClick={onSummon}
      className="gaddr-spark-affordance fixed bottom-5 right-[4.75rem] z-[55] flex h-9 w-9 items-center justify-center rounded-full border"
    >
      <SparkleIcon size={16} weight="regular" aria-hidden="true" />
    </button>
  );
}
