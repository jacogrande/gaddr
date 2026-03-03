import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { GadflyAnnotation } from "../../../domain/gadfly/types";
import { groupGadflyAnnotations } from "../../../domain/gadfly/presentation";

type GadflyMeta = {
  annotations: readonly GadflyAnnotation[];
};

function isGadflyMeta(value: unknown): value is GadflyMeta {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return Array.isArray(record["annotations"]);
}

function buildDecorationSet(
  doc: ProseMirrorNode,
  annotations: readonly GadflyAnnotation[],
): DecorationSet {
  const maxPos = doc.content.size;
  const groups = groupGadflyAnnotations(annotations);
  const decorations = groups.flatMap((group) => {
    const from = Math.max(0, Math.min(group.anchor.from, maxPos));
    const to = Math.max(from, Math.min(group.anchor.to, maxPos));

    if (to <= from) {
      return [];
    }

    const className = [
      "gaddr-gadfly-highlight",
      `gaddr-gadfly-highlight--${group.severity}`,
      `gaddr-gadfly-highlight--status-${group.status}`,
      group.annotations.length > 1 ? "gaddr-gadfly-highlight--stacked" : "",
    ]
      .filter((value) => value.length > 0)
      .join(" ");

    const markerText = group.references.map((reference) => String(reference.index)).join(" ");
    const groupIds = group.annotations.map((annotation) => annotation.id).join("|");

    return [
      Decoration.inline(from, to, {
        class: className,
        "data-gadfly-group-id": group.id,
        "data-gadfly-ids": groupIds,
        "data-gadfly-count": String(group.annotations.length),
      }),
      Decoration.widget(
        to,
        () => {
          const marker = document.createElement("span");
          marker.className = "gaddr-gadfly-marker";
          marker.setAttribute("data-gadfly-group-id", group.id);
          marker.setAttribute("data-gadfly-ids", groupIds);
          marker.setAttribute("data-gadfly-count", String(group.annotations.length));
          marker.setAttribute("contenteditable", "false");
          marker.textContent = markerText;
          return marker;
        },
        {
          side: 1,
          ignoreSelection: true,
          key: `gadfly-marker:${group.id}:${markerText}`,
        },
      ),
    ];
  });

  return DecorationSet.create(doc, decorations);
}

const gadflyPluginKey = new PluginKey<DecorationSet>("gaddr-gadfly-highlights");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    gadflyHighlights: {
      setGadflyAnnotations: (annotations: readonly GadflyAnnotation[]) => ReturnType;
    };
  }
}

export const GadflyHighlights = Extension.create({
  name: "gadflyHighlights",

  addCommands() {
    return {
      setGadflyAnnotations:
        (annotations) =>
        ({ tr, dispatch }) => {
          if (!dispatch) {
            return false;
          }

          dispatch(
            tr.setMeta(gadflyPluginKey, {
              annotations,
            }),
          );

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: gadflyPluginKey,
        state: {
          init: (_, state) => buildDecorationSet(state.doc, []),
          apply: (transaction, value, _, newState) => {
            const meta: unknown = transaction.getMeta(gadflyPluginKey);
            if (!isGadflyMeta(meta)) {
              return value.map(transaction.mapping, transaction.doc);
            }

            return buildDecorationSet(newState.doc, meta.annotations);
          },
        },
        props: {
          decorations: (state) => gadflyPluginKey.getState(state) ?? DecorationSet.empty,
        },
      }),
    ];
  },
});
