import { unstable_cache } from "next/cache";
import { getPlayerCatalog } from "@/lib/catalog/runtime";
import { playerListQueryFromSearchParams } from "@/lib/domain/query";

/** Cross-request cache for the player listing. The catalog also keeps a short memory cache. */
export const getCachedPlayerList = unstable_cache(
  async (search: string) => {
    const query = playerListQueryFromSearchParams(new URLSearchParams(search));
    return getPlayerCatalog().list(query);
  },
  ["player-list"],
  { revalidate: 45, tags: ["player-list"] },
);
