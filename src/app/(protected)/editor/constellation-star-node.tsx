"use client";

/**
 * constellation-star-node.tsx — a star anchor on the board: one of the writer's
 * load-bearing ideas, or an off-map seed.
 *
 * Answers three of the 2026-03 audit's failures by construction:
 *  - #4 (all islands identical weight): the ⚡ CRUX star is larger, carries the
 *    lightning marker AND a soft ignition glow — three redundant channels, so the
 *    highest-leverage idea reads as such at scan zoom.
 *  - #7/#8 (type too small / cramped): the label is set in the heading serif at
 *    1.0625rem and the chips at 0.72rem — above the 0.8rem/0.7rem floors the
 *    typography feedback set, with the anchor wide enough not to wrap awkwardly.
 *  - #10 (no keyboard nav): the anchor IS a button — Tab reaches it in reading
 *    order, Enter/Space expands, `aria-expanded` announces its state.
 */

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { LightningIcon, StarIcon, CircleDashedIcon } from "@phosphor-icons/react";
import type { BoardStar } from "./constellation-glue";
import { INTENT_LABEL } from "./constellation-vocabulary";

export interface StarNodeData extends Record<string, unknown> {
  readonly star: BoardStar;
  readonly isCrux: boolean;
  readonly isOffMap: boolean;
  /** The first seed in the off-map column carries the zone's heading (D10). */
  readonly leadsOffMap: boolean;
  readonly cardCount: number;
  /** The run has finished, so "no cards yet" would be a lie — it is just quiet. */
  readonly runComplete: boolean;
  readonly expanded: boolean;
  /** Something else on the board is expanded, so this anchor recedes. */
  readonly dimmed: boolean;
  readonly onToggle: (starId: string) => void;
}

export type StarNode = Node<StarNodeData, "constellationStar">;

function StarNodeInner({ data }: NodeProps<StarNode>): React.JSX.Element {
  const {
    star,
    isCrux,
    isOffMap,
    leadsOffMap,
    cardCount,
    runComplete,
    expanded,
    dimmed,
    onToggle,
  } = data;

  // A finished star with no cards is a dead end — rendering it as a button
  // invites a click that re-frames the camera onto an empty cluster.
  const quiet = runComplete && cardCount === 0;

  const stateClass = [
    "gaddr-star",
    quiet ? "gaddr-star--quiet" : "",
    isCrux ? "gaddr-star--crux" : "",
    isOffMap ? "gaddr-star--offmap" : "",
    expanded ? "gaddr-star--expanded" : "",
    dimmed ? "gaddr-star--dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const countLabel =
    cardCount === 0
      ? runComplete
        ? "quiet here"
        : "no cards yet"
      : `${String(cardCount)} card${cardCount === 1 ? "" : "s"}`;

  return (
    <div className="nodrag nopan gaddr-star-ignite">
      <Handle type="target" position={Position.Top} className="gaddr-flow-handle" />
      {leadsOffMap ? (
        <div className="gaddr-offmap-heading">
          <span className="gaddr-offmap-heading__label">
            What you didn&rsquo;t write about
          </span>
          <span className="gaddr-offmap-heading__rule" aria-hidden />
        </div>
      ) : null}
      <button
        type="button"
        className={stateClass}
        disabled={quiet}
        aria-expanded={quiet ? undefined : expanded}
        aria-label={`${star.label}. ${isCrux ? "Crux star. " : ""}${
          isOffMap ? "Off-map: " : ""
        }${INTENT_LABEL[star.intent]}, ${countLabel}.${
          quiet ? "" : expanded ? " Collapse." : " Expand."
        }`}
        data-testid={`constellation-star-${star.id}`}
        onClick={() => {
          onToggle(star.id);
        }}
      >
        <span className="gaddr-star__mark" aria-hidden>
          {isOffMap ? (
            <CircleDashedIcon size={isCrux ? 20 : 17} weight="bold" />
          ) : (
            <StarIcon size={isCrux ? 20 : 17} weight="fill" />
          )}
        </span>

        {isCrux ? (
          <span className="gaddr-star__crux" aria-hidden>
            <LightningIcon size={12} weight="fill" />
            Crux
          </span>
        ) : null}

        <span className="gaddr-star__label">{star.label}</span>

        <span className="gaddr-star__meta">
          <span className="gaddr-star__intent">
            {isOffMap ? "unwritten" : INTENT_LABEL[star.intent]}
          </span>
          <span className="gaddr-star__dot" aria-hidden>
            ·
          </span>
          <span className="gaddr-star__count">{countLabel}</span>
        </span>
      </button>
      <Handle type="source" position={Position.Bottom} className="gaddr-flow-handle" />
    </div>
  );
}

export const ConstellationStarNode = memo(StarNodeInner);
