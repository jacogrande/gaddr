import type { Editor } from "@tiptap/core";

export type EditorCommand = {
  id: string;
  label: string;
  hotkeys: string[];
  run: (editor: Editor) => boolean;
  isActive?: (editor: Editor) => boolean;
};

export const EDITOR_MODIFIER_COMMANDS: EditorCommand[] = [
  {
    id: "bold",
    label: "Bold",
    hotkeys: ["Mod-b"],
    run: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive("bold"),
  },
  {
    id: "italic",
    label: "Italic",
    hotkeys: ["Mod-i"],
    run: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive("italic"),
  },
  {
    id: "underline",
    label: "Underline",
    hotkeys: ["Mod-u"],
    run: (editor) => editor.chain().focus().toggleUnderline().run(),
    isActive: (editor) => editor.isActive("underline"),
  },
  {
    id: "strike",
    label: "Strikethrough",
    hotkeys: ["Mod-Shift-s", "Mod-Shift-x"],
    run: (editor) => editor.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor.isActive("strike"),
  },
  {
    id: "code",
    label: "Inline Code",
    hotkeys: ["Mod-e"],
    run: (editor) => editor.chain().focus().toggleCode().run(),
    isActive: (editor) => editor.isActive("code"),
  },
  {
    id: "code-block",
    label: "Code Block",
    hotkeys: ["Mod-Alt-c"],
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    isActive: (editor) => editor.isActive("codeBlock"),
  },
  {
    id: "blockquote",
    label: "Blockquote",
    hotkeys: ["Mod-Shift-b"],
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive("blockquote"),
  },
  {
    id: "bullet-list",
    label: "Bullet List",
    hotkeys: ["Mod-Shift-8"],
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor.isActive("bulletList"),
  },
  {
    id: "ordered-list",
    label: "Numbered List",
    hotkeys: ["Mod-Shift-7"],
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor.isActive("orderedList"),
  },
  {
    id: "paragraph",
    label: "Paragraph",
    hotkeys: ["Mod-Alt-0"],
    run: (editor) => editor.chain().focus().setParagraph().run(),
    isActive: (editor) => editor.isActive("paragraph"),
  },
  {
    id: "h1",
    label: "Heading 1",
    hotkeys: ["Mod-Alt-1"],
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 1 }),
  },
  {
    id: "h2",
    label: "Heading 2",
    hotkeys: ["Mod-Alt-2"],
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
  },
  {
    id: "h3",
    label: "Heading 3",
    hotkeys: ["Mod-Alt-3"],
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
  },
];

export function createStandardHotkeyMap(editor: Editor): Record<string, () => boolean> {
  const map: Record<string, () => boolean> = {};

  for (const command of EDITOR_MODIFIER_COMMANDS) {
    for (const hotkey of command.hotkeys) {
      map[hotkey] = () => command.run(editor);
    }
  }

  map["Mod-z"] = () => editor.chain().focus().undo().run();
  map["Mod-Shift-z"] = () => editor.chain().focus().redo().run();
  map["Mod-y"] = () => editor.chain().focus().redo().run();

  return map;
}
