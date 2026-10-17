import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type Database from "better-sqlite3";
import * as schema from "@/db/schema";

export type CatalogDatabase = BetterSQLite3Database<typeof schema>;

/** In-memory catalog used by unit tests. The running app reads Aurora. */
export function createCatalogDb(sqlite: Database.Database): CatalogDatabase {
  return drizzle(sqlite, { schema });
}
