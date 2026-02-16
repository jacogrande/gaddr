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

  const { name, image } = session.value;
  const initials =
    name
      .split(" ")
      .map((part) => part[0] ?? "")
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <nav className="flex items-center justify-between border-b-2 border-black bg-white px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-serif text-xl font-bold tracking-tight">
            Microblogger
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-zinc-600 hover:text-black"
          >
            Dashboard
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={name}
              className="h-8 w-8 rounded-full border-2 border-black"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-zinc-100 text-xs font-bold">
              {initials}
            </div>
          )}
          <SignOutButton />
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
