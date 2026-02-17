import { Mark, mergeAttributes } from "@tiptap/react";

export const EvidenceMark = Mark.create({
  name: "evidenceAttachment",

  inclusive: false,

  addAttributes() {
    return {
      linkId: { default: null },
      evidenceCardId: { default: null },
      stance: { default: "supports" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-evidence-link]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = HTMLAttributes as Record<string, string>;
    const stance = attrs.stance ?? "supports";
    return [
      "span",
      mergeAttributes({
        "data-evidence-link": attrs.linkId,
        class: `evidence-mark evidence-mark--${stance}`,
      }),
      0,
    ];
  },
});
