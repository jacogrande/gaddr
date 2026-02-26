import { MinimalEditor } from "./minimal-editor";

export default function EditorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4e9d8] text-[#3b2f1f]">
      <main className="flex-1 px-6 py-8 sm:px-10">
        <div className="mx-auto h-full max-w-4xl">
          <MinimalEditor />
        </div>
      </main>
      <footer className="pb-4 text-center text-xs tracking-[0.18em] text-[#b9aa92]">
        Copyright Gaddr 2026
      </footer>
    </div>
  );
}
