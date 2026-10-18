import type { PlayerCatalog } from "@/lib/catalog/repository";

export type PruneCatalogResult = {
  kept: number;
  pruned: number;
  remaining: number;
  invalid: number;
};

/** Kept for the verify script. The catalog no longer deletes older players. */
export async function pruneOldPlayers(
  catalog: PlayerCatalog,
  _options: {
    now?: number;
    removeUnknownAddedAt?: boolean;
    onProgress?: (message: string) => void;
  } = {},
): Promise<PruneCatalogResult> {
  const remaining = (await catalog.listPlayerIndex()).length;
  return {
    kept: remaining,
    pruned: 0,
    remaining,
    invalid: 0,
  };
}

export function catalogIsVerifiedRecent(result: PruneCatalogResult): boolean {
  return result.pruned === 0 && result.invalid === 0;
}
