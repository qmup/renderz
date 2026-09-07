import {
  PLAYER_LIST_DEFAULT_PAGE_SIZE,
  PLAYER_LIST_MAX_PAGE_SIZE,
  playerListQuerySchema,
  type FacetValue,
  type PlayerListFacets,
  type PlayerListQuery,
} from "@/lib/domain/query";
import type { PlayerSummary } from "@/lib/domain/player";

export const PLAYER_LIST_FACET_FILTER_KEYS = [
  "positions",
  "programIds",
  "nations",
  "clubs",
  "leagues",
] as const;
export type PlayerListFacetFilterKey =
  (typeof PLAYER_LIST_FACET_FILTER_KEYS)[number];

type QueryInput = {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: PlayerListQuery["sort"];
  filters?: {
    positions?: string[];
    programIds?: string[];
    nations?: string[];
    clubs?: string[];
    leagues?: string[];
    ratingMin?: number;
    ratingMax?: number;
    auctionable?: boolean;
    includeAltPositions?: boolean;
  };
};

export function normalizePlayerListQuery(input: QueryInput): PlayerListQuery {
  const page = Number.isFinite(input.page) ? Math.max(1, Math.trunc(input.page ?? 1)) : 1;
  const rawSize = Number.isFinite(input.pageSize)
    ? Math.trunc(input.pageSize ?? PLAYER_LIST_DEFAULT_PAGE_SIZE)
    : PLAYER_LIST_DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(
    PLAYER_LIST_MAX_PAGE_SIZE,
    Math.max(1, rawSize),
  );

  return playerListQuerySchema.parse({
    q: input.q ?? "",
    page,
    pageSize,
    sort: input.sort,
    filters: input.filters,
  });
}

export function escapeLike(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

export function foldSearchText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function matchesPlayerFilters(
  player: PlayerSummary,
  query: PlayerListQuery,
): boolean {
  const q = foldSearchText(query.q.trim());
  if (q) {
    const haystack = foldSearchText(
      [
        player.name,
        player.slug,
        player.cardName,
        player.commonName,
        player.lastName,
        player.clubName,
        player.nationName,
      ]
        .filter(Boolean)
        .join(" "),
    );
    if (!haystack.includes(q)) {
      return false;
    }
  }

  const { filters } = query;
  if (filters.positions.length > 0 && !playerMatchesSelectedPositions(player, filters)) {
    return false;
  }
  if (
    filters.programIds.length > 0 &&
    (!player.programId || !filters.programIds.includes(player.programId))
  ) {
    return false;
  }
  if (
    filters.nations.length > 0 &&
    (!player.nationName || !filters.nations.includes(player.nationName))
  ) {
    return false;
  }
  if (
    filters.clubs.length > 0 &&
    (!player.clubName || !filters.clubs.includes(player.clubName))
  ) {
    return false;
  }
  if (
    filters.leagues.length > 0 &&
    (!player.leagueName || !filters.leagues.includes(player.leagueName))
  ) {
    return false;
  }
  if (filters.ratingMin !== undefined && player.rating < filters.ratingMin) {
    return false;
  }
  if (filters.ratingMax !== undefined && player.rating > filters.ratingMax) {
    return false;
  }
  if (
    filters.auctionable !== undefined &&
    player.auctionable !== filters.auctionable
  ) {
    return false;
  }
  return true;
}

export function playerMatchesSelectedPositions(
  player: Pick<PlayerSummary, "position" | "altPositions">,
  filters: Pick<PlayerListQuery["filters"], "positions" | "includeAltPositions">,
): boolean {
  const { positions, includeAltPositions } = filters;
  if (positions.length === 0) {
    return true;
  }
  if (player.position && positions.includes(player.position)) {
    return true;
  }
  if (includeAltPositions) {
    return player.altPositions.some((position) => positions.includes(position));
  }
  return false;
}

export function omitFacetFilter(
  query: PlayerListQuery,
  facet: PlayerListFacetFilterKey,
): PlayerListQuery {
  return {
    ...query,
    filters: {
      ...query.filters,
      [facet]: [],
    },
  };
}

function countFacetValues(
  rows: PlayerSummary[],
  pick: (row: PlayerSummary) => string | undefined,
  selected: string[] = [],
): FacetValue[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const value = pick(row);
    if (!value) {
      continue;
    }
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  for (const value of selected) {
    if (value && !map.has(value)) {
      map.set(value, 0);
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, count }));
}

/**
 * Most facets ignore their own filter so the list does not collapse to the
 * selected value (CLS); other filters still apply. Program / Event is the
 * exception: it always lists every program in the catalog so Position, OVR,
 * search, etc. never shrink or reorder that accordion.
 */
export function buildPlayerListFacets(
  players: PlayerSummary[],
  query: PlayerListQuery,
): PlayerListFacets {
  const matching = (omit: PlayerListFacetFilterKey) =>
    players.filter((player) =>
      matchesPlayerFilters(player, omitFacetFilter(query, omit)),
    );

  return {
    positions: countFacetValues(
      matching("positions"),
      (row) => row.position,
      query.filters.positions,
    ),
    programs: countFacetValues(
      players,
      (row) => row.programId,
      query.filters.programIds,
    ),
    nations: countFacetValues(
      matching("nations"),
      (row) => row.nationName,
      query.filters.nations,
    ),
    clubs: countFacetValues(
      matching("clubs"),
      (row) => row.clubName,
      query.filters.clubs,
    ),
    leagues: countFacetValues(
      matching("leagues"),
      (row) => row.leagueName,
      query.filters.leagues,
    ),
  };
}

const MS_PER_UTC_DAY = 86_400_000;

/** UTC calendar day of epoch-ms `addedAt` (not millisecond equality). Missing → 0. */
function utcAddedDay(ms: number | undefined): number {
  return Math.floor((ms ?? 0) / MS_PER_UTC_DAY);
}

export function comparePlayers(
  a: PlayerSummary,
  b: PlayerSummary,
  sort: PlayerListQuery["sort"],
): number {
  switch (sort) {
    case "rating_asc":
      return a.rating - b.rating || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    case "name_asc":
      return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    case "name_desc":
      return b.name.localeCompare(a.name) || a.id.localeCompare(b.id);
    case "fetched_desc":
      return b.fetchedAt - a.fetchedAt || b.rating - a.rating || a.id.localeCompare(b.id);
    case "rating_desc":
      return b.rating - a.rating || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    case "added_desc":
    default:
      return (
        utcAddedDay(b.addedAt) - utcAddedDay(a.addedAt) ||
        b.rating - a.rating ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id)
      );
  }
}

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number,
): { items: T[]; total: number; page: number; pageSize: number } {
  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(page, lastPage);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page: total === 0 ? 1 : safePage,
    pageSize,
  };
}
