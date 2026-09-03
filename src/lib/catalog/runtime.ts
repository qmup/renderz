import { statSync } from "node:fs";
import path from "node:path";
import { getCatalogDb } from "@/db/index";
import { migrateCatalog, migrationsFolder } from "@/db/migrate";
import { DrizzlePlayerCatalog } from "@/lib/catalog/drizzle-repository";

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

export function getPlayerCatalog(): DrizzlePlayerCatalog {
  ensureCatalogMigrated();
  return new DrizzlePlayerCatalog(getCatalogDb());
}
