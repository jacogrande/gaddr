// Server component — renders TipTapDoc as React elements with inline evidence cards
// Evidence highlighting is driven by DB links as the single source of truth:
// embedded evidenceAttachment marks only render if their linkId matches a known DB link.

import type { ReactNode } from "react";
import type { TipTapDoc } from "../../../domain/essay/essay";
import type { EvidenceByBlock } from "../../../domain/evidence/public-view";
import type { Stance } from "../../../domain/evidence/evidence-card";
import { STANCES } from "../../../domain/evidence/evidence-card";
import { renderBlockNode } from "../../_shared/tiptap-renderer";
import type { CustomMarkRenderer } from "../../_shared/tiptap-renderer";
import { EvidenceCardInline } from "./evidence-card-inline";

function isStance(s: string): s is Stance {
  return (STANCES as readonly string[]).includes(s);
}

type Props = {
  readonly doc: TipTapDoc;
  readonly evidenceByBlock: EvidenceByBlock;
};

export function EssayRenderer({ doc, evidenceByBlock }: Props) {
  if (!doc.content) return null;

  // Build the set of known DB link IDs — single source of truth for evidence display
  const knownLinkIds = new Set<string>();
  for (const blockAttachments of Object.values(evidenceByBlock)) {
    for (const att of blockAttachments) {
      knownLinkIds.add(att.linkId);
    }
  }

  const customMark: CustomMarkRenderer = (
    child: ReactNode,
    mark: { readonly type: string; readonly attrs?: Record<string, unknown> },
    key: string,
  ): ReactNode | undefined => {
    if (mark.type !== "evidenceAttachment") return undefined;

    const linkId = mark.attrs?.["linkId"];
    if (typeof linkId !== "string" || !knownLinkIds.has(linkId)) return child;
    const raw = mark.attrs?.["stance"];
    const stance: Stance =
      typeof raw === "string" && isStance(raw) ? raw : "supports";
    return (
      <span key={key} className={`evidence-mark evidence-mark--${stance}`}>
        {child}
      </span>
    );
  };

  return (
    <div className="tiptap">
      {doc.content.map((block, blockIndex) => {
        const blockKey = `block-${String(blockIndex)}`;
        const rendered = renderBlockNode(block, blockKey, customMark);
        const attachments = evidenceByBlock[blockIndex];

        if (!attachments || attachments.length === 0) {
          return rendered;
        }

        return (
          <div key={blockKey}>
            {rendered}
            {attachments.map((att) => (
              <EvidenceCardInline
                key={att.linkId}
                sourceUrl={att.card.sourceUrl}
                sourceTitle={att.card.sourceTitle}
                quoteSnippet={att.card.quoteSnippet}
                userSummary={att.card.userSummary}
                caveats={att.card.caveats}
                stance={att.card.stance}
                claimText={att.claimText}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
