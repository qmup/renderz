import { describe, expect, it } from "vitest";
import {
  parseFollowedPlayerIds,
  toggleFollowedPlayerId,
} from "@/lib/followed-players";

describe("followed player ids", () => {
  it("ignores empty, broken, and non-numeric values", () => {
    expect(parseFollowedPlayerIds(null)).toEqual([]);
    expect(parseFollowedPlayerIds("not-json")).toEqual([]);
    expect(parseFollowedPlayerIds(JSON.stringify(["10", "10", "x", "11"]))).toEqual([
      "10",
      "11",
    ]);
  });

  it("toggles an id on, then off, without duplicates", () => {
    const added = toggleFollowedPlayerId([], "10");
    expect(added).toEqual(["10"]);
    expect(toggleFollowedPlayerId(added, "11")).toEqual(["11", "10"]);
    expect(toggleFollowedPlayerId(["11", "10"], "10")).toEqual(["11"]);
    expect(toggleFollowedPlayerId(["11"], "11")).toEqual([]);
  });
});
