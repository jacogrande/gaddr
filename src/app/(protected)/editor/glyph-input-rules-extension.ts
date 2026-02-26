import { Extension, textInputRule, type InputRule } from "@tiptap/core";

type GlyphRule = {
  find: RegExp;
  replace: string;
};

const GLYPH_RULES: GlyphRule[] = [
  { find: /<=>$/, replace: "⇔" },
  { find: /<->$/, replace: "↔" },
  { find: /←>$/, replace: "↔" },
  { find: /=>$/, replace: "⇒" },
  { find: /->$/, replace: "→" },
  { find: /<-$/, replace: "←" },
  { find: /--$/, replace: "—" },
  { find: /\.\.\.$/, replace: "…" },
  { find: /\+\/-$/, replace: "±" },
  { find: /\(tm\)$/i, replace: "™" },
  { find: /\(c\)$/i, replace: "©" },
  { find: /\(r\)$/i, replace: "®" },
];

function createGlyphRules(): InputRule[] {
  return GLYPH_RULES.map((rule) => textInputRule(rule));
}

export const GlyphInputRules = Extension.create({
  name: "glyphInputRules",

  addInputRules() {
    return createGlyphRules();
  },
});
