import { sql } from "drizzle-orm";
import { getCatalogDb } from "@/db/index";
import { migrateCatalog } from "@/db/migrate";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getCatalogDb();
    migrateCatalog(db);
    db.all(sql`select 1 as ok`);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
