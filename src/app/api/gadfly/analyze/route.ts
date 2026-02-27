import { parseGadflyAnalyzeRequest } from "../../../../domain/gadfly/guards";
import { analyzeWithGadfly } from "../../../../infra/llm/gadfly-adapter";
import { requireSession } from "../../../../infra/auth/require-session";

export async function POST(request: Request): Promise<Response> {
  const session = await requireSession();
  if (!session.ok) {
    return Response.json(
      {
        error: {
          code: "unauthorized",
          message: session.error.message,
        },
      },
      { status: 401 },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      {
        error: {
          code: "invalid_input",
          message: "Request body must be valid JSON",
        },
      },
      { status: 400 },
    );
  }

  const parsedRequest = parseGadflyAnalyzeRequest(payload);
  if (!parsedRequest.ok) {
    return Response.json(
      {
        error: {
          code: "invalid_input",
          message: parsedRequest.error.message,
          details: {
            field: parsedRequest.error.field,
          },
        },
      },
      { status: 400 },
    );
  }

  const result = await analyzeWithGadfly(parsedRequest.value);

  if (!result.ok) {
    const status = result.error.code === "llm_timeout" ? 504 : 502;
    return Response.json(
      {
        error: {
          code: result.error.code,
          message: result.error.message,
        },
      },
      { status },
    );
  }

  return Response.json(result.value);
}
