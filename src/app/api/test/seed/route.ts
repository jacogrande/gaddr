import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../infra/auth/auth";
import { isE2ETesting } from "../../../../infra/env";

const SeedBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  name: z.string().optional(),
});

export async function POST(request: Request) {
  if (!isE2ETesting()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SeedBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { email, password, name } = parsed.data;

  try {
    await auth.api.signUpEmail({
      body: { email, password, name: name ?? "Test User" },
    });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    // User may already exist — treat as idempotent success
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (message.includes("already") || message.includes("exists") || message.includes("duplicate")) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
