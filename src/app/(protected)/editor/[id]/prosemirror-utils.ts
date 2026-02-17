import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

type TextPosition = { from: number; to: number } | null;

/**
 * Find the position of `searchText` within a ProseMirror doc.
 * When `blockIndex` is provided, restricts the search to the top-level
 * block at that index, falling back to a global search if not found.
 */
export function findTextPosition(
  doc: ProseMirrorNode,
  searchText: string,
  blockIndex?: number,
): TextPosition {
  // Try block-scoped search first when blockIndex is provided
  if (blockIndex !== undefined) {
    const blockResult = findInBlock(doc, searchText, blockIndex);
    if (blockResult) return blockResult;
  }

  // Fall back to global search
  return findInNode(doc, searchText);
}

function findInBlock(
  doc: ProseMirrorNode,
  searchText: string,
  blockIndex: number,
): TextPosition {
  if (blockIndex >= doc.childCount) return null;
  const block = doc.child(blockIndex);

  // Calculate the absolute offset of this block within the doc
  let blockOffset = 1; // doc node opens at pos 0, first child at pos 1
  for (let i = 0; i < blockIndex; i++) {
    blockOffset += doc.child(i).nodeSize;
  }

  // Search within this block, adding blockOffset to get absolute positions
  const segments: Array<{ pos: number; text: string }> = [];
  block.descendants((node, pos) => {
    if (node.isText && node.text) {
      segments.push({ pos: blockOffset + pos, text: node.text });
    }
  });

  return searchSegments(segments, searchText);
}

function findInNode(doc: ProseMirrorNode, searchText: string): TextPosition {
  const segments: Array<{ pos: number; text: string }> = [];
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      segments.push({ pos, text: node.text });
    }
  });

  return searchSegments(segments, searchText);
}

function searchSegments(
  segments: Array<{ pos: number; text: string }>,
  searchText: string,
): TextPosition {
  let combined = "";
  const offsets: Array<{ textStart: number; docPos: number }> = [];
  for (const seg of segments) {
    offsets.push({ textStart: combined.length, docPos: seg.pos });
    combined += seg.text;
  }

  const idx = combined.indexOf(searchText);
  if (idx === -1) return null;

  let from = 0;
  let to = 0;
  const endIdx = idx + searchText.length;
  for (const entry of offsets) {
    if (entry.textStart <= idx) {
      from = entry.docPos + (idx - entry.textStart);
    }
    if (entry.textStart <= endIdx) {
      to = entry.docPos + (endIdx - entry.textStart);
    }
  }

  return { from, to };
}
