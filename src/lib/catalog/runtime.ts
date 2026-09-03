import { getCatalogDb } from "@/db/index";
import { migrateCatalog } from "@/db/migrate";
import { DrizzlePlayerCatalog } from "@/lib/catalog/drizzle-repository";

let migrated = false;

export function getPlayerCatalog(): DrizzlePlayerCatalog {
  if (!migrated) {
    migrateCatalog(getCatalogDb());
    migrated = true;
  }
  return new DrizzlePlayerCatalog(getCatalogDb());
}
