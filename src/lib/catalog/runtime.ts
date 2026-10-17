import { auroraConfigFromEnv } from "@/db/aurora-config";
import { getPostgresDb } from "@/db/postgres";
import { PostgresPlayerCatalog } from "@/lib/catalog/postgres-repository";
import type { PlayerCatalog } from "@/lib/catalog/repository";

export function getPlayerCatalog(): PlayerCatalog {
  if (!auroraConfigFromEnv()) {
    throw new Error("AURORA_HOST is required");
  }
  return new PostgresPlayerCatalog(getPostgresDb());
}
