import { NextResponse } from "next/server";
import { requireSession } from "../../../infra/auth/require-session";
import { postgresEssayRepository } from "../../../infra/essay/postgres-essay-repository";
import { assistantAdapter } from "../../../infra/llm/assistant-adapter";
import { fixtureAssistantAdapter } from "../../../infra/llm/fixture-assistant-adapter";
import { ChatRequestSchema } from "../../../domain/assistant/schemas";
import {
  prepareAssistantRequest,
  validateAssistantStream,
} from "../../../domain/assistant/pipeline";
import { essayId, userId } from "../../../domain/types/branded";
import { isErr } from "../../../domain/types/result";
import * as Sentry from "@sentry/nextjs";
import { reportError } from "../../../infra/observability/report-error";
import { isE2ETesting } from "../../../infra/env";

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

  const parsed = ChatRequestSchema.safeParse(body);
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

  const result = await postgresEssayRepository.findById(eid.value, uid.value);
  if (isErr(result)) {
    if (result.error.kind === "NotFoundError") {
      return NextResponse.json({ error: "Essay not found" }, { status: 404 });
    }
    reportError(result.error, {
      action: "assistant",
      userId: uid.value,
      essayId: eid.value,
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const assistantRequest = prepareAssistantRequest(
    result.value,
    parsed.data.message,
    parsed.data.history,
    parsed.data.mode,
  );
  if (isErr(assistantRequest)) {
    return NextResponse.json(
      { error: assistantRequest.error.message },
      { status: 422 },
    );
  }

  const adapter = isE2ETesting()
    ? fixtureAssistantAdapter
    : assistantAdapter;
  const rawEvents = adapter.chat(assistantRequest.value);
  const events = validateAssistantStream(rawEvents, parsed.data.mode);

  const STREAM_TIMEOUT_MS = 120_000;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        await Sentry.startSpan(
          { name: "assistant.stream", op: "llm.stream" },
          async () => {
            try {
              const deadline = Date.now() + STREAM_TIMEOUT_MS;
              for await (const event of events) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
                );
                if (Date.now() > deadline) {
                  reportError(new Error("Assistant stream timed out"), {
                    action: "assistant.timeout",
                    userId: uid.value,
                    essayId: eid.value,
                  });
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "error", message: "Assistant timed out. Please try again." })}\n\n`,
                    ),
                  );
                  break;
                }
              }
            } catch (streamError: unknown) {
              reportError(streamError, {
                action: "assistant.stream",
                userId: uid.value,
                essayId: eid.value,
              });
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "error", message: "Stream failed" })}\n\n`,
                ),
              );
            }
          },
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
