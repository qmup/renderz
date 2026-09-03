import { describe, expect, it } from "vitest";
import {
  cardDisplayName,
  isPlayerIconImageKind,
  playerSchema,
  parsePlayerId,
  playStyleImageKind,
  traitImageKind,
  toPlayerSummary,
} from "@/lib/domain/player";
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

  it("accepts optional star signings prices and icon image kinds", () => {
    const player = playerSchema.parse({
      id: "30920624",
      slug: "varane",
      name: "Varane",
      rating: 122,
      altPositions: [],
      stats: [],
      traits: [],
      playStyles: [],
      skills: [],
      relatedCardIds: [],
      availableImageKinds: ["card", "background"],
      starSigningsBuy: 62240,
      starSigningsSell: 10000,
      fetchedAt: 1,
      parseVersion: CURRENT_PARSE_VERSION,
    });
    expect(player.starSigningsBuy).toBe(62240);
    expect(playStyleImageKind("12683081")).toBe("playstyle-12683081");
    expect(playStyleImageKind("-1765936151")).toBe("playstyle--1765936151");
    expect(isPlayerIconImageKind("playstyle--1765936151")).toBe(true);
    expect(traitImageKind("7")).toBe("trait-7");
    expect(playStyleImageKind("../evil")).toBeUndefined();
  });

  it("summarizes alt positions and PAC–PHY group stats for listing", () => {
    const player = playerSchema.parse({
      id: "24048401",
      slug: "osimhen",
      name: "Osimhen",
      rating: 122,
      position: "ST",
      altPositions: ["CF"],
      stats: [
        { key: "avg1", value: 158 },
        { key: "avg2", value: 156 },
        { key: "avg3", value: 134 },
        { key: "avg4", value: 150 },
        { key: "avg5", value: 91 },
        { key: "avg6", value: 150 },
        { key: "acc", value: 159 },
      ],
      traits: [],
      playStyles: [],
      skills: [],
      relatedCardIds: [],
      availableImageKinds: ["card"],
      fetchedAt: 1,
      parseVersion: CURRENT_PARSE_VERSION,
    });
    const summary = toPlayerSummary(player);
    expect(summary.altPositions).toEqual(["CF"]);
    expect(summary.cardName).toBeUndefined();
    expect(summary.commonName).toBeUndefined();
    expect(summary.lastName).toBeUndefined();
    expect(summary.avgStats.map((stat) => [stat.label, stat.value])).toEqual([
      ["PAC", 158],
      ["SHO", 156],
      ["PAS", 134],
      ["DRI", 150],
      ["DEF", 91],
      ["PHY", 150],
    ]);
  });

  it("copies card, common, and last names onto listing summaries", () => {
    const player = playerSchema.parse({
      id: "30920628",
      slug: "cesc-fabregas",
      name: "Francesc Fàbregas i Soler",
      cardName: "Cesc Fàbregas",
      firstName: "Francesc",
      lastName: "Fàbregas i Soler",
      commonName: "Cesc Fàbregas",
      rating: 121,
      altPositions: [],
      stats: [],
      traits: [],
      playStyles: [],
      skills: [],
      relatedCardIds: [],
      availableImageKinds: ["card"],
      fetchedAt: 1,
      parseVersion: CURRENT_PARSE_VERSION,
    });
    const summary = toPlayerSummary(player);
    expect(summary.cardName).toBe("Cesc Fàbregas");
    expect(summary.commonName).toBe("Cesc Fàbregas");
    expect(summary.lastName).toBe("Fàbregas i Soler");
    expect(summary.name).toBe("Francesc Fàbregas i Soler");
    expect(summary.playStyles).toEqual([]);
  });

  it("copies playstyle ids and levels onto listing summaries without names or urls", () => {
    const player = playerSchema.parse({
      id: "30920624",
      slug: "varane",
      name: "Raphaël Varane",
      lastName: "Varane",
      rating: 122,
      altPositions: [],
      stats: [],
      traits: [],
      playStyles: [
        {
          id: "12683081",
          key: "PLAYSTYLE_AERIAL_DEFENSE",
          name: "Aerial Defense",
          level: 1,
        },
        { id: "987634376", level: 2 },
      ],
      skills: [],
      relatedCardIds: [],
      availableImageKinds: ["card"],
      fetchedAt: 1,
      parseVersion: CURRENT_PARSE_VERSION,
    });
    const summary = toPlayerSummary(player);
    expect(summary.playStyles).toEqual([
      { id: "12683081", level: 1 },
      { id: "987634376", level: 2 },
    ]);
    expect(JSON.stringify(summary)).not.toContain("Aerial Defense");
    expect(JSON.stringify(summary)).not.toContain("https://");
  });

  it("omits blank cardName so listing still parses", () => {
    const player = playerSchema.parse({
      id: "30920628",
      slug: "cesc-fabregas",
      name: "Francesc Fàbregas i Soler",
      cardName: "  ",
      lastName: "Fàbregas i Soler",
      commonName: "Cesc Fàbregas",
      rating: 121,
      altPositions: [],
      stats: [],
      traits: [],
      playStyles: [],
      skills: [],
      relatedCardIds: [],
      availableImageKinds: ["card"],
      fetchedAt: 1,
      parseVersion: CURRENT_PARSE_VERSION,
    });
    expect(toPlayerSummary(player).cardName).toBeUndefined();
  });
});

describe("cardDisplayName", () => {
  it("prefers RenderZ cardName over legal and common names", () => {
    expect(
      cardDisplayName({
        name: "Francesc Fàbregas i Soler",
        lastName: "Fàbregas i Soler",
        commonName: "Cesc Fàbregas",
        cardName: "Cesc Fàbregas",
      }),
    ).toBe("Cesc Fàbregas");
  });

  it("uses commonName for Fàbregas-like rows when cardName is missing", () => {
    expect(
      cardDisplayName({
        name: "Francesc Fàbregas i Soler",
        commonName: "Cesc Fàbregas",
        lastName: "Fàbregas i Soler",
      }),
    ).toBe("Cesc Fàbregas");
  });

  it("uses lastName for Varane-like rows with no card or common name", () => {
    expect(
      cardDisplayName({
        name: "Raphaël Varane",
        lastName: "Varane",
      }),
    ).toBe("Varane");
  });

  it("does not invent a nickname from the legal name", () => {
    expect(cardDisplayName({ name: "Raphaël Varane" })).toBe("Raphaël Varane");
  });

  it("returns undefined when every name field is blank", () => {
    expect(cardDisplayName({})).toBeUndefined();
    expect(
      cardDisplayName({
        name: "  ",
        cardName: "",
        commonName: "\t",
        lastName: "",
      }),
    ).toBeUndefined();
  });
});

