import { Extension } from "@tiptap/core";
import { createStandardHotkeyMap } from "./editor-commands";

export const StandardHotkeys = Extension.create({
  name: "standardHotkeys",

  addKeyboardShortcuts() {
    return createStandardHotkeyMap(this.editor);
  },
});
