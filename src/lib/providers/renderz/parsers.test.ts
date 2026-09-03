import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseListingSeed } from "@/lib/providers/renderz/listing-parser";
import {
  parseAddedAt,
  parseHeightCm,
  parsePlayerPage,
  parseWeightKg,
} from "@/lib/providers/renderz/player-parser";
import {
  parseSitemapChildLocs,
  parseSitemapPlayerLocs,
} from "@/lib/providers/renderz/sitemap-parser";
import { ParseError } from "@/lib/http/errors";

const fixtures = path.join(process.cwd(), "test/fixtures/renderz/minimized");

function read(name: string): string {
  return readFileSync(path.join(fixtures, name), "utf8");
}

describe("parseListingSeed", () => {
  it("parses HTML kit.start and links", () => {
    const seeds = parseListingSeed({ html: read("listing.html") });
    expect(seeds.map((seed) => seed.id).sort()).toEqual(["24029971", "30920624"]);
    expect(seeds.find((seed) => seed.id === "30920624")?.rating).toBe(122);
  });

  it("parses packed __data.json", () => {
    const seeds = parseListingSeed({ dataJson: read("listing.data.json") });
    expect(seeds).toHaveLength(2);
    expect(seeds.find((seed) => seed.slug === "mbappe")?.rating).toBe(120);
  });

  it("merges HTML and data.json without duplicating ids", () => {
    const seeds = parseListingSeed({
      html: read("listing.html"),
      dataJson: read("listing.data.json"),
    });
    const ids = seeds.map((seed) => seed.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("24044714");
    expect(ids).toContain("30920624");
  });

  it("fails closed when neither source has players", () => {
    expect(() => parseListingSeed({ html: "<html></html>" })).toThrow(ParseError);
  });
});

describe("player field helpers", () => {
  it("parses height, weight, and added timestamps", () => {
    expect(parseHeightCm("5'7\" (169 cm)")).toBe(169);
    expect(parseWeightKg("67 kg")).toBe(67);
    expect(parseAddedAt("2026-01-14T12:50:28.852Z")).toBe(
      Date.parse("2026-01-14T12:50:28.852Z"),
    );
  });
});

describe("parsePlayerPage", () => {
  it("parses HTML-only player pages and prefers visible labels", () => {
    const { player, assets } = parsePlayerPage({ html: read("messi.html") });
    expect(player.id).toBe("24029971");
    expect(player.rating).toBe(114);
    expect(player.position).toBe("ST");
    expect(player.heightCm).toBe(169);
    expect(player.weightKg).toBe(67);
    expect(player.auctionable).toBe(true);
    expect(player.clubName).toBe("Inter Miami CF");
    expect(player.nationName).toBe("Argentina");
    expect(player.leagueName).toBe("Major League Soccer");
    expect(player.stats.some((stat) => stat.key === "avg1" && stat.value === 136)).toBe(true);
    expect(player.stats.some((stat) => stat.key === "acc")).toBe(true);
    expect(JSON.stringify(player)).not.toContain("https://images-v2.renderz.app");
    expect(assets.some((asset) => asset.kind === "card")).toBe(true);
    expect(assets[0]?.upstreamUrl.startsWith("https://images-v2.renderz.app")).toBe(true);
  });

  it("parses __data.json-only and keeps unresolved i18n keys", () => {
    const { player } = parsePlayerPage({ dataJson: read("mbappe.data.json") });
    expect(player.id).toBe("24044714");
    expect(player.rating).toBe(120);
    expect(player.position).toBe("LW");
    expect(player.auctionable).toBe(false);
    expect(player.clubName).toBe("TeamName_243");
    expect(player.stats.some((stat) => stat.key === "avg1")).toBe(true);
  });

  it("merges data.json fields with HTML labels", () => {
    const { player } = parsePlayerPage({
      html: read("messi.html"),
      dataJson: read("mbappe.data.json"),
    });
    expect(player.id).toBe("24044714");
    expect(player.clubName).toBe("Inter Miami CF");
  });
});

describe("sitemap parsers", () => {
  it("extracts player ids and ignores program URLs", () => {
    const entries = parseSitemapPlayerLocs(read("sitemap-players.xml"));
    expect(entries.map((entry) => entry.id)).toEqual(["24029971", "24044714"]);
  });

  it("extracts player sitemap children", () => {
    const locs = parseSitemapChildLocs(read("sitemap-index.xml"));
    expect(locs).toEqual([
      "https://renderz.app/sitemap-players-1.xml",
      "https://evil.example/sitemap-players-2.xml",
    ]);
  });
});
