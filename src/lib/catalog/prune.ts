import {
  isRecentCatalogPlayer,
  SKIP_REASON_TOO_OLD,
} from "@/lib/catalog/eligibility";
import type { PlayerCatalog } from "@/lib/catalog/repository";

export type PruneCatalogResult = {
  kept: number;
  pruned: number;
  remaining: number;
  invalid: number;
};

export async function pruneOldPlayers(
  catalog: PlayerCatalog,
  options: {
    now?: number;
    removeUnknownAddedAt?: boolean;
    onProgress?: (message: string) => void;
  } = {},
): Promise<PruneCatalogResult> {
  const now = options.now ?? Date.now();
  const removeUnknown = options.removeUnknownAddedAt ?? true;
  let kept = 0;
  let pruned = 0;

  for (const row of await catalog.listPlayerIndex()) {
    if (isRecentCatalogPlayer(row, now)) {
      kept += 1;
      continue;
    }
    const unknown = row.addedAt === undefined;
    if (unknown && !removeUnknown) {
      kept += 1;
      continue;
    }
    await catalog.deletePlayer(row.id);
    await catalog.recordSkipped(row.id, row.slug, SKIP_REASON_TOO_OLD, now);
    pruned += 1;
    options.onProgress?.(
      unknown ? `pruned ${row.id} (no addedAt)` : `pruned ${row.id} (older than 3 months)`,
    );
  }

  const remainingRows = await catalog.listPlayerIndex();
  const invalid = remainingRows.filter((row) => !isRecentCatalogPlayer(row, now)).length;
  return {
    kept,
    pruned,
    remaining: remainingRows.length,
    invalid,
  };
}

export function catalogIsVerifiedRecent(result: PruneCatalogResult): boolean {
  return result.invalid === 0;
}

export { isRecentCatalogPlayer };
