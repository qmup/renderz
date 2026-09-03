import Database from "better-sqlite3";
import { createCatalogDb } from "@/db/index";
import { migrateCatalog } from "@/db/migrate";
import { DrizzlePlayerCatalog } from "@/lib/catalog/drizzle-repository";

export function createTestCatalog() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = createCatalogDb(sqlite);
  migrateCatalog(db);
  return {
    sqlite,
    db,
    catalog: new DrizzlePlayerCatalog(db),
  };
}
