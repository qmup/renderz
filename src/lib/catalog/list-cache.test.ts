import { describe, expect, it } from "vitest";
import {
  clearPlayerListCache,
  readFacetResult,
  readPlayerListCache,
  writeFacetResult,
  writePlayerListCache,
} from "@/lib/catalog/list-cache";
import type { PlayerListResult } from "@/lib/domain/query";

const result: PlayerListResult = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 24,
  facets: {
    programs: [],
    positions: [],
    nations: [],
    clubs: [],
    leagues: [],
  },
};

describe("player list cache", () => {
  it("serves a second read without storing a new value", () => {
    clearPlayerListCache();
    expect(readPlayerListCache("")).toBeUndefined();
    writePlayerListCache("", result, 1_000);
    expect(readPlayerListCache("", 1_000 + 44_000)).toBe(result);
    expect(readPlayerListCache("", 1_000 + 46_000)).toBeUndefined();
  });

  it("drops cached facets with the list cache", () => {
    clearPlayerListCache();
    writeFacetResult("programs", result.facets, 1_000);
    expect(readFacetResult("programs", 1_000 + 59_000)).toBe(result.facets);
    clearPlayerListCache();
    expect(readFacetResult("programs", 1_000)).toBeUndefined();
  });
});
