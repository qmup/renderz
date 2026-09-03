import { load } from "cheerio";
import { CURRENT_PARSE_VERSION } from "@/lib/catalog/parse-version";
import {
  isPlayerCardImageKind,
  parsePlayerId,
  playStyleImageKind,
  playerImageKindSchema,
  playerSchema,
  traitImageKind,
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

function asHttpsUrl(value: unknown): string | undefined {
  const url = asString(value);
  return url?.startsWith("https://") ? url : undefined;
}

function iconAssetsFromCollections(
  playerId: string,
  playStyles: unknown,
  traits: unknown,
  fetchedAt: number,
): PlayerAssetRow[] {
  const assets: PlayerAssetRow[] = [];
  const push = (kind: PlayerImageKind | undefined, url: string | undefined) => {
    if (!kind || !url) {
      return;
    }
    assets.push({
      playerId: parsePlayerId(playerId),
      kind: playerImageKindSchema.parse(kind),
      upstreamUrl: url,
      fetchedAt,
    });
  };

  if (Array.isArray(playStyles)) {
    for (const item of playStyles) {
      if (!isRecord(item)) {
        continue;
      }
      const id = item.id ?? item.name;
      if (id === undefined || id === null) {
        continue;
      }
      push(
        playStyleImageKind(String(id)),
        asHttpsUrl(item.levelImage) ?? asHttpsUrl(item.image),
      );
    }
  }
  if (Array.isArray(traits)) {
    for (const item of traits) {
      if (!isRecord(item)) {
        continue;
      }
      if (item.id === undefined || item.id === null) {
        continue;
      }
      push(traitImageKind(String(item.id)), asHttpsUrl(item.image));
    }
  }
  return assets;
}

export function parseCoinAmount(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  const text = asString(value);
  if (!text) {
    return undefined;
  }
  const digits = text.replaceAll(",", "").match(/^\d+$/);
  if (!digits) {
    return undefined;
  }
  return Number(digits[0]);
}

export function extractStarSigningsPrices(html: string): {
  buy?: number;
  sell?: number;
} {
  const $ = load(html);
  const text = $.root().text().replace(/\s+/g, " ");
  const section = text.match(
    /Star Signings Price\s*Buy\s+([\d,]+)(?:\s*Sell\s+([\d,]+))?/i,
  );
  if (section) {
    return {
      buy: parseCoinAmount(section[1]),
      sell: parseCoinAmount(section[2]),
    };
  }

  const badge = $('img[alt="Star Signings price"]').first();
  const badgeBuy = parseCoinAmount(badge.next("span").text() || badge.parent().text());
  return {
    buy: badgeBuy,
  };
}

function pricesFromRaw(
  raw: Record<string, unknown>,
  html?: string,
): { buy?: number; sell?: number } {
  const nested = isRecord(raw.starSignings) ? raw.starSignings : undefined;
  const auction = isRecord(raw.auction) ? raw.auction : undefined;
  const buy =
    parseCoinAmount(raw.starSigningsBuy) ??
    parseCoinAmount(nested?.buy) ??
    parseCoinAmount(nested?.buyPrice) ??
    parseCoinAmount(auction?.purchasePrice) ??
    parseCoinAmount(raw.purchasePrice);
  const sell =
    parseCoinAmount(raw.starSigningsSell) ??
    parseCoinAmount(nested?.sell) ??
    parseCoinAmount(nested?.sellPrice) ??
    parseCoinAmount(auction?.sellPrice) ??
    parseCoinAmount(raw.sellPrice);
  const fromHtml = html ? extractStarSigningsPrices(html) : {};
  return {
    buy: buy ?? fromHtml.buy,
    sell: sell ?? fromHtml.sell,
  };
}

function collectionHasIconUrls(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.some(
    (item) =>
      isRecord(item) &&
      (asHttpsUrl(item.levelImage) !== undefined || asHttpsUrl(item.image) !== undefined),
  );
}

function mergePlayerRaw(
  fromData?: Record<string, unknown>,
  fromHtml?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!fromData) {
    return fromHtml;
  }
  if (!fromHtml) {
    return fromData;
  }
  if (String(fromData.id ?? "") !== String(fromHtml.id ?? "")) {
    return fromData;
  }
  return {
    ...fromData,
    auction: isRecord(fromHtml.auction)
      ? fromHtml.auction
      : fromData.auction,
    playStyles: collectionHasIconUrls(fromHtml.playStyles)
      ? fromHtml.playStyles
      : fromData.playStyles,
    traits: collectionHasIconUrls(fromHtml.traits)
      ? fromHtml.traits
      : fromData.traits,
  };
}

