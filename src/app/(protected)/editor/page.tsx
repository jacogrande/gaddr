import { MinimalEditor } from "./minimal-editor";

export default function EditorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-bg)] text-[var(--app-fg)]">
      <main className="flex-1 px-6 py-8 sm:px-10">
        <div className="mx-auto h-full max-w-4xl">
          <MinimalEditor />
        </div>
      </main>
      <footer className="pb-4 text-center text-xs tracking-[0.18em] text-[color:var(--app-muted-soft)]">
        Copyright Gaddr 2026
      </footer>
    </div>
  );
}
