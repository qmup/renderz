import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  createCatalogDb,
  createSqliteDatabase,
  sqlitePathFromEnv,
  type CatalogDatabase,
} from "@/db/index";

export function migrationsFolder(cwd = process.cwd()): string {
  return path.join(cwd, "drizzle");
}

export function migrateCatalog(
  db: CatalogDatabase,
  folder = migrationsFolder(),
): void {
  migrate(db, { migrationsFolder: folder });
}

export function migrateFileCatalog(filePath = sqlitePathFromEnv()): void {
  const sqlite = createSqliteDatabase(filePath);
  try {
    migrateCatalog(createCatalogDb(sqlite));
  } finally {
    sqlite.close();
  }
}
