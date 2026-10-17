import { sql } from "drizzle-orm";
import { auroraConfigFromEnv } from "@/db/aurora-config";
import { getPostgresDb } from "@/db/postgres";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    if (!auroraConfigFromEnv()) {
      return Response.json(
        { ok: false, error: "AURORA_HOST is required" },
        { status: 500 },
      );
    }
    await getPostgresDb().execute(sql`select 1 as ok`);
    return Response.json({ ok: true, db: "aurora" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
