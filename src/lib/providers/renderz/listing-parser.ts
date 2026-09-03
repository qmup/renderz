import { load } from "cheerio";
import { ParseError } from "@/lib/http/errors";
import { parsePlayerId, type PlayerSeed } from "@/lib/domain/player";
import { extractJsAssignment } from "@/lib/providers/renderz/js-literal";
import {
  findInflatedField,
  inflateSvelteKitData,
} from "@/lib/providers/renderz/sveltekit-data";
import { parsePlayerHref } from "@/lib/providers/renderz/urls";

type SeedRow = {
  href?: string;
  name?: string;
  rating?: number;
};

function seedFromRow(row: SeedRow): PlayerSeed | undefined {
  if (!row.href || !row.name || typeof row.rating !== "number") {
    return undefined;
  }
  const parsed = parsePlayerHref(row.href);
  if (!parsed) {
    return undefined;
  }
  return {
    id: parsePlayerId(parsed.id),
    slug: parsed.slug,
    name: row.name,
    rating: row.rating,
  };
}

function seedsFromSsrPlayers(value: unknown): PlayerSeed[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((row) => (row && typeof row === "object" ? seedFromRow(row as SeedRow) : undefined))
    .filter((row): row is PlayerSeed => Boolean(row));
}

function seedsFromHtmlLinks(html: string): PlayerSeed[] {
  const $ = load(html);
  const seeds: PlayerSeed[] = [];
  $("a[href*='/player/']").each((_, el) => {
    const href = $(el).attr("href");
    const name = $(el).find("span").first().text().trim() || $(el).text().trim();
    const ratingText = $(el).find("span").last().text().trim();
    const rating = Number(ratingText);
    if (!href || !name || !Number.isFinite(rating)) {
      return;
    }
    const seed = seedFromRow({ href, name, rating });
    if (seed) {
      seeds.push(seed);
    }
  });
  return seeds;
}

function seedsFromDataJson(dataJson: string): PlayerSeed[] {
  try {
    const parsed: unknown = JSON.parse(dataJson);
    const nodes = inflateSvelteKitData(parsed);
    const ssrPlayers = findInflatedField<unknown>(nodes, "ssrPlayers");
    return seedsFromSsrPlayers(ssrPlayers);
  } catch {
    return [];
  }
}

export function parseListingSeed(input: {
  html?: string;
  dataJson?: string;
}): PlayerSeed[] {
  const fromData = input.dataJson ? seedsFromDataJson(input.dataJson) : [];
  const fromKit = input.html
    ? seedsFromSsrPlayers(
        extractJsAssignment<SeedRow[]>(input.html, "ssrPlayers:"),
      )
    : [];
  const fromLinks = input.html ? seedsFromHtmlLinks(input.html) : [];

  const merged = new Map<string, PlayerSeed>();
  for (const seed of [...fromData, ...fromKit, ...fromLinks]) {
    merged.set(seed.id, seed);
  }
  const seeds = [...merged.values()];
  if (seeds.length === 0) {
    throw new ParseError("Listing page did not contain ssrPlayers");
  }
  return seeds;
}
