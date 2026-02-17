// Server component — renders TipTapDoc as React elements with inline evidence cards
// Evidence highlighting is driven by DB links as the single source of truth:
// embedded evidenceAttachment marks only render if their linkId matches a known DB link.

import type { ReactNode } from "react";
import type { TipTapDoc, TipTapNode } from "../../../domain/essay/essay";
import type { EvidenceByBlock } from "../../../domain/evidence/public-view";
import type { Stance } from "../../../domain/evidence/evidence-card";
import { STANCES } from "../../../domain/evidence/evidence-card";
import { isSafeUrl } from "../../../domain/types/url";
import { EvidenceCardInline } from "./evidence-card-inline";

function isStance(s: string): s is Stance {
  return (STANCES as readonly string[]).includes(s);
}

type Props = {
  readonly doc: TipTapDoc;
  readonly evidenceByBlock: EvidenceByBlock;
};

function renderMark(
  child: ReactNode,
  mark: { readonly type: string; readonly attrs?: Record<string, unknown> },
  key: string,
  knownLinkIds: ReadonlySet<string>,
): ReactNode {
  switch (mark.type) {
    case "bold":
      return <strong key={key}>{child}</strong>;
    case "italic":
      return <em key={key}>{child}</em>;
    case "code":
      return <code key={key}>{child}</code>;
    case "strike":
      return <s key={key}>{child}</s>;
    case "evidenceAttachment": {
      // Only highlight if this mark's linkId has a matching DB link
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
    }
    case "link": {
      const href = mark.attrs?.["href"];
      if (typeof href !== "string" || !isSafeUrl(href)) return child;
      return (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-stone-400 underline-offset-2 hover:decoration-[#B74134]"
        >
          {child}
        </a>
      );
    }
    default:
      return child;
  }
}

function renderInlineNode(
  node: TipTapNode,
  key: string,
  knownLinkIds: ReadonlySet<string>,
): ReactNode {
  if (node.type === "hardBreak") {
    return <br key={key} />;
  }

  if (node.type === "text") {
    let element: ReactNode = node.text ?? "";
    if (node.marks) {
      for (let i = 0; i < node.marks.length; i++) {
        const mark = node.marks[i];
        if (mark) {
          element = renderMark(element, mark, `${key}-m${String(i)}`, knownLinkIds);
        }
      }
    }
    return element;
  }

  return null;
}

function renderInlineContent(
  nodes: readonly TipTapNode[] | undefined,
  keyPrefix: string,
  knownLinkIds: ReadonlySet<string>,
): ReactNode[] {
  if (!nodes) return [];
  return nodes.map((node, i) =>
    renderInlineNode(node, `${keyPrefix}-${String(i)}`, knownLinkIds),
  );
}

// MAINTENANCE: update this switch when adding TipTap extensions to the editor
// (see src/app/(protected)/editor/[id]/essay-editor.tsx StarterKit config).
// Unhandled block types fall through to null and are silently omitted.
function renderBlockNode(
  node: TipTapNode,
  key: string,
  knownLinkIds: ReadonlySet<string>,
): ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{renderInlineContent(node.content, key, knownLinkIds)}</p>;

    case "heading": {
      const level = node.attrs?.["level"];
      const children = renderInlineContent(node.content, key, knownLinkIds);
      if (level === 3) return <h3 key={key}>{children}</h3>;
      if (level === 4) return <h4 key={key}>{children}</h4>;
      return <h2 key={key}>{children}</h2>;
    }

    case "bulletList":
      return (
        <ul key={key}>
          {node.content?.map((child, i) =>
            renderBlockNode(child, `${key}-${String(i)}`, knownLinkIds),
          )}
        </ul>
      );

    case "orderedList":
      return (
        <ol key={key}>
          {node.content?.map((child, i) =>
            renderBlockNode(child, `${key}-${String(i)}`, knownLinkIds),
          )}
        </ol>
      );

    case "listItem":
      return (
        <li key={key}>
          {node.content?.map((child, i) =>
            renderBlockNode(child, `${key}-${String(i)}`, knownLinkIds),
          )}
        </li>
      );

    case "blockquote":
      return (
        <blockquote key={key}>
          {node.content?.map((child, i) =>
            renderBlockNode(child, `${key}-${String(i)}`, knownLinkIds),
          )}
        </blockquote>
      );

    case "codeBlock":
      return (
        <pre key={key}>
          <code>{renderInlineContent(node.content, key, knownLinkIds)}</code>
        </pre>
      );

    case "horizontalRule":
      return <hr key={key} />;

    default:
      return null;
  }
}

export function EssayRenderer({ doc, evidenceByBlock }: Props) {
  if (!doc.content) return null;

  // Build the set of known DB link IDs — single source of truth for evidence display
  const knownLinkIds = new Set<string>();
  for (const blockAttachments of Object.values(evidenceByBlock)) {
    for (const att of blockAttachments) {
      knownLinkIds.add(att.linkId);
    }
  }

  return (
    <div className="tiptap">
      {doc.content.map((block, blockIndex) => {
        const blockKey = `block-${String(blockIndex)}`;
        const rendered = renderBlockNode(block, blockKey, knownLinkIds);
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
