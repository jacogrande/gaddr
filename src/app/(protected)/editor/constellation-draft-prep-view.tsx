"use client";

import type { ConstellationWorkingSetDisposition } from "../../../domain/gadfly/constellation-types";
import { ConstellationDispositionBadge } from "./constellation-disposition-badge";
import type { ConstellationDraftPrepGroup } from "./constellation-draft-prep-selectors";
import {
  formatConstellationConfidenceSummary,
  formatConstellationProvenanceSummary,
  formatConstellationSignalLabel,
} from "./constellation-formatters";

export function DraftPrepView({
  groups,
  onSelectNode,
  onSetWorkingSetDisposition,
  onRemoveNodeFromWorkingSet,
  onSwapDraftPrepItemOrder,
}: {
  groups: readonly ConstellationDraftPrepGroup[];
  onSelectNode: (nodeId: string) => void;
  onSetWorkingSetDisposition: (
    nodeId: string,
    disposition: ConstellationWorkingSetDisposition,
    enabled: boolean,
  ) => void;
  onRemoveNodeFromWorkingSet: (nodeId: string) => void;
  onSwapDraftPrepItemOrder: (leftNodeId: string, rightNodeId: string) => void;
}) {
  if (groups.length === 0) {
    return (
      <section
        data-testid="constellation-draft-prep"
        className="gaddr-constellation-panel gaddr-constellation-draft-prep flex h-full items-center justify-center p-8"
      >
        <div className="max-w-xl text-center">
          <div className="gaddr-constellation-panel-heading">Draft prep</div>
          <h2
            className="mt-2 font-semibold"
            style={{ fontSize: "var(--constellation-text-2xl)", color: "var(--heading-2)" }}
          >
            Nothing collected yet
          </h2>
          <p className="gaddr-constellation-panel-copy mt-3">
            Save nodes or mark them as use in draft while exploring, then return here to shape the first draft.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="constellation-draft-prep"
      className="gaddr-constellation-draft-prep mx-auto flex h-full w-full max-w-6xl flex-col gap-5 p-5"
    >
      <header className="gaddr-constellation-panel p-5">
        <div className="gaddr-constellation-panel-heading">Draft prep</div>
        <h2
          className="mt-2 font-semibold"
          style={{ fontSize: "var(--constellation-text-2xl)", color: "var(--heading-2)" }}
        >
          Shape the first draft from collected branches
        </h2>
        <p className="gaddr-constellation-panel-copy mt-2">
          Review saved findings, promote the strongest ideas into draft-ready talking points, and trim anything that should stay exploratory.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => {
          const draftItemIds = group.items
            .filter((item) => item.isUsedInDraft)
            .map((item) => item.node.id);

          return (
            <section key={group.theme?.id ?? "ungrouped"} className="gaddr-constellation-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="gaddr-constellation-panel-heading">
                    {group.theme ? "Theme group" : "Collected group"}
                  </div>
                  <h3
                    className="mt-2 font-semibold"
                    style={{ fontSize: "var(--constellation-text-xl)", color: "var(--app-fg)" }}
                  >
                    {group.theme?.title ?? "Collected nodes"}
                  </h3>
                </div>
                <span className="gaddr-constellation-pill">{group.items.length} items</span>
              </div>

              <div className="mt-4 space-y-3">
                {group.items.map((item) => {
                  const draftIndex = draftItemIds.indexOf(item.node.id);
                  const previousDraftNodeId = draftIndex > 0 ? draftItemIds[draftIndex - 1] ?? null : null;
                  const nextDraftNodeId =
                    draftIndex >= 0 && draftIndex < draftItemIds.length - 1
                      ? draftItemIds[draftIndex + 1] ?? null
                      : null;

                  return (
                    <article
                      key={item.node.id}
                      className="gaddr-constellation-panel-card"
                      data-testid={`constellation-draft-item-${item.node.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="gaddr-constellation-panel-heading">
                            {formatConstellationSignalLabel(item.node.family)}
                          </div>
                          <h4
                            className="mt-1 font-semibold leading-tight"
                            style={{ fontSize: "var(--constellation-text-base)", color: "var(--app-fg)" }}
                          >
                            {item.node.title}
                          </h4>
                          <p className="gaddr-constellation-panel-copy mt-1">{item.node.summary}</p>
                          <p className="gaddr-constellation-panel-meta mt-2">
                            {item.node.whySurfaced.label}
                          </p>
                        </div>
                        <span className="gaddr-constellation-pill shrink-0">
                          {formatConstellationConfidenceSummary(item.node.confidenceScore)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.isUsedInDraft ? <ConstellationDispositionBadge label="In draft" /> : null}
                        {item.isPinned ? <ConstellationDispositionBadge label="Pinned" /> : null}
                        {item.isSaved ? <ConstellationDispositionBadge label="Saved" /> : null}
                      </div>

                      <p className="gaddr-constellation-panel-meta mt-3">
                        {formatConstellationProvenanceSummary(item.node)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="gaddr-constellation-action-chip"
                          aria-pressed={item.isUsedInDraft}
                          onClick={() => {
                            onSetWorkingSetDisposition(item.node.id, "use_in_draft", !item.isUsedInDraft);
                          }}
                        >
                          {item.isUsedInDraft ? "In draft" : "Use in draft"}
                        </button>
                        <button
                          type="button"
                          className="gaddr-constellation-action-chip"
                          aria-pressed={item.isPinned}
                          onClick={() => {
                            onSetWorkingSetDisposition(item.node.id, "pinned", !item.isPinned);
                          }}
                        >
                          {item.isPinned ? "Pinned" : "Pin"}
                        </button>
                        <button
                          type="button"
                          className="gaddr-constellation-action-chip"
                          onClick={() => {
                            onRemoveNodeFromWorkingSet(item.node.id);
                          }}
                        >
                          Remove
                        </button>
                        {item.isUsedInDraft ? (
                          <>
                            <button
                              type="button"
                              className="gaddr-constellation-action-chip"
                              disabled={previousDraftNodeId === null}
                              onClick={() => {
                                if (previousDraftNodeId) {
                                  onSwapDraftPrepItemOrder(item.node.id, previousDraftNodeId);
                                }
                              }}
                            >
                              Move up
                            </button>
                            <button
                              type="button"
                              className="gaddr-constellation-action-chip"
                              disabled={nextDraftNodeId === null}
                              onClick={() => {
                                if (nextDraftNodeId) {
                                  onSwapDraftPrepItemOrder(item.node.id, nextDraftNodeId);
                                }
                              }}
                            >
                              Move down
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          className="gaddr-constellation-action-chip"
                          onClick={() => {
                            onSelectNode(item.node.id);
                          }}
                        >
                          Return to node
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
