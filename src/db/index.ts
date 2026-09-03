import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";

export type CatalogDatabase = BetterSQLite3Database<typeof schema>;

export const CATALOG_SNAPSHOT_PATH = path.join("data", "catalog.snapshot.sqlite");

export function sqlitePathFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  if (env.SQLITE_PATH) {
    return env.SQLITE_PATH;
  }
  if (env.VERCEL) {
    const dest = "/tmp/catalog.sqlite";
    const src = path.join(process.cwd(), CATALOG_SNAPSHOT_PATH);
    if (existsSync(src) && !existsSync(dest)) {
      copyFileSync(src, dest);
    }
    return dest;
  }
  return path.join("data", "catalog.sqlite");
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
