import { UndiscoveredPlayerError } from "@/lib/http/errors";
import type { PlayerCatalog } from "@/lib/catalog/repository";
import type { PlayerDataSource } from "@/lib/providers/types";
import type { Player } from "@/lib/domain/player";

/**
 * On-demand upstream enrichment is allowed only for IDs already in the catalog
 * (seed, prior discovery, or sitemap ingest). Unknown IDs must 404.
 */
export async function enrichDiscoveredPlayer(
  catalog: PlayerCatalog,
  source: PlayerDataSource,
  id: string,
): Promise<Player> {
  const existing = await catalog.getById(id);
  if (!existing) {
    throw new UndiscoveredPlayerError(id);
  }

  const { player, assets } = await source.getPlayer(id, existing.slug);
  await catalog.upsertPlayer(player, assets);
  return player;
}
