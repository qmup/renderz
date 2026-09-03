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
});
