import { describe, expect, it } from "vitest";
import {
  buildPlayerListFacets,
  comparePlayers,
  matchesPlayerFilters,
  normalizePlayerListQuery,
  paginateItems,
} from "@/lib/catalog/query-engine";
import { playerListQueryFromSearchParams } from "@/lib/domain/query";
import type { PlayerSummary } from "@/lib/domain/player";
import { parsePlayerId } from "@/lib/domain/player";

function summary(
  overrides: Partial<Omit<PlayerSummary, "id">> & {
    id: string;
    name: string;
    rating: number;
  },
): PlayerSummary {
  return {
    slug: overrides.slug ?? overrides.name.toLowerCase(),
    availableImageKinds: [],
    altPositions: [],
    avgStats: [],
    playStyles: [],
    fetchedAt: 100,
    parseVersion: 1,
    ...overrides,
    id: parsePlayerId(overrides.id),
  };
}

describe("normalizePlayerListQuery", () => {
  it("applies defaults", () => {
    const query = normalizePlayerListQuery({});
    expect(query.page).toBe(1);
    expect(query.pageSize).toBe(24);
    expect(query.sort).toBe("added_desc");
    expect(query.q).toBe("");
  });

  it("clamps page and pageSize", () => {
    expect(normalizePlayerListQuery({ page: 0 }).page).toBe(1);
    expect(normalizePlayerListQuery({ pageSize: 999 }).pageSize).toBe(100);
    expect(normalizePlayerListQuery({ pageSize: 0 }).pageSize).toBe(1);
  });
});

describe("matchesPlayerFilters", () => {
  const messi = summary({
    id: "1",
    name: "Messi",
    rating: 114,
    position: "ST",
    programId: "PROGRAM_TOTY26",
    nationName: "Argentina",
    clubName: "Inter Miami CF",
    leagueName: "MLS",
    auctionable: true,
  });

  it("matches name search", () => {
    const query = normalizePlayerListQuery({ q: "mess" });
    expect(matchesPlayerFilters(messi, query)).toBe(true);
    expect(
      matchesPlayerFilters(messi, normalizePlayerListQuery({ q: "mbappe" })),
    ).toBe(false);
  });

  it("matches accented names without requiring diacritics", () => {
    const mbappe = summary({
      id: "2",
      name: "Kylian Mbappé",
      slug: "mbappé",
      rating: 120,
    });
    expect(
      matchesPlayerFilters(mbappe, normalizePlayerListQuery({ q: "mbappe" })),
    ).toBe(true);
  });

  it("matches commonName on listing summaries", () => {
    const fabregas = summary({
      id: "3",
      name: "Francesc Fàbregas i Soler",
      commonName: "Cesc Fàbregas",
      lastName: "Fàbregas i Soler",
      rating: 121,
    });
    expect(
      matchesPlayerFilters(fabregas, normalizePlayerListQuery({ q: "cesc" })),
    ).toBe(true);
  });

  it("matches position and rating range", () => {
    expect(
      matchesPlayerFilters(
        messi,
        normalizePlayerListQuery({
          filters: { positions: ["ST"], ratingMin: 110, ratingMax: 120 },
        }),
      ),
    ).toBe(true);
    expect(
      matchesPlayerFilters(
        messi,
        normalizePlayerListQuery({ filters: { positions: ["GK"] } }),
      ),
    ).toBe(false);
  });

  it("matches alternate positions only when includeAltPositions is on", () => {
    const iniesta = summary({
      id: "4",
      name: "Iniesta",
      rating: 118,
      position: "CAM",
      altPositions: ["CM", "LW"],
    });
    expect(
      matchesPlayerFilters(
        iniesta,
        normalizePlayerListQuery({ filters: { positions: ["LW"] } }),
      ),
    ).toBe(false);
    expect(
      matchesPlayerFilters(
        iniesta,
        normalizePlayerListQuery({
          filters: { positions: ["LW"], includeAltPositions: true },
        }),
      ),
    ).toBe(true);
    expect(
      matchesPlayerFilters(
        iniesta,
        normalizePlayerListQuery({
          filters: { positions: ["ST"], includeAltPositions: true },
        }),
      ),
    ).toBe(false);
  });
});

