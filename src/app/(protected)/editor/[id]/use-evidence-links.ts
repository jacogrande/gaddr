"use client";

import { useCallback, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { attachEvidenceAction, detachEvidenceAction } from "../actions";
import { findTextPosition } from "./prosemirror-utils";
import type { EvidenceLinkData } from "../../evidence-types";

export function useEvidenceLinks(
  essayId: string,
  initialLinks: EvidenceLinkData[],
) {
  const [links, setLinks] = useState<EvidenceLinkData[]>(initialLinks);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Ref tracks latest links synchronously to prevent stale closures in async callbacks
  const linksRef = useRef(links);
  linksRef.current = links;

  const applyMarks = useCallback(
    (editor: Editor, currentLinks: EvidenceLinkData[]) => {
      // Save current selection so we can restore it after mark application
      const { from: savedFrom, to: savedTo } = editor.state.selection;

      // Remove all existing evidence marks first
      const { doc } = editor.state;
      const removals: Array<{ from: number; to: number }> = [];
      doc.descendants((node, pos) => {
        if (node.isText) {
          const marks = node.marks.filter(
            (m) => m.type.name === "evidenceAttachment",
          );
          if (marks.length > 0) {
            removals.push({ from: pos, to: pos + node.nodeSize });
          }
        }
      });

      // Remove in reverse to preserve positions
      for (let i = removals.length - 1; i >= 0; i--) {
        const removal = removals[i];
        if (removal) {
          editor
            .chain()
            .setTextSelection(removal)
            .unsetMark("evidenceAttachment")
            .run();
        }
      }

      // Apply marks for current links, using anchorBlockIndex for precise placement
      for (const link of currentLinks) {
        const position = findTextPosition(
          editor.state.doc,
          link.claimText,
          link.anchorBlockIndex,
        );
        if (!position) continue;

        editor
          .chain()
          .setTextSelection(position)
          .setMark("evidenceAttachment", {
            linkId: link.id,
            evidenceCardId: link.evidenceCardId,
            stance: link.card.stance,
          })
          .run();
      }

      // Restore previous selection instead of resetting to doc start
      const docSize = editor.state.doc.content.size;
      const clampedFrom = Math.min(savedFrom, docSize);
      const clampedTo = Math.min(savedTo, docSize);
      editor.commands.setTextSelection({ from: clampedFrom, to: clampedTo });
    },
    [],
  );

  const attach = useCallback(
    async (
      editor: Editor,
      evidenceCardId: string,
      claimText: string,
      anchorBlockIndex: number,
    ) => {
      const result = await attachEvidenceAction(essayId, {
        evidenceCardId,
        claimText,
        anchorBlockIndex,
      });
      if ("error" in result) return result.error;

      const newLinks = [...linksRef.current, result.link];
      linksRef.current = newLinks;
      setLinks(newLinks);
      applyMarks(editor, newLinks);
      setPickerOpen(false);
      return null;
    },
    [essayId, applyMarks],
  );

  const detach = useCallback(
    async (editor: Editor, linkId: string) => {
      const result = await detachEvidenceAction(essayId, linkId);
      if ("error" in result) return result.error;

      const newLinks = linksRef.current.filter((l) => l.id !== linkId);
      linksRef.current = newLinks;
      setLinks(newLinks);
      applyMarks(editor, newLinks);
      return null;
    },
    [essayId, applyMarks],
  );

  return {
    links,
    pickerOpen,
    openPicker: () => { setPickerOpen(true); },
    closePicker: () => { setPickerOpen(false); },
    attach,
    detach,
    applyMarks,
  };
}
