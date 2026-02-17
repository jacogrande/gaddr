"use client";

import type { BlockDiff } from "../../../../domain/essay/version-operations";
import type { TipTapNode } from "../../../../domain/essay/essay";
import { renderBlockNode, extractBlockText } from "./version-block-renderer";

type Props = {
  diffs: readonly BlockDiff[];
};

function DiffBlock({
  block,
  className,
  keyPrefix,
}: {
  block: TipTapNode;
  className: string;
  keyPrefix: string;
}) {
  const text = extractBlockText(block);
  return (
    <div className={`rounded px-3 py-2 text-sm ${className}`}>
      {text ? (
        <div className="tiptap">
          {renderBlockNode(block, keyPrefix)}
        </div>
      ) : (
        <span className="italic text-stone-300">(empty block)</span>
      )}
    </div>
  );
}

export function VersionDiffView({ diffs }: Props) {
  if (diffs.length === 0) {
    return (
      <p className="text-sm text-stone-400">No changes detected.</p>
    );
  }

  return (
    <div className="space-y-1">
      {diffs.map((diff, i) => {
        switch (diff.kind) {
          case "unchanged":
            return (
              <div key={i} className="rounded px-3 py-2 text-sm text-stone-300">
                (unchanged block)
              </div>
            );

          case "added":
            return (
              <DiffBlock
                key={i}
                block={diff.block}
                className="border-l-4 border-emerald-400 bg-emerald-50 text-emerald-900"
                keyPrefix={`diff-add-${String(i)}`}
              />
            );

          case "removed":
            return (
              <DiffBlock
                key={i}
                block={diff.block}
                className="border-l-4 border-red-400 bg-red-50 text-red-900 line-through"
                keyPrefix={`diff-rm-${String(i)}`}
              />
            );

          case "modified":
            return (
              <div key={i} className="space-y-0.5">
                <DiffBlock
                  block={diff.before}
                  className="border-l-4 border-red-400 bg-red-50 text-red-900 line-through"
                  keyPrefix={`diff-mod-before-${String(i)}`}
                />
                <DiffBlock
                  block={diff.after}
                  className="border-l-4 border-amber-400 bg-amber-50 text-amber-900"
                  keyPrefix={`diff-mod-after-${String(i)}`}
                />
              </div>
            );
        }
      })}
    </div>
  );
}
