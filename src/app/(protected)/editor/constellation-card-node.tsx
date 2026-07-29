"use client";

/**
 * constellation-card-node.tsx — one node card on the board.
 *
 * THE CARD FACE (plan §6, the scent contract): kind chip (icon + word + tone),
 * a one-line payoff, the QUOTED GROUNDING SPAN — the writer's own sentence,
 * which is what makes the provenance legible at scan zoom ("make research
 * legible"; the validated spans were previously persisted and never surfaced) —
 * the tier chip, and a read-time estimate.
 *
 * OPENED (D12): the card expands IN PLACE and elevates, so the detail keeps its
 * spatial connection to the star it hangs off (the 2026-03 audit's failure #9 —
 * a detail panel floating free of its source). It reveals the body plus three
 * one-tap affordances: a one-line reaction (submitting RESOLVES the node — the
 * only route to `resolved` in Run 1), "Set aside" (the honest defer label, since
 * resurfacing is not built), and "Dismiss". Shame-free: no unread counts, no
 * clear-all, and a settled card stays legible rather than vanishing.
 */

import { memo, useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { ArrowUpRightIcon, CheckIcon } from "@phosphor-icons/react";
import type { BoardNode } from "./constellation-glue";
import {
  KindChip,
  KIND_META,
  readMinutes,
  showsReadTime,
} from "./constellation-vocabulary";
import {
  isValidReaction,
  REACTION_MAX_CHARS,
} from "../../../domain/constellation/node-types";

export interface CardNodeData extends Record<string, unknown> {
  readonly node: BoardNode;
  readonly opened: boolean;
  readonly onOpen: (nodeId: string) => void;
  readonly onClose: () => void;
  readonly onReact: (nodeId: string, reaction: string) => void;
  readonly onDismiss: (nodeId: string) => void;
  readonly onSetAside: (nodeId: string) => void;
}

export type CardNode = Node<CardNodeData, "constellationCard">;

/** The settled-state line a resolved / dismissed / set-aside card carries, so a
 * handled card reads as handled rather than simply disappearing. */
const SETTLED_LABEL: Partial<Record<BoardNode["status"], string>> = {
  resolved: "You responded",
  dismissed: "Dismissed",
  deferred: "Set aside",
};

function CardNodeInner({ data }: NodeProps<CardNode>): React.JSX.Element {
  const { node, opened, onOpen, onClose, onReact, onDismiss, onSetAside } = data;
  const [reaction, setReaction] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the reaction line when the card opens — the writer's next act.
  useEffect(() => {
    if (opened) inputRef.current?.focus();
  }, [opened]);

  const settled = SETTLED_LABEL[node.status];
  const canSubmit = isValidReaction(reaction);

  const submit = useCallback(() => {
    if (!canSubmit) return;
    onReact(node.id, reaction.trim());
    setReaction("");
  }, [canSubmit, node.id, onReact, reaction]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape" && opened) {
        event.stopPropagation();
        onClose();
      }
    },
    [opened, onClose],
  );

  const className = [
    "gaddr-card",
    opened ? "gaddr-card--opened" : "",
    settled !== undefined ? "gaddr-card--settled" : "",
    node.status === "unseen" ? "gaddr-card--unseen" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="nodrag nopan nowheel gaddr-card-unfurl" onKeyDown={handleKeyDown}>
      <Handle type="target" position={Position.Top} className="gaddr-flow-handle" />
      <article
        className={className}
        data-testid={`constellation-card-${node.id}`}
        data-kind={node.kind}
        data-status={node.status}
        style={{ ["--card-tone" as string]: `var(${KIND_META[node.kind].toneVar})` }}
      >
        <header className="gaddr-card__head">
          <KindChip kind={node.kind} />
          {/* Both of these are constant in Run 1 — every node is `inferred` and
              every body is under a minute — so they render only once they can
              actually differ, rather than sitting on the card as furniture. */}
          {node.tier !== "inferred" || showsReadTime(node.body) ? (
            <span className="gaddr-card__meta">
              {node.tier !== "inferred" ? (
                <span className="gaddr-card__tier">{node.tier}</span>
              ) : null}
              {node.tier !== "inferred" && showsReadTime(node.body) ? (
                <span aria-hidden>·</span>
              ) : null}
              {showsReadTime(node.body) ? (
                <span>{readMinutes(node.body)} min</span>
              ) : null}
            </span>
          ) : null}
        </header>

        {/* The scent line. Opening is the writer's choice, so the payoff must
            carry the whole decision. */}
        <p className="gaddr-card__payoff">{node.payoff}</p>

        {/* Provenance, visible at scan zoom: the writer's own words. */}
        <blockquote className="gaddr-card__grounding">
          <span aria-hidden>“</span>
          {node.grounding}
          <span aria-hidden>”</span>
        </blockquote>

        {opened ? (
          <div className="gaddr-card__detail">
            <p className="gaddr-card__body">{node.body}</p>

            {node.reaction !== undefined ? (
              <p className="gaddr-card__reaction-said">
                <CheckIcon size={13} weight="bold" aria-hidden />
                {node.reaction}
              </p>
            ) : (
              <div className="gaddr-card__respond">
                <label
                  className="gaddr-card__respond-label"
                  htmlFor={`react-${node.id}`}
                >
                  Your response
                </label>
                <div className="gaddr-card__respond-row">
                  <input
                    id={`react-${node.id}`}
                    ref={inputRef}
                    className="gaddr-card__respond-input"
                    type="text"
                    value={reaction}
                    maxLength={REACTION_MAX_CHARS}
                    placeholder="In a line — what does this change?"
                    data-testid={`constellation-reaction-${node.id}`}
                    onChange={(e) => {
                      setReaction(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        submit();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="gaddr-card__respond-submit"
                    disabled={!canSubmit}
                    data-testid={`constellation-reaction-submit-${node.id}`}
                    onClick={submit}
                  >
                    <ArrowUpRightIcon size={14} weight="bold" aria-hidden />
                    <span className="sr-only">Save response</span>
                  </button>
                </div>
              </div>
            )}

            <div className="gaddr-card__actions">
              <button
                type="button"
                className="gaddr-card__action"
                data-testid={`constellation-setaside-${node.id}`}
                onClick={() => {
                  onSetAside(node.id);
                }}
              >
                Set aside
              </button>
              <button
                type="button"
                className="gaddr-card__action"
                data-testid={`constellation-dismiss-${node.id}`}
                onClick={() => {
                  onDismiss(node.id);
                }}
              >
                Dismiss
              </button>
              <button
                type="button"
                className="gaddr-card__action gaddr-card__action--close"
                aria-label="Close this card"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <footer className="gaddr-card__foot">
            {settled !== undefined ? (
              <span className="gaddr-card__settled">
                <CheckIcon size={12} weight="bold" aria-hidden />
                {settled}
              </span>
            ) : (
              <button
                type="button"
                className="gaddr-card__open"
                data-testid={`constellation-open-${node.id}`}
                aria-label={`Open ${KIND_META[node.kind].aria}: ${node.payoff}`}
                onClick={() => {
                  onOpen(node.id);
                }}
              >
                Open
              </button>
            )}
          </footer>
        )}
      </article>
      <Handle type="source" position={Position.Bottom} className="gaddr-flow-handle" />
    </div>
  );
}

export const ConstellationCardNode = memo(CardNodeInner);
