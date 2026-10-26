import { unstable_cache } from "next/cache";
import { getPlayerCatalog } from "@/lib/catalog/runtime";
import { playerListQueryFromSearchParams } from "@/lib/domain/query";

/**
 * Cross-request cache for the player listing. The catalog also keeps a short memory cache.
 * The catalog changes only when the scheduled sync runs, and stale entries are served while
 * they refresh, so a long window keeps visitors from waiting on a paused Aurora.
 */
export const getCachedPlayerList = unstable_cache(
  async (search: string) => {
    const query = playerListQueryFromSearchParams(new URLSearchParams(search));
    return getPlayerCatalog().list(query);
  },
  ["player-list"],
  { revalidate: 30 * 60, tags: ["player-list"] },
);
