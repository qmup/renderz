import { z } from "zod";
import { playerSummarySchema } from "@/lib/domain/player";

export const PLAYER_LIST_DEFAULT_PAGE_SIZE = 24;
export const PLAYER_LIST_MAX_PAGE_SIZE = 100;

export const playerSortSchema = z.enum([
  "rating_desc",
  "rating_asc",
  "name_asc",
  "name_desc",
  "added_desc",
  "fetched_desc",
]);
export type PlayerSort = z.infer<typeof playerSortSchema>;

export const playerViewSchema = z.enum(["list", "grid"]);
export type PlayerView = z.infer<typeof playerViewSchema>;

export const playerListFiltersSchema = z.object({
  positions: z.array(z.string().min(1)).default([]),
  programIds: z.array(z.string().min(1)).default([]),
  nations: z.array(z.string().min(1)).default([]),
  clubs: z.array(z.string().min(1)).default([]),
  leagues: z.array(z.string().min(1)).default([]),
  ratingMin: z.number().int().optional(),
  ratingMax: z.number().int().optional(),
  auctionable: z.boolean().optional(),
});
export type PlayerListFilters = z.infer<typeof playerListFiltersSchema>;

export const playerListQuerySchema = z.object({
  q: z.string().default(""),
  page: z.number().int().min(1).default(1),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(PLAYER_LIST_MAX_PAGE_SIZE)
    .default(PLAYER_LIST_DEFAULT_PAGE_SIZE),
  sort: playerSortSchema.default("added_desc"),
  view: playerViewSchema.catch("list").default("list"),
  filters: playerListFiltersSchema.default({
    positions: [],
    programIds: [],
    nations: [],
    clubs: [],
    leagues: [],
  }),
});
export type PlayerListQuery = z.infer<typeof playerListQuerySchema>;

export const facetValueSchema = z.object({
  value: z.string(),
  count: z.number().int().nonnegative(),
});
export type FacetValue = z.infer<typeof facetValueSchema>;

export const playerListFacetsSchema = z.object({
  positions: z.array(facetValueSchema),
  programs: z.array(facetValueSchema),
  nations: z.array(facetValueSchema),
  clubs: z.array(facetValueSchema),
  leagues: z.array(facetValueSchema),
});
export type PlayerListFacets = z.infer<typeof playerListFacetsSchema>;

export const playerListResultSchema = z.object({
  items: z.array(playerSummarySchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  facets: playerListFacetsSchema,
});
export type PlayerListResult = z.infer<typeof playerListResultSchema>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function csv(value: string | string[] | undefined): string[] {
  const raw = first(value);
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function optionalInt(value: string | undefined): number | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalBool(value: string | undefined): boolean | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  if (value === "true" || value === "1") {
    return true;
  }
  if (value === "false" || value === "0") {
    return false;
  }
  return undefined;
}

export function playerListQueryToSearchParams(query: PlayerListQuery): URLSearchParams {
  const params = new URLSearchParams();
  const q = query.q.trim();
  if (q) {
    params.set("q", q);
  }
  if (query.page > 1) {
    params.set("page", String(query.page));
  }
  if (query.pageSize !== PLAYER_LIST_DEFAULT_PAGE_SIZE) {
    params.set("pageSize", String(query.pageSize));
  }
  if (query.sort !== "added_desc") {
    params.set("sort", query.sort);
  }
  if (query.view === "grid") {
    params.set("view", "grid");
  }
  if (query.filters.positions.length > 0) {
    params.set("position", query.filters.positions.join(","));
  }
  if (query.filters.programIds.length > 0) {
    params.set("program", query.filters.programIds.join(","));
  }
  if (query.filters.nations.length > 0) {
    params.set("nation", query.filters.nations.join(","));
  }
  if (query.filters.clubs.length > 0) {
    params.set("club", query.filters.clubs.join(","));
  }
  if (query.filters.leagues.length > 0) {
    params.set("league", query.filters.leagues.join(","));
  }
  if (query.filters.ratingMin !== undefined) {
    params.set("ratingMin", String(query.filters.ratingMin));
  }
  if (query.filters.ratingMax !== undefined) {
    params.set("ratingMax", String(query.filters.ratingMax));
  }
  if (query.filters.auctionable !== undefined) {
    params.set("auctionable", query.filters.auctionable ? "true" : "false");
  }
  return params;
}

export function countPlayerListFilters(query: PlayerListQuery): number {
  const filters = query.filters;
  let count = 0;
  if (filters.positions.length > 0) {
    count += 1;
  }
  if (filters.programIds.length > 0) {
    count += 1;
  }
  if (filters.nations.length > 0) {
    count += 1;
  }
  if (filters.clubs.length > 0) {
    count += 1;
  }
  if (filters.leagues.length > 0) {
    count += 1;
  }
  if (filters.ratingMin !== undefined) {
    count += 1;
  }
  if (filters.ratingMax !== undefined) {
    count += 1;
  }
  if (filters.auctionable !== undefined) {
    count += 1;
  }
  return count;
}

export function playerListQueryIsFiltered(query: PlayerListQuery): boolean {
  return query.q.trim().length > 0 || countPlayerListFilters(query) > 0;
}

export function playerListQueryFromSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): PlayerListQuery {
  const get = (key: string) => {
    if (params instanceof URLSearchParams) {
      return params.get(key) ?? undefined;
    }
    return first(params[key]);
  };

  return playerListQuerySchema.parse({
    q: get("q") ?? "",
    page: optionalInt(get("page")),
    pageSize: optionalInt(get("pageSize") ?? get("page_size")),
    sort: get("sort"),
    view: get("view"),
    filters: {
      positions: csv(get("position") ?? get("positions")),
      programIds: csv(get("program") ?? get("programId") ?? get("programIds")),
      nations: csv(get("nation") ?? get("nations")),
      clubs: csv(get("club") ?? get("clubs")),
      leagues: csv(get("league") ?? get("leagues")),
      ratingMin: optionalInt(get("ratingMin") ?? get("rating_min")),
      ratingMax: optionalInt(get("ratingMax") ?? get("rating_max")),
      auctionable: optionalBool(get("auctionable")),
    },
  });
}
