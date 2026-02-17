import { db } from "../../../infra/db/client";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    const dbMs = Date.now() - start;
    return Response.json({ status: "ok", db: { latencyMs: dbMs } });
  } catch {
    return Response.json({ status: "error", db: { latencyMs: -1 } }, { status: 503 });
  }
}
