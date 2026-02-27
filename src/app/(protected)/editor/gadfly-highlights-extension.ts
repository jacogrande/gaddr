import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { GadflyAnnotation } from "../../../domain/gadfly/types";

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
  const decorations = annotations.flatMap((annotation) => {
    const from = Math.max(0, Math.min(annotation.anchor.from, maxPos));
    const to = Math.max(from, Math.min(annotation.anchor.to, maxPos));

    if (to <= from) {
      return [];
    }

    const className = `gaddr-gadfly-highlight gaddr-gadfly-highlight--${annotation.severity}`;

    return [
      Decoration.inline(from, to, {
        class: className,
        "data-gadfly-id": annotation.id,
        "data-gadfly-severity": annotation.severity,
      }),
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
