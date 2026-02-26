import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "../../infra/auth/require-session";
import { isErr } from "../../domain/types/result";
import { SignOutButton } from "./sign-out-button";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  if (isErr(session)) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/editor" className="text-lg font-semibold text-gray-900">
            gaddr
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
