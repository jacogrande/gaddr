import { redirect } from "next/navigation";
import { isErr } from "../domain/types/result";
import { requireSession } from "../infra/auth/require-session";

export default async function Home() {
  const session = await requireSession();

  if (isErr(session)) {
    redirect("/sign-in");
  }

  redirect("/editor");
}