function mergeAssets(
  primary: PlayerAssetRow[],
  extra: PlayerAssetRow[],
): PlayerAssetRow[] {
  const seen = new Set(primary.map((asset) => asset.kind));
  const out = [...primary];
  for (const asset of extra) {
    if (seen.has(asset.kind)) {
      continue;
    }
    seen.add(asset.kind);
    out.push(asset);
  }
  return out;
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
  return sanitizeLabel(text);
}

function ownText($: ReturnType<typeof load>, el: object): string {
  return $(el as never)
    .clone()
    .children()
    .remove()
    .end()
    .text()
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeLabel(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length < 1 || compact.length > 80) {
    return undefined;
  }
  if (/like|dislike|download card|watchlist|see all related|latest comments/i.test(compact)) {
    return undefined;
  }
  return compact;
}

function sanitizeDescription(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length < 8 || compact.length > 200) {
    return undefined;
  }
  if (/like|dislike|download card|watchlist|read more/i.test(compact)) {
    return undefined;
  }
  if (/^(traits_desc_|Desc_PlayStyle_)/i.test(compact)) {
    return undefined;
  }
  return compact;
}

function decodeHttpsUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return asHttpsUrl(value.replaceAll("&amp;", "&"));
}

function extractProgramName($: ReturnType<typeof load>): string | undefined {
  const candidates: string[] = [];
  $("h1, h2, p, span, div").each((_, el) => {
    const text = ownText($, el);
    if (text.length >= 8 && text.length <= 80 && /player$/i.test(text)) {
      candidates.push(text);
    }
  });
  return candidates[0];
}

const KNOWN_TRAIT_NAMES =
  /^(Finesse Shot|Long Shot Taker|Long Passer|Outside Foot Shot|Roulette|Point to Sky|Dives Into Tackles|Power Header|Early Crosser|Flair|Speed Dribbler|Play Maker|Acrobatic Clearance|Hard Stop|Giant Throw|Long Thrower|Chip Shot|Bicycle Kick)$/i;

