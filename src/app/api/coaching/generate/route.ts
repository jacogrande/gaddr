import { NextResponse } from "next/server";
import { requireSession } from "../../../../infra/auth/require-session";
import { postgresEssayRepository } from "../../../../infra/essay/postgres-essay-repository";
import { coachingAdapter } from "../../../../infra/llm/coaching-adapter";
import { fixtureCoachingAdapter } from "../../../../infra/llm/fixture-coaching-adapter";
import { CoachingRequestApiSchema } from "../../../../domain/coaching/schemas";
import { prepareCoachingRequest } from "../../../../domain/coaching/pipeline";
import { essayId, userId } from "../../../../domain/types/branded";
import { isErr } from "../../../../domain/types/result";
import { reportError } from "../../../../infra/observability/report-error";
import { isE2ETesting } from "../../../../infra/env";

export async function POST(request: Request) {
  const session = await requireSession();
  if (isErr(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CoachingRequestApiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const eid = essayId(parsed.data.essayId);
  if (isErr(eid)) {
    return NextResponse.json({ error: "Invalid essay ID" }, { status: 400 });
  }

  const uid = userId(session.value.userId);
  if (isErr(uid)) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  // Verify the user owns this essay before spending LLM tokens
  const essayResult = await postgresEssayRepository.findById(eid.value, uid.value);
  if (isErr(essayResult)) {
    if (essayResult.error.kind === "NotFoundError") {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 });
    }
    reportError(essayResult.error, { action: "coaching.generate", userId: uid.value, essayId: eid.value });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const prepared = prepareCoachingRequest(parsed.data.essayText, parsed.data.claims);
  if (isErr(prepared)) {
    return NextResponse.json({ error: prepared.error.message }, { status: 422 });
  }

  const adapter = isE2ETesting() ? fixtureCoachingAdapter : coachingAdapter;
  const result = await adapter.generateCoaching(prepared.value);

  if (isErr(result)) {
    reportError(result.error, { action: "coaching.generate", userId: uid.value, essayId: eid.value });
    return NextResponse.json({ error: "Coaching generation failed" }, { status: 500 });
  }

  return NextResponse.json(result.value);
}
