import { load } from "cheerio";
import { CURRENT_PARSE_VERSION } from "@/lib/catalog/parse-version";
import {
  parsePlayerId,
  playerImageKindSchema,
  playerSchema,
  type Player,
  type PlayerAssetRow,
  type PlayerImageKind,
  type PlayerStat,
  type PlayStyle,
  type PlayerTrait,
  type SkillNode,
} from "@/lib/domain/player";
import { ParseError } from "@/lib/http/errors";
import { extractJsAssignment } from "@/lib/providers/renderz/js-literal";
import {
  findInflatedField,
  inflateSvelteKitData,
} from "@/lib/providers/renderz/sveltekit-data";
import { parsePlayerHref } from "@/lib/providers/renderz/urls";

const IMAGE_KIND_BY_FIELD: Record<string, PlayerImageKind> = {
  playerCardImage: "card",
  playerCardBackground: "background",
  flagImage: "flag",
  clubImage: "club",
  leagueImage: "league",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function parseHeightCm(height: unknown): number | undefined {
  const text = asString(height);
  if (!text) {
    return asNumber(height);
  }
  const match = text.match(/\((\d+)\s*cm\)/i) ?? text.match(/^(\d+)\s*cm$/i);
  return match ? Number(match[1]) : undefined;
}

export function parseWeightKg(weight: unknown): number | undefined {
  const text = asString(weight);
  if (!text) {
    return asNumber(weight);
  }
  const match = text.match(/(\d+)\s*kg/i);
  return match ? Number(match[1]) : undefined;
}

export function parseAddedAt(added: unknown): number | undefined {
  const text = asString(added);
  if (!text) {
    return asNumber(added);
  }
  const ms = Date.parse(text);
  return Number.isNaN(ms) ? undefined : ms;
}

function statsFromUnknown(stats: unknown, avgStats: unknown): PlayerStat[] {
  const out: PlayerStat[] = [];
  const pushEntries = (value: unknown) => {
    if (!isRecord(value)) {
      return;
    }
    for (const [key, item] of Object.entries(value)) {
      if (key === "total") {
        continue;
      }
      if (typeof item === "number" && Number.isFinite(item)) {
        out.push({ key, value: item });
      }
    }
  };
  pushEntries(avgStats);
  pushEntries(stats);
  return out;
}

function traitsFromUnknown(value: unknown): PlayerTrait[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }
    const id = item.id;
    if (id === undefined || id === null) {
      return [];
    }
    return [
      {
        id: String(id),
        key: asString(item.title) ?? asString(item.name),
        name: asString(item.resolvedName),
      },
    ];
  });
}

function playStylesFromUnknown(value: unknown): PlayStyle[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }
    const id = item.id ?? item.name;
    if (id === undefined || id === null) {
      return [];
    }
    return [
      {
        id: String(id),
        key: asString(item.name) ?? asString(item.titleKey),
        name: asString(item.resolvedName),
        level: asNumber(item.level),
      },
    ];
  });
}

function skillsFromUnknown(value: unknown): SkillNode[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    const skill = isRecord(item) && isRecord(item.skill) ? item.skill : item;
    if (!isRecord(skill)) {
      return [];
    }
    const id = skill.id ?? skill.name;
    if (id === undefined || id === null) {
      return [];
    }
    return [
      {
        id: String(id),
        key: asString(skill.name),
        name: asString(skill.resolvedName),
      },
    ];
  });
}

function relatedIdsFromUnknown(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item === "number" || typeof item === "string") {
      const id = String(item);
      if (/^\d+$/.test(id)) {
        ids.push(id);
      }
      continue;
    }
    if (isRecord(item) && item.assetId !== undefined) {
      const id = String(item.assetId);
      if (/^\d+$/.test(id)) {
        ids.push(id);
      }
    }
  }
  return ids;
}

function assetsFromImages(
  playerId: string,
  images: unknown,
  fetchedAt: number,
): PlayerAssetRow[] {
  if (!isRecord(images)) {
    return [];
  }
  const assets: PlayerAssetRow[] = [];
  for (const [field, kind] of Object.entries(IMAGE_KIND_BY_FIELD)) {
    const url = asString(images[field]);
    if (!url || !url.startsWith("https://")) {
      continue;
    }
    assets.push({
      playerId: parsePlayerId(playerId),
      kind: playerImageKindSchema.parse(kind),
      upstreamUrl: url,
      fetchedAt,
    });
  }
  return assets;
}

function displayName(raw: Record<string, unknown>): string | undefined {
  const first = asString(raw.firstName);
  const last = asString(raw.lastName);
  const card = asString(raw.cardName);
  const common = asString(raw.commonName);
  const combined = [first, last].filter(Boolean).join(" ");
  return combined || card || common;
}

function labeledValue($: ReturnType<typeof load>, label: string): string | undefined {
  const match = $("*")
    .toArray()
    .find((el) => $(el).children().length === 0 && $(el).text().trim().toUpperCase() === label);
  if (!match) {
    return undefined;
  }
  const next = $(match).next();
  const text = next.text().trim() || $(match).parent().text().replace(label, "").trim();
  return text || undefined;
}

export function extractHtmlLabels(html: string): {
  clubName?: string;
  leagueName?: string;
  nationName?: string;
  programName?: string;
  traitNames: string[];
} {
  const $ = load(html);
  const programName =
    $("h1")
      .first()
      .nextAll("p, h2, div")
      .filter((_, el) => $(el).text().toLowerCase().includes("player"))
      .first()
      .text()
      .trim() || asString($("p").first().text());
  const traitNames = $("body")
    .text()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) =>
      /^(Finesse Shot|Long Shot Taker|Outside Foot Shot|Roulette|Point to Sky)$/i.test(line),
    );

  return {
    clubName: labeledValue($, "TEAM"),
    leagueName: labeledValue($, "LEAGUE"),
    nationName: labeledValue($, "NATION/REGION") ?? labeledValue($, "NATION"),
    programName,
    traitNames,
  };
}

