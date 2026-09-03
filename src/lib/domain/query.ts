import { z } from "zod";
import { playerIdSchema } from "@/lib/domain/player";

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
  sort: playerSortSchema.default("rating_desc"),
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
  items: z.array(
    z.object({
      id: playerIdSchema,
      slug: z.string(),
      name: z.string(),
      rating: z.number().int(),
      position: z.string().optional(),
      programId: z.string().optional(),
      clubName: z.string().optional(),
      nationName: z.string().optional(),
      leagueName: z.string().optional(),
      auctionable: z.boolean().optional(),
      availableImageKinds: z.array(z.string()),
      addedAt: z.number().int().optional(),
      fetchedAt: z.number().int(),
      parseVersion: z.number().int(),
    }),
  ),
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
