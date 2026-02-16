import { notFound, redirect } from "next/navigation";
import { requireSession } from "../../../../infra/auth/require-session";
import { postgresEssayRepository } from "../../../../infra/essay/postgres-essay-repository";
import { essayId, userId } from "../../../../domain/types/branded";
import { isErr } from "../../../../domain/types/result";
import { EssayEditor } from "./essay-editor";

type Params = Promise<{ id: string }>;

export default async function EditorPage({ params }: { params: Params }) {
  const { id } = await params;

  // Layout already redirects unauthenticated users. This call is for userId extraction; the guard is defense-in-depth.
  const session = await requireSession();
  if (isErr(session)) {
    redirect("/sign-in");
  }

  const eid = essayId(id);
  if (isErr(eid)) {
    notFound();
  }

  const uid = userId(session.value.userId);
  if (isErr(uid)) {
    redirect("/dashboard");
  }

  const result = await postgresEssayRepository.findById(eid.value, uid.value);
  if (isErr(result)) {
    if (result.error.kind === "NotFoundError") {
      notFound();
    }
    redirect("/dashboard");
  }

  const essay = result.value;

  return (
    <EssayEditor
      id={essay.id}
      initialTitle={essay.title}
      initialContent={essay.content}
    />
  );
}