const PLAY_STYLE_LINE = /^([A-Z][A-Za-z0-9' -]{1,40})\s+Level\s+\d+$/;

type HtmlPlayStyleHit = {
  id?: string;
  name?: string;
  description?: string;
  level?: number;
  imageUrl?: string;
};

type HtmlTraitHit = {
  id?: string;
  name?: string;
  imageUrl?: string;
};

type HtmlPlayerLabels = {
  clubName?: string;
  leagueName?: string;
  nationName?: string;
  programName?: string;
  traitNames: string[];
  playStyleNames: string[];
  playStyles: HtmlPlayStyleHit[];
  playStyleImages: HtmlPlayStyleHit[];
  traits: HtmlTraitHit[];
};

export function extractHtmlLabels(html: string): HtmlPlayerLabels {
  const $ = load(html);
  const traitNames: string[] = [];
  const playStyleNames: string[] = [];
  $("p, div, span, li, h2, h3").each((_, el) => {
    const text = ownText($, el);
    if (!text) {
      return;
    }
    if (KNOWN_TRAIT_NAMES.test(text) && !traitNames.includes(text)) {
      traitNames.push(text);
    }
    const playStyle = text.match(PLAY_STYLE_LINE);
    if (
      playStyle?.[1] &&
      !/skillpoints|training|select rank/i.test(playStyle[1]) &&
      !playStyleNames.includes(playStyle[1].trim())
    ) {
      playStyleNames.push(playStyle[1].trim());
    }
  });

  const playStyles: HtmlPlayStyleHit[] = [];
  const seenPlayStyleIds = new Set<string>();
  $('a[href*="/playstyles/"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const id = href.match(/\/playstyles\/(-?\d+)/)?.[1];
    if (!id || seenPlayStyleIds.has(id)) {
      return;
    }
    seenPlayStyleIds.add(id);
    const img = $(el).find('img[src*="playstyle"]').first();
    const name =
      sanitizeLabel(img.attr("alt")) ??
      sanitizeLabel(
        $(el)
          .find("span")
          .filter((_, node) => !/^Level\s+\d+$/i.test(ownText($, node)))
          .first()
          .text(),
      );
    const levelMatch = $(el).text().replace(/\s+/g, " ").match(/Level\s+(\d+)/i);
    playStyles.push({
      id,
      name,
      description: sanitizeDescription($(el).find("p").first().text()),
      level: levelMatch ? Number(levelMatch[1]) : undefined,
      imageUrl: decodeHttpsUrl(img.attr("src")),
    });
    if (name && !playStyleNames.includes(name)) {
      playStyleNames.push(name);
    }
  });

  const playStyleImages: HtmlPlayStyleHit[] = [];
  const seenImageKeys = new Set<string>();
  $('img[src*="playstyle"]').each((_, el) => {
    const imageUrl = decodeHttpsUrl($(el).attr("src"));
    if (!imageUrl) {
      return;
    }
    const key = imageUrl.split("?")[0] ?? imageUrl;
    if (seenImageKeys.has(key)) {
      return;
    }
    seenImageKeys.add(key);
    const name = sanitizeLabel($(el).attr("alt"));
    playStyleImages.push({ name, imageUrl });
    if (name && !playStyleNames.includes(name)) {
      playStyleNames.push(name);
    }
  });

  const traits: HtmlTraitHit[] = [];
  const seenTraitIds = new Set<string>();
  $('img[src*="traitlogo"]').each((_, el) => {
    const src = $(el).attr("src") ?? "";
    const id = src.match(/traitlogo_\d+_(-?\d+)/)?.[1];
    if (!id || seenTraitIds.has(id)) {
      return;
    }
    seenTraitIds.add(id);
    const name = nearestTraitLabel($, el);
    traits.push({
      id,
      name,
      imageUrl: decodeHttpsUrl(src),
    });
    if (name && !traitNames.includes(name)) {
      traitNames.push(name);
    }
  });

  return {
    clubName: labeledValue($, "TEAM"),
    leagueName: labeledValue($, "LEAGUE"),
    nationName: labeledValue($, "NATION/REGION") ?? labeledValue($, "NATION"),
    programName: extractProgramName($),
    traitNames,
    playStyleNames,
    playStyles,
    playStyleImages,
    traits,
  };
}

function nearestTraitLabel(
  $: ReturnType<typeof load>,
  el: object,
): string | undefined {
  const start = $(el as never);
  const fromNext = sanitizeTraitName(start.next("span").text());
  if (fromNext) {
    return fromNext;
  }
  let current: ReturnType<typeof start.parent> = start;
  for (let depth = 0; depth < 8; depth++) {
    const parent = current.parent();
    if (!parent.length) {
      break;
    }
    const fromSibling = sanitizeTraitName(parent.next("span").text());
    if (fromSibling) {
      return fromSibling;
    }
    current = parent;
  }
  return undefined;
}

function sanitizeTraitName(value: string | undefined): string | undefined {
  const label = sanitizeLabel(value);
  if (!label || /^Level\s+\d+$/i.test(label) || label.length > 40) {
    return undefined;
  }
  return label;
}

function looksLikeI18nKey(value: string | undefined): boolean {
  if (!value) {
    return true;
  }
  return /^(TeamName_|NationName_|LeagueName_|programname_|traits_title_|NAME_SKILL_|PLAYSTYLE_|Title_PlayStyle_|Desc_PlayStyle_)/i.test(
    value,
  );
}

function resolveHtmlName(
  current: string | undefined,
  htmlName: string | undefined,
): string | undefined {
  if (looksLikeI18nKey(current)) {
    return htmlName ?? current;
  }
  return current ?? htmlName;
}

function applyExtractedLabels(player: Player, labels: HtmlPlayerLabels): Player {
  const playStyles = player.playStyles.map((style, index) => {
    const byId = labels.playStyles.find((hit) => hit.id === style.id);
    const overlay = labels.playStyleImages[index];
    const htmlName = byId?.name ?? overlay?.name ?? labels.playStyleNames[index];
    return {
      ...style,
      name: resolveHtmlName(style.name, htmlName),
      description: style.description ?? byId?.description,
      level: style.level ?? byId?.level,
    };
  });
  const traits = player.traits.map((trait, index) => {
    const byId = labels.traits.find((hit) => hit.id === trait.id);
    return {
      ...trait,
      name: resolveHtmlName(trait.name, byId?.name ?? labels.traitNames[index]),
    };
  });
  return {
    ...player,
    playStyles,
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
        : sanitizeLabel(player.programName) ?? labels.programName,
    traits,
  };
}

function iconAssetsFromHtmlLabels(
  playerId: string,
  player: Player,
  labels: HtmlPlayerLabels,
  fetchedAt: number,
): PlayerAssetRow[] {
  const assets: PlayerAssetRow[] = [];
  const push = (kind: PlayerImageKind | undefined, url: string | undefined) => {
    if (!kind || !url) {
      return;
    }
    assets.push({
      playerId: parsePlayerId(playerId),
      kind: playerImageKindSchema.parse(kind),
      upstreamUrl: url,
      fetchedAt,
    });
  };
  for (const [index, style] of player.playStyles.entries()) {
    const byId = labels.playStyles.find((hit) => hit.id === style.id);
    push(
      playStyleImageKind(style.id),
      byId?.imageUrl ?? labels.playStyleImages[index]?.imageUrl,
    );
  }
  for (const trait of player.traits) {
    const byId = labels.traits.find((hit) => hit.id === trait.id);
    push(traitImageKind(trait.id), byId?.imageUrl);
  }
  return assets;
}

function playerFromRaw(
  raw: Record<string, unknown>,
  fetchedAt: number,
  html?: string,
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

  const assets = [
    ...assetsFromImages(playerId, raw.images, fetchedAt),
    ...iconAssetsFromCollections(playerId, raw.playStyles, raw.traits, fetchedAt),
  ];
  const stats = statsFromUnknown(raw.stats, raw.avgStats);
  const related = relatedIdsFromUnknown(raw.relatedCards).filter((relatedId) => relatedId !== playerId);
  const prices = pricesFromRaw(raw, html);

  const player = playerSchema.parse({
    id: parsePlayerId(playerId),
    slug: fromHref?.slug ?? asString(raw.cardName)?.toLowerCase().replaceAll(/\s+/g, "-") ?? "",
    name,
    rating,
    cardName: asString(raw.cardName),
    firstName: asString(raw.firstName),
    lastName: asString(raw.lastName),
    commonName: asString(raw.commonName),
    position: asString(raw.position),
    altPositions: Array.isArray(raw.potentialPositions)
      ? raw.potentialPositions.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0,
        )
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
    starSigningsBuy: prices.buy,
    starSigningsSell: prices.sell,
    availableImageKinds: assets
      .map((asset) => asset.kind)
      .filter(isPlayerCardImageKind),
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
  const raw = mergePlayerRaw(fromData, fromHtml);
  if (!raw) {
    throw new ParseError("Could not parse player page");
  }
  const parsed = playerFromRaw(raw, fetchedAt, input.html);
  const labels = input.html ? extractHtmlLabels(input.html) : undefined;
  const player = labels
    ? applyExtractedLabels(parsed.player, labels)
    : parsed.player;
  const htmlAssets = labels
    ? iconAssetsFromHtmlLabels(player.id, player, labels, fetchedAt)
    : [];
  return {
    player,
    assets: mergeAssets(parsed.assets, htmlAssets),
  };
}
