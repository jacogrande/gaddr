"use client";

import { XIcon } from "@phosphor-icons/react";
import type {
  ConstellationBranchActionKind,
  ConstellationExplorationNode,
  ConstellationWorkingSetDisposition,
} from "../../../domain/gadfly/constellation-types";
import { ConstellationDispositionBadge } from "./constellation-disposition-badge";
import { selectConstellationGroupedNodeChildren } from "./constellation-exploration-selectors";
import {
  formatConstellationCompactTrustSummary,
  formatConstellationConfidenceSummary,
  formatConstellationProvenanceSummary,
  formatConstellationSignalLabel,
} from "./constellation-formatters";

type PendingBranchActionState = {
  nodeId: string;
  kind: ConstellationBranchActionKind;
} | null;

function buildPanelTitle(node: ConstellationExplorationNode): string {
  if (node.family === "theme") {
    return "Theme exploration";
  }

  return `${formatConstellationSignalLabel(node.family)} branch`;
}

export function ExplorationPanel({
  selectedNode,
  selectedNodeId,
  pendingBranchAction,
  groupedChildren,
  selectedDispositions,
  workingSetNodeCount,
  onResetExploration,
  onRunBranchAction,
  onSelectNode,
  onSetWorkingSetDisposition,
  onRemoveNodeFromWorkingSet,
  onEnterDraftPrep,
}: {
  selectedNode: ConstellationExplorationNode;
  selectedNodeId: string | null;
  pendingBranchAction: PendingBranchActionState;
  groupedChildren: ReturnType<typeof selectConstellationGroupedNodeChildren>;
  selectedDispositions: Set<ConstellationWorkingSetDisposition>;
  workingSetNodeCount: number;
  onResetExploration: () => void;
  onRunBranchAction: (nodeId: string, actionKind: ConstellationBranchActionKind) => void;
  onSelectNode: (nodeId: string) => void;
  onSetWorkingSetDisposition: (
    nodeId: string,
    disposition: ConstellationWorkingSetDisposition,
    enabled: boolean,
  ) => void;
  onRemoveNodeFromWorkingSet: (nodeId: string) => void;
  onEnterDraftPrep: () => void;
}) {
  const isSaved = selectedDispositions.has("saved");
  const isPinned = selectedDispositions.has("pinned");
  const isUsedInDraft = selectedDispositions.has("use_in_draft");

  return (
    <aside
      data-testid="constellation-panel"
      className="gaddr-constellation-panel overflow-y-auto p-5"
      style={{
        width: "min(29rem, 90vw)",
        maxHeight: "72vh",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className="font-semibold uppercase tracking-[0.12em]"
            style={{ fontSize: "var(--constellation-text-xs)", color: "var(--app-muted-soft)" }}
          >
            {buildPanelTitle(selectedNode)}
          </div>
          <h2
            className="mt-2 font-semibold leading-tight"
            style={{ fontSize: "var(--constellation-text-2xl)", color: "var(--heading-2)" }}
          >
            {selectedNode.title}
          </h2>
          <p
            className="mt-1 leading-snug"
            style={{ fontSize: "var(--constellation-text-base)", color: "var(--app-muted)" }}
          >
            {selectedNode.summary}
          </p>
        </div>
        <button
          type="button"
          className="gaddr-constellation-close p-1.5 shrink-0"
          onClick={onResetExploration}
          aria-label="Return to atlas overview"
        >
          <XIcon size={16} />
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <section>
          <h3 className="gaddr-constellation-panel-heading">Why this surfaced</h3>
          <p className="gaddr-constellation-panel-copy">{selectedNode.whySurfaced.label}</p>
          {selectedNode.whySurfaced.detail ? (
            <p className="gaddr-constellation-panel-copy mt-1 text-[color:var(--app-muted)]">
              {selectedNode.whySurfaced.detail}
            </p>
          ) : null}
        </section>

        <section>
          <h3 className="gaddr-constellation-panel-heading">Confidence</h3>
          <p className="gaddr-constellation-panel-copy">
            {formatConstellationConfidenceSummary(selectedNode.confidenceScore)}
          </p>
          <p className="gaddr-constellation-panel-meta mt-1">
            {formatConstellationCompactTrustSummary(selectedNode)}
          </p>
        </section>

        <section>
          <h3 className="gaddr-constellation-panel-heading">Provenance</h3>
          <p className="gaddr-constellation-panel-copy">
            {formatConstellationProvenanceSummary(selectedNode)}
          </p>
        </section>

        <section>
          <h3 className="gaddr-constellation-panel-heading">Working set</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="gaddr-constellation-action-chip"
              aria-pressed={isSaved}
              onClick={() => {
                onSetWorkingSetDisposition(selectedNode.id, "saved", !isSaved);
              }}
            >
              {isSaved ? "Saved" : "Save to working set"}
            </button>
            <button
              type="button"
              className="gaddr-constellation-action-chip"
              aria-pressed={isPinned}
              onClick={() => {
                onSetWorkingSetDisposition(selectedNode.id, "pinned", !isPinned);
              }}
            >
              {isPinned ? "Pinned" : "Pin"}
            </button>
            <button
              type="button"
              className="gaddr-constellation-action-chip"
              aria-pressed={isUsedInDraft}
              onClick={() => {
                onSetWorkingSetDisposition(selectedNode.id, "use_in_draft", !isUsedInDraft);
              }}
            >
              {isUsedInDraft ? "In draft" : "Use in draft"}
            </button>
            {selectedDispositions.size > 0 ? (
              <button
                type="button"
                className="gaddr-constellation-action-chip"
                onClick={() => {
                  onRemoveNodeFromWorkingSet(selectedNode.id);
                }}
              >
                Remove from working set
              </button>
            ) : null}
            {workingSetNodeCount > 0 ? (
              <button
                type="button"
                data-testid="constellation-open-draft-prep"
                className="gaddr-constellation-action-chip"
                onClick={onEnterDraftPrep}
              >
                Go to draft prep
              </button>
            ) : null}
          </div>
        </section>

        {selectedNode.suggestedBranchActions.length > 0 ? (
          <section>
            <h3 className="gaddr-constellation-panel-heading">Suggested next actions</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedNode.suggestedBranchActions.map((action) => {
                const isPending =
                  pendingBranchAction?.nodeId === selectedNode.id &&
                  pendingBranchAction.kind === action.kind;

                return (
                  <button
                    key={action.kind}
                    type="button"
                    className="gaddr-constellation-action-chip"
                    data-testid={`constellation-action-${action.kind}`}
                    onClick={() => {
                      onRunBranchAction(selectedNode.id, action.kind);
                    }}
                    disabled={pendingBranchAction !== null}
                    aria-busy={isPending}
                  >
                    {isPending ? "Generating..." : action.label}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {groupedChildren.map((group) => (
          <section key={group.family}>
            <h3 className="gaddr-constellation-panel-heading">{group.label}</h3>
            <div className="mt-2 space-y-2">
              {group.nodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  className={`gaddr-constellation-panel-card gaddr-constellation-panel-card-button ${
                    selectedNodeId === node.id ? "gaddr-constellation-panel-card--selected" : ""
                  }`}
                  onClick={() => {
                    onSelectNode(node.id);
                  }}
                  data-testid={`constellation-panel-child-${node.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 text-left">
                      <h4
                        className="font-semibold leading-tight"
                        style={{ fontSize: "var(--constellation-text-base)", color: "var(--app-fg)" }}
                      >
                        {node.title}
                      </h4>
                      <p className="gaddr-constellation-panel-meta mt-1">
                        {formatConstellationSignalLabel(node.family)} · {formatConstellationCompactTrustSummary(node)}
                      </p>
                      <p className="gaddr-constellation-panel-copy mt-1">{node.summary}</p>
                    </div>
                    <span className="gaddr-constellation-pill shrink-0">
                      {formatConstellationConfidenceSummary(node.confidenceScore)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-left">
                    {node.isUsedInDraft ? <ConstellationDispositionBadge label="In draft" /> : null}
                    {node.isPinned ? <ConstellationDispositionBadge label="Pinned" /> : null}
                    {node.isSavedToWorkingSet ? <ConstellationDispositionBadge label="Saved" /> : null}
                  </div>
                  <p className="gaddr-constellation-panel-meta mt-2 text-left">
                    {formatConstellationProvenanceSummary(node)}
                  </p>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
