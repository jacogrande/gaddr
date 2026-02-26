import { Extension, InputRule, textInputRule, type InputRule as InputRuleType } from "@tiptap/core";

type GlyphRule = {
  find: RegExp;
  replace: string;
};

const SUPERSCRIPT_GLYPHS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  a: "ᵃ",
  b: "ᵇ",
  c: "ᶜ",
  d: "ᵈ",
  e: "ᵉ",
  f: "ᶠ",
  g: "ᵍ",
  h: "ʰ",
  i: "ⁱ",
  j: "ʲ",
  k: "ᵏ",
  l: "ˡ",
  m: "ᵐ",
  n: "ⁿ",
  o: "ᵒ",
  p: "ᵖ",
  r: "ʳ",
  s: "ˢ",
  t: "ᵗ",
  u: "ᵘ",
  v: "ᵛ",
  w: "ʷ",
  x: "ˣ",
  y: "ʸ",
  z: "ᶻ",
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

function toSuperscriptText(value: string): string | null {
  let result = "";

  for (const char of value) {
    const mapped = SUPERSCRIPT_GLYPHS[char] ?? SUPERSCRIPT_GLYPHS[char.toLowerCase()];

    if (!mapped) {
      return null;
    }

    result += mapped;
  }

  return result;
}

function createSuperscriptRules(): InputRuleType[] {
  const wrappedSuperscriptRule = new InputRule({
    find: /\^([0-9A-Za-z+\-=()]+)\^$/,
    handler: ({ state, range, match }) => {
      const content = match[1];
      if (!content) {
        return;
      }

      const superscript = toSuperscriptText(content);
      if (!superscript) {
        return;
      }

      state.tr.insertText(superscript, range.from, range.to);
    },
  });

  const singleCharSuperscriptRule = new InputRule({
    find: /\^([0-9A-Za-z+\-=()])$/,
    handler: ({ state, range, match }) => {
      const char = match[1];
      if (!char) {
        return;
      }

      const superscript = toSuperscriptText(char);
      if (!superscript) {
        return;
      }

      state.tr.insertText(superscript, range.from, range.to);
    },
  });

  return [wrappedSuperscriptRule, singleCharSuperscriptRule];
}

function createGlyphRules(): InputRuleType[] {
  return GLYPH_RULES.map((rule) => textInputRule(rule));
}

export const GlyphInputRules = Extension.create({
  name: "glyphInputRules",

  addInputRules() {
    return [...createGlyphRules(), ...createSuperscriptRules()];
  },
});
