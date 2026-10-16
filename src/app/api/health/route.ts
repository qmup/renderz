import { sql } from "drizzle-orm";
import { auroraConfigFromEnv } from "@/db/aurora-config";
import { getCatalogDb } from "@/db/index";
import { getPostgresDb } from "@/db/postgres";
import { migrateCatalog } from "@/db/migrate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    if (auroraConfigFromEnv()) {
      await getPostgresDb().execute(sql`select 1 as ok`);
      return Response.json({ ok: true, db: "aurora" });
    }
    const db = getCatalogDb();
    migrateCatalog(db);
    db.all(sql`select 1 as ok`);
    return Response.json({ ok: true, db: "sqlite" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