function looksLikeI18nKey(value: string | undefined): boolean {
  if (!value) {
    return true;
  }
  return /^(TeamName_|NationName_|LeagueName_|programname_|traits_title_|NAME_SKILL_)/i.test(
    value,
  );
}

function applyHtmlLabels(
  player: Player,
  html?: string,
): Player {
  if (!html) {
    return player;
  }
  const labels = extractHtmlLabels(html);
  const traits = player.traits.map((trait, index) => ({
    ...trait,
    name: trait.name ?? labels.traitNames[index],
  }));
  return {
    ...player,
    clubName:
      labels.clubName && looksLikeI18nKey(player.clubName)
        ? labels.clubName
        : player.clubName,
    leagueName:
      labels.leagueName && looksLikeI18nKey(player.leagueName)
        ? labels.leagueName
        : player.leagueName,
    nationName:
      labels.nationName && looksLikeI18nKey(player.nationName)
        ? labels.nationName
        : player.nationName,
    programName:
      labels.programName && looksLikeI18nKey(player.programName)
        ? labels.programName
        : player.programName ?? labels.programName,
    traits,
  };
}

function playerFromRaw(
  raw: Record<string, unknown>,
  fetchedAt: number,
): { player: Player; assets: PlayerAssetRow[] } {
  const idValue = raw.id;
  const id = String(idValue ?? "");
  const href = asString(raw.href);
  const fromHref = href ? parsePlayerHref(href) : null;
  const playerId = fromHref?.id ?? id;
  const name = displayName(raw);
  const rating = asNumber(raw.rating);
  if (!/^\d+$/.test(playerId) || !name || rating === undefined) {
    throw new ParseError("Player payload missing id, name, or rating");
  }

  const assets = assetsFromImages(playerId, raw.images, fetchedAt);
  const stats = statsFromUnknown(raw.stats, raw.avgStats);
  const related = relatedIdsFromUnknown(raw.relatedCards).filter((relatedId) => relatedId !== playerId);

  const player = playerSchema.parse({
    id: parsePlayerId(playerId),
    slug: fromHref?.slug ?? asString(raw.cardName)?.toLowerCase().replaceAll(/\s+/g, "-") ?? "",
    name,
    rating,
    firstName: asString(raw.firstName),
    lastName: asString(raw.lastName),
    commonName: asString(raw.commonName),
    position: asString(raw.position),
    altPositions: Array.isArray(raw.potentialPositions)
      ? raw.potentialPositions.filter((item): item is string => typeof item === "string")
      : [],
    programId: asString(raw.source),
    programName: asString(raw.programName),
    clubName: asString(raw.clubName),
    nationName: asString(raw.nationName),
    leagueName: asString(raw.leagueName),
    auctionable: asBoolean(raw.auctionable),
    foot: asString(raw.foot),
    weakFoot: asString(raw.weakFootRating),
    skillMovesLevel: asString(raw.skillMovesLevel),
    heightCm: parseHeightCm(raw.height),
    weightKg: parseWeightKg(raw.weight),
    workRateAtt: asString(raw.workRateAtt) ?? asString(raw.workRates)?.split("/")[0],
    workRateDef: asString(raw.workRateDef) ?? asString(raw.workRates)?.split("/")[1],
    birthday: asString(raw.birthday),
    stats,
    totalStats: asNumber(raw.totalStats) ?? asNumber(isRecord(raw.stats) ? raw.stats.total : undefined),
    metaRating: asNumber(isRecord(raw.metaData) ? raw.metaData.metaRating : undefined),
    traits: traitsFromUnknown(raw.traits),
    playStyles: playStylesFromUnknown(raw.playStyles),
    skills: skillsFromUnknown(raw.skillsData),
    relatedCardIds: related.filter((value) => /^\d+$/.test(value)).map((value) => parsePlayerId(value)),
    availableImageKinds: assets.map((asset) => asset.kind),
    addedAt: parseAddedAt(raw.added),
    fetchedAt,
    parseVersion: CURRENT_PARSE_VERSION,
  });

  return { player, assets };
}

function rawFromDataJson(dataJson: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(dataJson);
    if (isRecord(parsed) && parsed.type === "redirect") {
      return undefined;
    }
    const nodes = inflateSvelteKitData(parsed);
    const player = findInflatedField<unknown>(nodes, "player");
    return isRecord(player) ? player : undefined;
  } catch {
    return undefined;
  }
}

function rawFromHtml(html: string): Record<string, unknown> | undefined {
  // Search `player:` rather than `data:{player:` so the next `{` is the player
  // object, not the nested `images` object.
  const player = extractJsAssignment<Record<string, unknown>>(html, "player:");
  if (isRecord(player) && player.id !== undefined) {
    return player;
  }
  return undefined;
}

export function parsePlayerPage(input: {
  html?: string;
  dataJson?: string;
  fetchedAt?: number;
}): { player: Player; assets: PlayerAssetRow[] } {
  const fetchedAt = input.fetchedAt ?? Date.now();
  const fromData = input.dataJson ? rawFromDataJson(input.dataJson) : undefined;
  const fromHtml = input.html ? rawFromHtml(input.html) : undefined;
  const raw = fromData ?? fromHtml;
  if (!raw) {
    throw new ParseError("Could not parse player page");
  }
  const parsed = playerFromRaw(raw, fetchedAt);
  return {
    player: applyHtmlLabels(parsed.player, input.html),
    assets: parsed.assets,
  };
}
