import { statSync } from "node:fs";
import path from "node:path";
import { auroraConfigFromEnv } from "@/db/aurora-config";
import { getCatalogDb } from "@/db/index";
import { getPostgresDb } from "@/db/postgres";
import { migrateCatalog, migrationsFolder } from "@/db/migrate";
import { DrizzlePlayerCatalog } from "@/lib/catalog/drizzle-repository";
import { PostgresPlayerCatalog } from "@/lib/catalog/postgres-repository";
import type { PlayerCatalog } from "@/lib/catalog/repository";

let appliedJournalMtimeMs = Number.NaN;

function ensureCatalogMigrated(): void {
  const journalPath = path.join(migrationsFolder(), "meta", "_journal.json");
  const mtimeMs = statSync(journalPath).mtimeMs;
  if (mtimeMs === appliedJournalMtimeMs) {
    return;
  }
  migrateCatalog(getCatalogDb());
  appliedJournalMtimeMs = mtimeMs;
}

export function getPlayerCatalog(): PlayerCatalog {
  if (auroraConfigFromEnv()) {
    return new PostgresPlayerCatalog(getPostgresDb());
  }
  ensureCatalogMigrated();
  return new DrizzlePlayerCatalog(getCatalogDb());
}