describe("buildPlayerListFacets", () => {
  const messi = summary({
    id: "1",
    name: "Messi",
    rating: 114,
    position: "ST",
    programId: "NUMERO26",
    nationName: "Argentina",
    clubName: "Inter Miami CF",
    leagueName: "MLS",
  });
  const mbappe = summary({
    id: "2",
    name: "Mbappe",
    rating: 120,
    position: "LW",
    programId: "GC26",
    nationName: "France",
    clubName: "Real Madrid",
    leagueName: "LALIGA",
  });
  const haaland = summary({
    id: "3",
    name: "Haaland",
    rating: 118,
    position: "ST",
    programId: "TOTY26",
    nationName: "Norway",
    clubName: "Manchester City",
    leagueName: "EPL",
  });
  const catalog = [messi, mbappe, haaland];

  it("keeps other program options after selecting one program", () => {
    const facets = buildPlayerListFacets(
      catalog,
      normalizePlayerListQuery({ filters: { programIds: ["NUMERO26"] } }),
    );
    expect(facets.programs.map((option) => option.value)).toEqual([
      "GC26",
      "NUMERO26",
      "TOTY26",
    ]);
    expect(facets.programs.find((option) => option.value === "NUMERO26")?.count).toBe(
      1,
    );
    expect(facets.programs.find((option) => option.value === "GC26")?.count).toBe(1);
  });

  it("keeps other league, nation, and club options after selecting one", () => {
    const byLeague = buildPlayerListFacets(
      catalog,
      normalizePlayerListQuery({ filters: { leagues: ["MLS"] } }),
    );
    expect(byLeague.leagues.map((option) => option.value)).toEqual([
      "EPL",
      "LALIGA",
      "MLS",
    ]);

    const byNation = buildPlayerListFacets(
      catalog,
      normalizePlayerListQuery({ filters: { nations: ["Argentina"] } }),
    );
    expect(byNation.nations.map((option) => option.value)).toEqual([
      "Argentina",
      "France",
      "Norway",
    ]);

    const byClub = buildPlayerListFacets(
      catalog,
      normalizePlayerListQuery({ filters: { clubs: ["Inter Miami CF"] } }),
    );
    expect(byClub.clubs.map((option) => option.value)).toEqual([
      "Inter Miami CF",
      "Manchester City",
      "Real Madrid",
    ]);
  });

  it("still applies other filters when computing a facet", () => {
    const facets = buildPlayerListFacets(
      catalog,
      normalizePlayerListQuery({
        filters: { programIds: ["NUMERO26"], positions: ["ST"] },
      }),
    );
    // Programs stay catalog-complete; positions still respect other filters.
    expect(facets.programs.map((option) => option.value)).toEqual([
      "GC26",
      "NUMERO26",
      "TOTY26",
    ]);
    expect(facets.positions.map((option) => option.value)).toEqual(["ST"]);
  });

  it("keeps the full program list when position or rating filters change", () => {
    const byPosition = buildPlayerListFacets(
      catalog,
      normalizePlayerListQuery({ filters: { positions: ["ST"] } }),
    );
    expect(byPosition.programs.map((option) => option.value)).toEqual([
      "GC26",
      "NUMERO26",
      "TOTY26",
    ]);

    const byRating = buildPlayerListFacets(
      catalog,
      normalizePlayerListQuery({ filters: { ratingMin: 119, ratingMax: 120 } }),
    );
    expect(byRating.programs.map((option) => option.value)).toEqual([
      "GC26",
      "NUMERO26",
      "TOTY26",
    ]);
    expect(byRating.leagues.map((option) => option.value)).toEqual(["LALIGA"]);
  });

  it("keeps a selected program visible after other filters", () => {
    const facets = buildPlayerListFacets(
      catalog,
      normalizePlayerListQuery({
        filters: { programIds: ["NUMERO26"], leagues: ["EPL"] },
      }),
    );
    expect(facets.programs.map((option) => option.value)).toEqual([
      "GC26",
      "NUMERO26",
      "TOTY26",
    ]);
    // League facet still respects the program filter (own filter isolated only).
    expect(facets.leagues.map((option) => option.value)).toEqual([
      "MLS",
      "EPL",
    ]);
  });
});

