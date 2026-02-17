"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPublishedDate } from "../../../../domain/essay/formatting";
import { listVersionsAction, getVersionAction } from "../actions";
import type { VersionSummary, VersionDetail } from "../actions";
import { VersionDiffView } from "./version-diff-view";
import type { TipTapDoc } from "../../../../domain/essay/essay";
import { diffVersions } from "../../../../domain/essay/version-operations";
import { renderBlockNode } from "./version-block-renderer";

type Props = {
  essayId: string;
  currentDoc: TipTapDoc;
  onDismiss: () => void;
};

type ViewState =
  | { kind: "list" }
  | { kind: "viewing"; version: VersionDetail }
  | { kind: "diffing"; version: VersionDetail };

export function VersionHistoryPanel({ essayId, currentDoc, onDismiss }: Props) {
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>({ kind: "list" });
  const [loadingVersion, setLoadingVersion] = useState(false);

  useEffect(() => {
    void listVersionsAction(essayId).then((result) => {
      if ("versions" in result) {
        setVersions(result.versions);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });
  }, [essayId]);

  const handleSelectVersion = useCallback(
    (versionId: string, mode: "viewing" | "diffing") => {
      setLoadingVersion(true);
      setError(null);
      void getVersionAction(essayId, versionId).then((result) => {
        setLoadingVersion(false);
        if ("version" in result) {
          setViewState({ kind: mode, version: result.version });
        } else {
          setError(result.error);
        }
      });
    },
    [essayId],
  );

  const handleBack = useCallback(() => {
    setViewState({ kind: "list" });
    setError(null);
  }, []);

  // Memoize diff computation — avoids recalculating on every keystroke
  const diffs = useMemo(() => {
    if (viewState.kind !== "diffing") return [];
    const versionDoc = viewState.version.content;
    return diffVersions(versionDoc, currentDoc);
  }, [viewState, currentDoc]);

  if (viewState.kind === "viewing") {
    const versionDoc = viewState.version.content;
    return (
      <div className="w-full lg:w-[420px] flex-shrink-0">
        <div className="lg:sticky lg:top-8">
          <div className="rounded-lg border-2 border-stone-200 bg-white shadow-[4px_4px_0px_#2C2416]">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <button
                type="button"
                onClick={handleBack}
                className="text-sm font-semibold text-stone-500 hover:text-stone-900"
              >
                &larr; Back
              </button>
              <span className="text-sm font-bold text-stone-900">
                Version {viewState.version.versionNumber}
              </span>
              <button
                type="button"
                onClick={onDismiss}
                className="text-sm font-semibold text-stone-400 hover:text-stone-900"
              >
                Close
              </button>
            </div>
            <div className="px-4 py-2 text-xs text-stone-400">
              {formatPublishedDate(new Date(viewState.version.publishedAt))} &middot; {viewState.version.wordCount} words
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-4 pb-4">
              <div className="tiptap text-sm text-stone-700">
                {versionDoc.content?.map((block, i) =>
                  renderBlockNode(block, `vb-${String(i)}`)
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewState.kind === "diffing") {
    return (
      <div className="w-full lg:w-[420px] flex-shrink-0">
        <div className="lg:sticky lg:top-8">
          <div className="rounded-lg border-2 border-stone-200 bg-white shadow-[4px_4px_0px_#2C2416]">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <button
                type="button"
                onClick={handleBack}
                className="text-sm font-semibold text-stone-500 hover:text-stone-900"
              >
                &larr; Back
              </button>
              <span className="text-sm font-bold text-stone-900">
                v{viewState.version.versionNumber} vs Current
              </span>
              <button
                type="button"
                onClick={onDismiss}
                className="text-sm font-semibold text-stone-400 hover:text-stone-900"
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-4 py-4">
              <VersionDiffView diffs={diffs} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="w-full lg:w-[380px] flex-shrink-0">
      <div className="lg:sticky lg:top-8">
        <div className="rounded-lg border-2 border-stone-200 bg-white shadow-[4px_4px_0px_#2C2416]">
          <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
            <span className="text-sm font-bold text-stone-900">Version History</span>
            <button
              type="button"
              onClick={onDismiss}
              className="text-sm font-semibold text-stone-400 hover:text-stone-900"
            >
              Close
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="mx-4 mt-3 rounded border-2 border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
                {error}
              </div>
            )}
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-stone-400">
                Loading versions...
              </div>
            ) : versions.length === 0 && !error ? (
              <div className="px-4 py-6 text-center text-sm text-stone-400">
                No versions yet. Publish your essay to create the first version.
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {versions.map((v) => (
                  <li key={v.id} className="px-4 py-3 hover:bg-stone-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-stone-900">
                        Version {v.versionNumber}
                      </span>
                      <span className="text-xs text-stone-400">
                        {v.wordCount} words
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-stone-400">
                      {formatPublishedDate(new Date(v.publishedAt))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={loadingVersion}
                        onClick={() => { handleSelectVersion(v.id, "viewing"); }}
                        className="text-xs font-semibold text-[#B74134] hover:text-[#8a3028] disabled:opacity-50"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        disabled={loadingVersion}
                        onClick={() => { handleSelectVersion(v.id, "diffing"); }}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
                      >
                        Compare with current
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
