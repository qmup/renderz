import { describe, expect, it } from "vitest";
import {
  playerListQueryFromSearchParams,
  playerListQuerySchema,
  playerListQueryToSearchParams,
} from "@/lib/domain/query";

describe("player list search params", () => {
  it("round-trips a filtered query and omits defaults", () => {
    const query = playerListQuerySchema.parse({
      q: "messi",
      page: 2,
      sort: "name_asc",
      filters: {
        positions: ["ST"],
        nations: ["Argentina"],
        ratingMin: 100,
        auctionable: true,
      },
    });
    const params = playerListQueryToSearchParams(query);
    expect(params.get("q")).toBe("messi");
    expect(params.get("page")).toBe("2");
    expect(params.get("sort")).toBe("name_asc");
    expect(params.get("pageSize")).toBeNull();
    expect(playerListQueryFromSearchParams(params)).toEqual(query);
  });

  it("parses empty params as defaults", () => {
    const query = playerListQueryFromSearchParams(new URLSearchParams());
    expect(query.page).toBe(1);
    expect(query.sort).toBe("added_desc");
    expect(query.q).toBe("");
    expect(query.view).toBe("list");
    expect(playerListQueryToSearchParams(query).get("sort")).toBeNull();
  });

  it("omits default list view from the URL", () => {
    const query = playerListQueryFromSearchParams(new URLSearchParams());
    expect(playerListQueryToSearchParams(query).get("view")).toBeNull();
  });

  it("round-trips view=grid", () => {
    const query = playerListQueryFromSearchParams(new URLSearchParams("view=grid"));
    expect(query.view).toBe("grid");
    const params = playerListQueryToSearchParams(query);
    expect(params.get("view")).toBe("grid");
    expect(playerListQueryFromSearchParams(params)).toEqual(query);
  });

  it("defaults includeAltPositions to off and writes altPos=1 when on", () => {
    const empty = playerListQueryFromSearchParams(new URLSearchParams());
    expect(empty.filters.includeAltPositions).toBe(false);
    expect(playerListQueryToSearchParams(empty).get("altPos")).toBeNull();

    const on = playerListQueryFromSearchParams(
      new URLSearchParams("position=LW&altPos=1"),
    );
    expect(on.filters.includeAltPositions).toBe(true);
    expect(on.filters.positions).toEqual(["LW"]);
    expect(playerListQueryToSearchParams(on).get("altPos")).toBe("1");

    const alias = playerListQueryFromSearchParams(
      new URLSearchParams("includeAlt=1"),
    );
    expect(alias.filters.includeAltPositions).toBe(true);
  });
});
