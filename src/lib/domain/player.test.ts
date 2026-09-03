import { describe, expect, it } from "vitest";
import { playerSchema, parsePlayerId } from "@/lib/domain/player";
import { CURRENT_PARSE_VERSION } from "@/lib/catalog/parse-version";

describe("playerSchema", () => {
  it("rejects missing id", () => {
    expect(() =>
      playerSchema.parse({
        name: "Messi",
        rating: 114,
        slug: "messi",
        altPositions: [],
        stats: [],
        traits: [],
        playStyles: [],
        skills: [],
        relatedCardIds: [],
        availableImageKinds: [],
        fetchedAt: 1,
        parseVersion: CURRENT_PARSE_VERSION,
      }),
    ).toThrow();
  });

  it("rejects missing rating", () => {
    expect(() =>
      playerSchema.parse({
        id: "24029971",
        name: "Messi",
        slug: "messi",
        altPositions: [],
        stats: [],
        traits: [],
        playStyles: [],
        skills: [],
        relatedCardIds: [],
        availableImageKinds: [],
        fetchedAt: 1,
        parseVersion: CURRENT_PARSE_VERSION,
      }),
    ).toThrow();
  });

  it("rejects non-numeric id", () => {
    expect(() => parsePlayerId("messi")).toThrow();
  });

  it("parses a sparse seed-like player", () => {
    const player = playerSchema.parse({
      id: "24029971",
      slug: "messi",
      name: "Messi",
      rating: 114,
      altPositions: [],
      stats: [{ key: "avg1", value: 136 }],
      traits: [],
      playStyles: [],
      skills: [],
      relatedCardIds: [],
      availableImageKinds: ["card"],
      fetchedAt: 1,
      parseVersion: CURRENT_PARSE_VERSION,
    });
    expect(player.id).toBe("24029971");
    expect(player.stats[0]?.key).toBe("avg1");
  });
});
