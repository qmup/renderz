import { isBaseCardProgram } from "@/lib/catalog/base-cards";

export const CATALOG_RECENT_MONTHS = 3;
export const SKIP_REASON_TOO_OLD = "added_at_older_than_3_months";

export function catalogAddedAfterCutoff(now = Date.now()): number {
  const date = new Date(now);
  date.setUTCMonth(date.getUTCMonth() - CATALOG_RECENT_MONTHS);
  return date.getTime();
}

export function isRecentCatalogPlayer(
  player: { addedAt?: number },
  now = Date.now(),
): boolean {
  return (
    player.addedAt !== undefined && player.addedAt >= catalogAddedAfterCutoff(now)
  );
}

export function isKnownOldPlayer(
  player: { addedAt?: number },
  now = Date.now(),
): boolean {
  return (
    player.addedAt !== undefined && player.addedAt < catalogAddedAfterCutoff(now)
  );
}

/** Base gold and silver stay in the catalog after the three-month cutoff. */
export function shouldSkipForAge(
  player: { addedAt?: number; programId?: string },
  now = Date.now(),
): boolean {
  if (isBaseCardProgram(player.programId)) {
    return false;
  }
  return isKnownOldPlayer(player, now);
}
