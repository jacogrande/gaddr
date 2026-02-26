import { redirect } from "next/navigation";
import { requireSession } from "../../infra/auth/require-session";
import { isErr } from "../../domain/types/result";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  if (isErr(session)) {
    redirect("/sign-in");
  }

  return children;
}
