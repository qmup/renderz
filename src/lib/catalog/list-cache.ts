import type { PlayerListFacets, PlayerListResult } from "@/lib/domain/query";

const LIST_TTL_MS = 45_000;
const FACET_TTL_MS = 60_000;
const LIST_CACHE_MAX = 32;

type ListEntry = { at: number; value: PlayerListResult };

const lists = new Map<string, ListEntry>();
const facetResults = new Map<string, { at: number; value: PlayerListFacets }>();

export function readPlayerListCache(
  key: string,
  now = Date.now(),
): PlayerListResult | undefined {
  const hit = lists.get(key);
  if (!hit) {
    return undefined;
  }
  if (now - hit.at > LIST_TTL_MS) {
    lists.delete(key);
    return undefined;
  }
  lists.delete(key);
  lists.set(key, hit);
  return hit.value;
}

export function writePlayerListCache(
  key: string,
  value: PlayerListResult,
  now = Date.now(),
): void {
  lists.set(key, { at: now, value });
  while (lists.size > LIST_CACHE_MAX) {
    const oldest = lists.keys().next().value;
    if (oldest === undefined) {
      break;
    }
    lists.delete(oldest);
  }
}

export function readFacetResult(
  key: string,
  now = Date.now(),
): PlayerListFacets | undefined {
  const hit = facetResults.get(key);
  if (!hit || now - hit.at > FACET_TTL_MS) {
    if (hit) {
      facetResults.delete(key);
    }
    return undefined;
  }
  return hit.value;
}

export function writeFacetResult(
  key: string,
  value: PlayerListFacets,
  now = Date.now(),
): void {
  facetResults.set(key, { at: now, value });
}

export function clearPlayerListCache(): void {
  lists.clear();
  facetResults.clear();
}
