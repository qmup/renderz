import { isBaseCardProgram } from "@/lib/catalog/base-cards";
import {
  isDeclinedSyncProgram,
  SYNC_KEEP_PROGRAM_IDS,
} from "@/lib/catalog/sync-programs";

/** Promo cards newer than this are re-fetched so OVR, price, traits, and colors move. */
export const RECENT_REFRESH_MS = 14 * 24 * 60 * 60 * 1000;

/** One run refreshes the stalest slice. The next run continues through the window. */
export const RECENT_REFRESH_LIMIT = 200;

export type SyncProgramPlayer = {
  id: string;
  slug?: string;
  addedAt?: number;
  fetchedAt: number;
  programId?: string;
};

/**
 * New events already stored are searched first (caller passes them newest
 * card first). The hardcoded keep-list follows, so a brand-new program is
 * not stuck behind TOTW…Heroes. Declined seasons and base cards are omitted.
 */
export function programIdsToSync(storedProgramIds: readonly string[]): string[] {
  const keep = new Set<string>(SYNC_KEEP_PROGRAM_IDS);
  const seen = new Set<string>();
  const ids: string[] = [];
  const push = (id: string) => {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }
    if (isDeclinedSyncProgram(trimmed) || isBaseCardProgram(trimmed)) {
      return;
    }
    seen.add(trimmed);
    ids.push(trimmed);
  };
  for (const id of storedProgramIds) {
    if (!keep.has(id)) {
      push(id);
    }
  }
  for (const id of SYNC_KEEP_PROGRAM_IDS) {
    push(id);
  }
  return ids;
}

/**
 * Stalest promo cards in the recent window, excluding cards fetched in this
 * run and base gold/silver. Caller passes `now` as the run start.
 */
export function selectRecentRefreshIds(
  players: readonly SyncProgramPlayer[],
  now: number,
  limit = RECENT_REFRESH_LIMIT,
): Array<{ id: string; slug?: string }> {
  const cutoff = now - RECENT_REFRESH_MS;
  return players
    .filter((player) => {
      if (player.addedAt === undefined || player.addedAt < cutoff) {
        return false;
      }
      if (player.fetchedAt >= now) {
        return false;
      }
      if (isBaseCardProgram(player.programId)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.fetchedAt - b.fetchedAt || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((player) => ({ id: player.id, slug: player.slug }));
}
