import { CURRENT_PARSE_VERSION } from "@/lib/catalog/parse-version";
import { pruneOldPlayers } from "@/lib/catalog/prune";
import { enrichDiscoveredPlayer } from "@/lib/catalog/enrichment";
import type { PlayerCatalog } from "@/lib/catalog/repository";
import type { PlayerDataSource } from "@/lib/providers/types";

export const LISTING_SEED_LIMIT = 50;

export type SeedListingOptions = {
  enrich?: boolean;
  limit?: number;
  now?: number;
  onProgress?: (message: string) => void;
};

export type SeedListingResult = {
  discovered: number;
  enriched: number;
  skipped: number;
  failed: number;
};

export async function seedListingCatalog(
  catalog: PlayerCatalog,
  source: PlayerDataSource,
  options: SeedListingOptions = {},
): Promise<SeedListingResult> {
  const limit = options.limit ?? LISTING_SEED_LIMIT;
  const enrich = options.enrich ?? true;
  const seeds = (await source.getListingSeed()).slice(0, limit);

  for (const seed of seeds) {
    await catalog.upsertDiscovered({
      ...seed,
      discoveredAt: seed.discoveredAt ?? Date.now(),
    });
    options.onProgress?.(`discovered ${seed.name} (${seed.id})`);
  }

  let enriched = 0;
  let skipped = 0;
  let failed = 0;
  if (enrich) {
    for (const seed of seeds) {
      const existing = await catalog.getById(seed.id);
      if (existing && existing.parseVersion >= CURRENT_PARSE_VERSION) {
        skipped += 1;
        continue;
      }
      try {
        await enrichDiscoveredPlayer(catalog, source, seed.id);
        enriched += 1;
        options.onProgress?.(`enriched ${seed.name} (${seed.id})`);
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        options.onProgress?.(`failed ${seed.name} (${seed.id}): ${message}`);
      }
    }
  }

  if (enrich) {
    const prune = await pruneOldPlayers(catalog, {
      now: options.now,
      removeUnknownAddedAt: false,
      onProgress: options.onProgress,
    });
    options.onProgress?.(
      `pruned older than 3 months: ${prune.pruned} (kept ${prune.kept})`,
    );
  }

  return { discovered: seeds.length, enriched, skipped, failed };
}
