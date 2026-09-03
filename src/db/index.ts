import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";

export type CatalogDatabase = BetterSQLite3Database<typeof schema>;

export function sqlitePathFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  return env.SQLITE_PATH ?? path.join("data", "catalog.sqlite");
}

export function createSqliteDatabase(filePath: string): Database.Database {
  if (filePath !== ":memory:") {
    const dir = path.dirname(filePath);
    if (dir && dir !== ".") {
      mkdirSync(dir, { recursive: true });
    }
  }
  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

export function createCatalogDb(sqlite: Database.Database): CatalogDatabase {
  return drizzle(sqlite, { schema });
}

let singleton: { sqlite: Database.Database; db: CatalogDatabase } | undefined;

export function getCatalogDb(): CatalogDatabase {
  if (!singleton) {
    const sqlite = createSqliteDatabase(sqlitePathFromEnv());
    singleton = { sqlite, db: createCatalogDb(sqlite) };
  }
  return singleton.db;
}

export function closeCatalogDb(): void {
  singleton?.sqlite.close();
  singleton = undefined;
}
