// Shared TipTap-to-React renderer — pure functions, no "use client"
// Base mark/block rendering with optional CustomMarkRenderer for extension points.

import type { ReactNode } from "react";
import type { TipTapNode } from "../../domain/essay/essay";
import { isSafeUrl } from "../../domain/types/url";

/**
 * Optional callback for custom mark handling.
 * Return a ReactNode to override rendering, or undefined to use the default.
 */
export type CustomMarkRenderer = (
  child: ReactNode,
  mark: { readonly type: string; readonly attrs?: Record<string, unknown> },
  key: string,
) => ReactNode | undefined;

function renderMark(
  child: ReactNode,
  mark: { readonly type: string; readonly attrs?: Record<string, unknown> },
  key: string,
  customMark?: CustomMarkRenderer,
): ReactNode {
  if (customMark) {
    const custom = customMark(child, mark, key);
    if (custom !== undefined) return custom;
  }

  switch (mark.type) {
    case "bold":
      return <strong key={key}>{child}</strong>;
    case "italic":
      return <em key={key}>{child}</em>;
    case "code":
      return <code key={key}>{child}</code>;
    case "strike":
      return <s key={key}>{child}</s>;
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
  customMark?: CustomMarkRenderer,
): ReactNode {
  if (node.type === "hardBreak") return <br key={key} />;

  if (node.type === "text") {
    let element: ReactNode = node.text ?? "";
    if (node.marks) {
      for (let i = 0; i < node.marks.length; i++) {
        const mark = node.marks[i];
        if (mark) {
          element = renderMark(element, mark, `${key}-m${String(i)}`, customMark);
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
  customMark?: CustomMarkRenderer,
): ReactNode[] {
  if (!nodes) return [];
  return nodes.map((node, i) =>
    renderInlineNode(node, `${keyPrefix}-${String(i)}`, customMark),
  );
}

export function renderBlockNode(
  node: TipTapNode,
  key: string,
  customMark?: CustomMarkRenderer,
): ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{renderInlineContent(node.content, key, customMark)}</p>;

    case "heading": {
      const level = node.attrs?.["level"];
      const children = renderInlineContent(node.content, key, customMark);
      if (level === 3) return <h3 key={key}>{children}</h3>;
      if (level === 4) return <h4 key={key}>{children}</h4>;
      return <h2 key={key}>{children}</h2>;
    }

    case "bulletList":
      return (
        <ul key={key}>
          {node.content?.map((child, i) =>
            renderBlockNode(child, `${key}-${String(i)}`, customMark),
          )}
        </ul>
      );

    case "orderedList":
      return (
        <ol key={key}>
          {node.content?.map((child, i) =>
            renderBlockNode(child, `${key}-${String(i)}`, customMark),
          )}
        </ol>
      );

    case "listItem":
      return (
        <li key={key}>
          {node.content?.map((child, i) =>
            renderBlockNode(child, `${key}-${String(i)}`, customMark),
          )}
        </li>
      );

    case "blockquote":
      return (
        <blockquote key={key}>
          {node.content?.map((child, i) =>
            renderBlockNode(child, `${key}-${String(i)}`, customMark),
          )}
        </blockquote>
      );

    case "codeBlock":
      return (
        <pre key={key}>
          <code>{renderInlineContent(node.content, key, customMark)}</code>
        </pre>
      );

    case "horizontalRule":
      return <hr key={key} />;

    default:
      return null;
  }
}

export function extractBlockText(node: TipTapNode): string {
  if (node.text !== undefined) return node.text;
  if (!node.content) return "";
  return node.content.map(extractBlockText).join("");
}
