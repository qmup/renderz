import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { type CatalogDatabase } from "@/db/index";

export function migrationsFolder(cwd = process.cwd()): string {
  return path.join(cwd, "drizzle");
}

export function migrateCatalog(
  db: CatalogDatabase,
  folder = migrationsFolder(),
): void {
  migrate(db, { migrationsFolder: folder });
}
