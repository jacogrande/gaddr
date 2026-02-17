// Pure version operations — no framework imports, no throw

import type { EssayVersion } from "./version";
import type { Essay, TipTapDoc, TipTapNode } from "./essay";
import type { EssayVersionId } from "../types/branded";

// ── Snapshot creation ──

export function createVersionSnapshot(params: {
  id: EssayVersionId;
  essay: Essay;
  versionNumber: number;
  now: Date;
}): EssayVersion {
  return {
    id: params.id,
    essayId: params.essay.id,
    userId: params.essay.userId,
    versionNumber: params.versionNumber,
    title: params.essay.title,
    content: params.essay.content,
    publishedAt: params.now,
  };
}

// ── Block-level diffing ──

export type BlockDiff =
  | { readonly kind: "unchanged"; readonly blockIndex: number }
  | { readonly kind: "added"; readonly blockIndex: number; readonly block: TipTapNode }
  | { readonly kind: "removed"; readonly blockIndex: number; readonly block: TipTapNode }
  | {
      readonly kind: "modified";
      readonly blockIndex: number;
      readonly before: TipTapNode;
      readonly after: TipTapNode;
    };

function canonicalize(node: TipTapNode): string {
  return JSON.stringify(node);
}

/**
 * Longest Common Subsequence of two string arrays.
 * Returns index pairs [beforeIndex, afterIndex] for matched elements.
 */
function lcs(a: readonly string[], b: readonly string[]): readonly [number, number][] {
  const m = a.length;
  const n = b.length;
  // Build LCS length table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0),
  );
  for (let i = 1; i <= m; i++) {
    const prevRow = dp[i - 1];
    const currRow = dp[i];
    if (!prevRow || !currRow) continue;
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        currRow[j] = (prevRow[j - 1] ?? 0) + 1;
      } else {
        currRow[j] = Math.max(prevRow[j] ?? 0, currRow[j - 1] ?? 0);
      }
    }
  }
  // Backtrack to find matched pairs
  const pairs: [number, number][] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      pairs.push([i - 1, j - 1]);
      i--;
      j--;
    } else if ((dp[i - 1]?.[j] ?? 0) >= (dp[i]?.[j - 1] ?? 0)) {
      i--;
    } else {
      j--;
    }
  }
  pairs.reverse();
  return pairs;
}

export function diffVersions(
  before: TipTapDoc,
  after: TipTapDoc,
): readonly BlockDiff[] {
  const beforeBlocks = before.content ?? [];
  const afterBlocks = after.content ?? [];

  const beforeStrs = beforeBlocks.map(canonicalize);
  const afterStrs = afterBlocks.map(canonicalize);

  const matched = lcs(beforeStrs, afterStrs);

  const diffs: BlockDiff[] = [];
  let bi = 0; // pointer into beforeBlocks
  let ai = 0; // pointer into afterBlocks

  for (const [matchBi, matchAi] of matched) {
    // Everything before this match in "before" was removed
    while (bi < matchBi) {
      const block = beforeBlocks[bi];
      if (block) diffs.push({ kind: "removed", blockIndex: bi, block });
      bi++;
    }
    // Everything before this match in "after" was added
    while (ai < matchAi) {
      const block = afterBlocks[ai];
      if (block) diffs.push({ kind: "added", blockIndex: ai, block });
      ai++;
    }
    // The matched pair is unchanged
    diffs.push({ kind: "unchanged", blockIndex: ai });
    bi++;
    ai++;
  }

  // Remaining unmatched blocks from before → removed
  while (bi < beforeBlocks.length) {
    const block = beforeBlocks[bi];
    if (block) diffs.push({ kind: "removed", blockIndex: bi, block });
    bi++;
  }
  // Remaining unmatched blocks from after → added
  while (ai < afterBlocks.length) {
    const block = afterBlocks[ai];
    if (block) diffs.push({ kind: "added", blockIndex: ai, block });
    ai++;
  }

  return mergeModified(diffs);
}

/**
 * Post-process: merge runs of removed+added blocks into "modified" entries
 * where the block types match. Pairs are consumed in order; excess entries
 * remain as plain removed or added.
 */
function mergeModified(diffs: readonly BlockDiff[]): readonly BlockDiff[] {
  const result: BlockDiff[] = [];
  let i = 0;
  while (i < diffs.length) {
    // Collect a run of consecutive removed blocks
    const removed: { blockIndex: number; block: TipTapNode }[] = [];
    while (i < diffs.length) {
      const d = diffs[i];
      if (!d || d.kind !== "removed") break;
      removed.push({ blockIndex: d.blockIndex, block: d.block });
      i++;
    }
    // Collect the following run of consecutive added blocks
    const added: { blockIndex: number; block: TipTapNode }[] = [];
    while (i < diffs.length) {
      const d = diffs[i];
      if (!d || d.kind !== "added") break;
      added.push({ blockIndex: d.blockIndex, block: d.block });
      i++;
    }

    if (removed.length > 0 || added.length > 0) {
      // Pair up removed+added with matching types → modified
      const pairCount = Math.min(removed.length, added.length);
      for (let p = 0; p < pairCount; p++) {
        const r = removed[p];
        const a = added[p];
        if (r && a && r.block.type === a.block.type) {
          result.push({
            kind: "modified",
            blockIndex: a.blockIndex,
            before: r.block,
            after: a.block,
          });
        } else {
          if (r) result.push({ kind: "removed", blockIndex: r.blockIndex, block: r.block });
          if (a) result.push({ kind: "added", blockIndex: a.blockIndex, block: a.block });
        }
      }
      // Emit remaining unpaired entries
      for (let p = pairCount; p < removed.length; p++) {
        const r = removed[p];
        if (r) result.push({ kind: "removed", blockIndex: r.blockIndex, block: r.block });
      }
      for (let p = pairCount; p < added.length; p++) {
        const a = added[p];
        if (a) result.push({ kind: "added", blockIndex: a.blockIndex, block: a.block });
      }
    } else {
      // Not a removed/added — pass through unchanged
      const d = diffs[i];
      if (d) result.push(d);
      i++;
    }
  }
  return result;
}
