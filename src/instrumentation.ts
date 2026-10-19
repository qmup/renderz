export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }
  const { auroraConfigFromEnv } = await import("@/db/aurora-config");
  if (!auroraConfigFromEnv()) {
    return;
  }
  const { getPostgresDb } = await import("@/db/postgres");
  const { ensurePlayerSearchIndex } = await import("@/db/player-search");
  const { ensurePlayerListIndexes } = await import("@/db/player-list-indexes");
  const db = getPostgresDb();
  await ensurePlayerSearchIndex(db);
  await ensurePlayerListIndexes(db);
}
