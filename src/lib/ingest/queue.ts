import { CURRENT_PARSE_VERSION } from "@/lib/catalog/parse-version";
import type { PlayerCatalog } from "@/lib/catalog/repository";

export const INGEST_LEASE_MS = 5 * 60 * 1000;

export async function enqueueSitemapDiscoveries(
  catalog: PlayerCatalog,
  entries: Array<{ id: string; slug: string }>,
  now?: number,
): Promise<number> {
  let created = 0;
  for (const entry of entries) {
    const exists = await catalog.exists(entry.id);
    if (exists) {
      continue;
    }
    if (await catalog.isSkipped(entry.id)) {
      continue;
    }
    await catalog.enqueueDiscovery(entry.id, entry.slug, now);
    created += 1;
  }
  return created;
}

export async function enqueueStaleRefreshes(
  catalog: PlayerCatalog,
  now = Date.now(),
  ttlMs = 24 * 60 * 60 * 1000,
): Promise<number> {
  const staleIds = await catalog.listStalePlayerIds({
    olderThanFetchedAt: now - ttlMs,
    parseVersionBelow: CURRENT_PARSE_VERSION,
  });
  for (const id of staleIds) {
    const player = await catalog.getById(id);
    await catalog.enqueueRefresh(id, player?.slug, now);
  }
  return staleIds.length;
}
