import { isBaseCardProgram } from "@/lib/catalog/base-cards";
import { programLogoSlug } from "@/lib/catalog/programs";
import {
  isDeclinedSyncProgram,
  SYNC_KEEP_PROGRAM_IDS,
} from "@/lib/catalog/sync-programs";

/** Promo cards newer than this are re-fetched so OVR, price, traits, and colors move. */
export const RECENT_REFRESH_MS = 14 * 24 * 60 * 60 * 1000;

/** One run refreshes the stalest slice. The next run continues through the window. */
export const RECENT_REFRESH_LIMIT = 200;

export type StoredCardSummary = {
  slug?: string;
  rating: number;
  position?: string;
};

export type UpstreamCardSummary = {
  id: string;
  slug: string;
  rating?: number;
  position?: string;
};

/**
 * Stored cards whose OVR or position no longer match RenderZ search. FC Mobile
 * re-rates base cards each season and upgrades older promos, long after the
 * recent-refresh window has passed.
 */
export function selectDriftedCards(
  stored: ReadonlyMap<string, StoredCardSummary>,
  upstream: readonly UpstreamCardSummary[],
): Array<{ id: string; slug: string }> {
  return upstream.flatMap((card) => {
    const ours = stored.get(card.id);
    if (!ours) {
      return [];
    }
    const ratingMoved = card.rating !== undefined && card.rating !== ours.rating;
    const positionMoved =
      card.position !== undefined && card.position !== ours.position;
    if (!ratingMoved && !positionMoved) {
      return [];
    }
    return [{ id: card.id, slug: ours.slug || card.slug }];
  });
}

export type SyncProgramPlayer = {
  id: string;
  slug?: string;
  addedAt?: number;
  fetchedAt: number;
  programId?: string;
};

/**
 * Brand-new events discovered from RenderZ /programs are searched first,
 * followed by any other new events already stored in Postgres (newest card
 * first), then the hardcoded keep-list. Declined seasons and base cards are
 * omitted.
 */
export function programIdsToSync(
  storedProgramIds: readonly string[],
  upstreamProgramIds: readonly string[] = [],
): string[] {
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
  for (const id of upstreamProgramIds) {
    if (!keep.has(id.trim())) {
      push(id);
    }
  }
  for (const id of storedProgramIds) {
    if (!keep.has(id.trim())) {
      push(id);
    }
  }
  for (const id of SYNC_KEEP_PROGRAM_IDS) {
    push(id);
  }
  return ids;
}

/** Map program logo slugs to signed upstream URLs returned by RenderZ /programs. */
export function programLogoUrlsBySlug(
  programs: readonly { id: string; imageUrl?: string }[],
): Map<string, string> {
  const urls = new Map<string, string>();
  for (const program of programs) {
    const imageUrl = program.imageUrl?.trim();
    if (!imageUrl) {
      continue;
    }
    const slug = programLogoSlug(program.id);
    if (!slug || urls.has(slug)) {
      continue;
    }
    urls.set(slug, imageUrl);
  }
  return urls;
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
