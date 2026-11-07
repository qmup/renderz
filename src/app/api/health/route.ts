import { sql } from "drizzle-orm";
import { isPostgresConfigured } from "@/db/database-config";
import { getPostgresDb } from "@/db/postgres";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    if (!isPostgresConfigured()) {
      return Response.json(
        { ok: false, error: "DATABASE_URL is required" },
        { status: 500 },
      );
    }
    await getPostgresDb().execute(sql`select 1 as ok`);
    return Response.json({ ok: true, db: "postgres" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
