import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * The ⌘. (Mod-.) accelerator for summoning a spark, bound through the editor's
 * own key handling so it fires only while the editor has focus — which, during a
 * sprint, it does. `Mod-.` is verified unbound today (StarterKit, GlyphInputRules,
 * StandardHotkeys, and the palette/slash key handling claim no `.` chord).
 *
 * It is bound as a ProseMirror `handleKeyDown` (NOT `addKeyboardShortcuts`)
 * precisely so it can see `event.repeat`: holding ⌘. makes the OS auto-repeat
 * the keydown ~15–30×/s, and the TipTap keyboard-shortcut API hands the callback
 * no event, so it cannot tell a genuine press from a repeat. A held ⌘. would
 * otherwise machine-gun `summon()`. A single event-aware handler drops the
 * repeats and lets the first press through — no ordering ambiguity, no double
 * fire. (This is a best-effort defense; the summon reducer already no-ops a
 * repeat above ground because the machine leaves `resting`, and the below-ground
 * log is latched client-side — but filtering at the source is cheaper still.)
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
   * Invoked on ⌘. / Ctrl-. (first press, not auto-repeat) while the editor is
   * focused. Return `true` when the summon was handled (a running sprint),
   * `false` to let the key fall through.
   */
  readonly onSummon: () => boolean;
}

const sparkHotkeyPluginKey = new PluginKey("sparkHotkey");

/**
 * Platform-exclusive Mod semantics, the way ProseMirror's keymap resolves
 * "Mod-": Meta on Mac-like platforms, Ctrl elsewhere — and ONLY that modifier.
 * A naive `(metaKey || ctrlKey)` would summon on Ctrl+. on macOS and on Win+.
 * on Windows (colliding with the OS emoji picker). Same platform regex as
 * `minimal-editor`'s shortcut-hint detection, with an SSR guard (`navigator`
 * is absent during server rendering; keydown never fires there anyway).
 */
function isMacLikePlatform(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /Mac|iP(hone|[oa]d)/.test(navigator.platform);
}

export const SparkHotkey = Extension.create<SparkHotkeyOptions>({
  name: "sparkHotkey",

  addOptions() {
    return { onSummon: () => false };
  },

  addProseMirrorPlugins() {
    const summon = (): boolean => this.options.onSummon();
    return [
      new Plugin({
        key: sparkHotkeyPluginKey,
        props: {
          handleKeyDown: (_view, event) => {
            // Exclusive Mod: Meta-only on Mac, Ctrl-only elsewhere.
            const modPressed = isMacLikePlatform()
              ? event.metaKey && !event.ctrlKey
              : event.ctrlKey && !event.metaKey;
            const isSummonChord =
              modPressed && !event.altKey && event.key === ".";
            if (!isSummonChord) {
              return false; // not our chord — let the editor handle the key
            }
            if (event.repeat) {
              return true; // swallow OS key auto-repeat: no summon, no passthrough
            }
            return summon(); // true = handled (running sprint), false = fall through
          },
        },
      }),
    ];
  },
});
