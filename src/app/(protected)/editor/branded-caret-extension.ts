import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

function createDecorations(doc: Parameters<typeof DecorationSet.create>[0], from: number, to: number) {
  if (from !== to) {
    return DecorationSet.empty;
  }

  const caret = Decoration.widget(
    from,
    () => {
      const caretNode = document.createElement("span");
      caretNode.className = "gaddr-caret";
      caretNode.setAttribute("aria-hidden", "true");
      return caretNode;
    },
    {
      key: `gaddr-caret-${String(from)}`,
      side: 1,
      ignoreSelection: true,
    },
  );

  return DecorationSet.create(doc, [caret]);
}

export const BrandedCaret = Extension.create({
  name: "brandedCaret",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        state: {
          init: (_, state) => createDecorations(state.doc, state.selection.from, state.selection.to),
          apply: (transaction, oldDecorationSet, _oldState, newState) => {
            if (transaction.docChanged || transaction.selectionSet) {
              return createDecorations(newState.doc, newState.selection.from, newState.selection.to);
            }

            return oldDecorationSet.map(transaction.mapping, transaction.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
