import { MinimalEditor } from "./minimal-editor";

export default function EditorPage() {
  return (
    <div className="h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <MinimalEditor />
    </div>
  );
}
