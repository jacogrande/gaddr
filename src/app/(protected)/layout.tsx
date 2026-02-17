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
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-stone-200 bg-white/80 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-serif text-xl font-semibold tracking-tight text-stone-900">
            Microblogger
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-stone-500 transition-colors duration-200 hover:text-stone-900"
          >
            Dashboard
          </Link>
          <Link
            href="/library"
            className="text-sm font-medium text-stone-500 transition-colors duration-200 hover:text-stone-900"
          >
            Library
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={name}
              className="h-8 w-8 rounded-full ring-2 ring-stone-200"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-600 ring-2 ring-stone-200">
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
