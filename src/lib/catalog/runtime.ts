import { isPostgresConfigured } from "@/db/database-config";
import { getPostgresDb } from "@/db/postgres";
import { PostgresPlayerCatalog } from "@/lib/catalog/postgres-repository";
import type { PlayerCatalog } from "@/lib/catalog/repository";

export function getPlayerCatalog(): PlayerCatalog {
  if (!isPostgresConfigured()) {
    throw new Error("DATABASE_URL is required");
  }
  return new PostgresPlayerCatalog(getPostgresDb());
}
