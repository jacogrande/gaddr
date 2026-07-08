import { Extension } from "@tiptap/core";

/**
 * The ⌘. (Mod-.) accelerator for summoning a spark, bound through the editor's
 * own keyboard-shortcut mechanism (the same idiom as `standard-hotkeys-extension`)
 * so it fires only while the editor has focus — which, during a sprint, it does.
 * `Mod-.` is verified unbound today (StarterKit, GlyphInputRules, StandardHotkeys,
 * and the palette/slash key handling claim no `.` chord).
 *
 * The handler is injected as an option rather than captured statically: the
 * editor is built once, but the summon closure and the running-sprint gate change
 * over the session. `minimal-editor` configures this with a stable closure that
 * reads the latest handler from a ref, so the accelerator always calls the
 * current summon and returns `false` (letting the key pass through) whenever a
 * sprint is not running — "must not fire outside a running sprint" (plan §5.2).
 */
export interface SparkHotkeyOptions {
  /**
   * Invoked on ⌘. / Ctrl-. while the editor is focused. Return `true` when the
   * summon was handled (a running sprint), `false` to let the key fall through.
   */
  readonly onSummon: () => boolean;
}

export const SparkHotkey = Extension.create<SparkHotkeyOptions>({
  name: "sparkHotkey",

  addOptions() {
    return { onSummon: () => false };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-.": () => this.options.onSummon(),
    };
  },
});
