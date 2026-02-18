// Shared SSE streaming helper — used by review and assistant API routes

import * as Sentry from "@sentry/nextjs";
import { reportError } from "../observability/report-error";

type StreamSSEOptions = {
  readonly spanName: string;
  readonly timeoutMs: number;
  readonly timeoutMessage: string;
  readonly errorContext: Record<string, string>;
};

export function streamSSE(
  events: AsyncIterable<unknown>,
  options: StreamSSEOptions,
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        await Sentry.startSpan(
          { name: options.spanName, op: "llm.stream" },
          async () => {
            try {
              const deadline = Date.now() + options.timeoutMs;
              for await (const event of events) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
                );
                if (Date.now() > deadline) {
                  reportError(new Error(`${options.spanName} timed out`), {
                    action: `${options.spanName}.timeout`,
                    ...options.errorContext,
                  });
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "error", message: options.timeoutMessage })}\n\n`,
                    ),
                  );
                  break;
                }
              }
            } catch (streamError: unknown) {
              reportError(streamError, {
                action: options.spanName,
                ...options.errorContext,
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