describe("paginateItems", () => {
  it("returns empty catalog page 1", () => {
    expect(paginateItems([], 4, 24)).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 24,
    });
  });

  it("clamps page past the end", () => {
    const result = paginateItems([1, 2, 3], 9, 2);
    expect(result.page).toBe(2);
    expect(result.items).toEqual([3]);
  });
});

describe("comparePlayers", () => {
  it("sorts by rating desc then name", () => {
    const a = summary({ id: "1", name: "B", rating: 90 });
    const b = summary({ id: "2", name: "A", rating: 90 });
    const sorted = [a, b].sort((left, right) =>
      comparePlayers(left, right, "rating_desc"),
    );
    expect(sorted.map((row) => row.name)).toEqual(["A", "B"]);
  });

  it("added_desc: same UTC day, higher rating first", () => {
    const morning = Date.parse("2026-09-01T01:00:00.000Z");
    const evening = Date.parse("2026-09-01T23:00:00.000Z");
    const low = summary({
      id: "1",
      name: "Low",
      rating: 90,
      addedAt: evening,
    });
    const high = summary({
      id: "2",
      name: "High",
      rating: 110,
      addedAt: morning,
    });
    const sorted = [low, high].sort((left, right) =>
      comparePlayers(left, right, "added_desc"),
    );
    expect(sorted.map((row) => row.name)).toEqual(["High", "Low"]);
  });

  it("added_desc: same UTC day and rating, name A–Z", () => {
    const morning = Date.parse("2026-09-01T01:00:00.000Z");
    const evening = Date.parse("2026-09-01T23:00:00.000Z");
    const beta = summary({
      id: "1",
      name: "Beta",
      rating: 110,
      addedAt: evening,
    });
    const alpha = summary({
      id: "2",
      name: "Alpha",
      rating: 110,
      addedAt: morning,
    });
    const sorted = [beta, alpha].sort((left, right) =>
      comparePlayers(left, right, "added_desc"),
    );
    expect(sorted.map((row) => row.name)).toEqual(["Alpha", "Beta"]);
  });

  it("added_desc: newer UTC day first even if rating is lower", () => {
    const olderDay = Date.parse("2026-09-01T23:00:00.000Z");
    const newerDay = Date.parse("2026-09-02T00:30:00.000Z");
    const olderHigh = summary({
      id: "1",
      name: "OlderHigh",
      rating: 120,
      addedAt: olderDay,
    });
    const newerLow = summary({
      id: "2",
      name: "NewerLow",
      rating: 80,
      addedAt: newerDay,
    });
    const sorted = [olderHigh, newerLow].sort((left, right) =>
      comparePlayers(left, right, "added_desc"),
    );
    expect(sorted.map((row) => row.name)).toEqual(["NewerLow", "OlderHigh"]);
  });
});

describe("playerListQueryFromSearchParams", () => {
  it("parses URLSearchParams", () => {
    const query = playerListQueryFromSearchParams(
      new URLSearchParams("q=messi&position=ST,RW&page=2&sort=name_asc"),
    );
    expect(query.q).toBe("messi");
    expect(query.filters.positions).toEqual(["ST", "RW"]);
    expect(query.page).toBe(2);
    expect(query.sort).toBe("name_asc");
  });
});
