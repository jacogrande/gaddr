import { MinimalEditor } from "./minimal-editor";

export default function EditorPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Editor</h1>
      <p className="text-sm text-gray-600">
        Minimal TipTap editor. Content is stored locally in your browser.
      </p>
      <MinimalEditor />
    </div>
  );
}
