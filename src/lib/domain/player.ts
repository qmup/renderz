import { groupStatsFromPlayerStats } from '@/lib/stats';
import { z } from 'zod';

export const PLAYER_ID_PATTERN = /^\d+$/;

export const playerIdSchema = z
  .string()
  .regex(PLAYER_ID_PATTERN, 'Player id must be numeric')
  .brand<'PlayerId'>();

export type PlayerId = z.infer<typeof playerIdSchema>;

export function parsePlayerId(value: string): PlayerId {
  return playerIdSchema.parse(value);
}

export const PLAYER_CARD_IMAGE_KINDS = [
  'card',
  'background',
  'flag',
  'club',
  'league',
] as const;

/** Listing / card-art layers. League is stored but omitted from listing composition. */
export const PLAYER_IMAGE_KINDS = PLAYER_CARD_IMAGE_KINDS;

export const playerCardImageKindSchema = z.enum(PLAYER_CARD_IMAGE_KINDS);
export type PlayerCardImageKind = z.infer<typeof playerCardImageKindSchema>;

/** Well-known shared chrome icons (not stored per player). */
export const PLAYER_COMMON_IMAGE_KINDS = ['untradeable', 'star-shard'] as const;

export const playerCommonImageKindSchema = z.enum(PLAYER_COMMON_IMAGE_KINDS);
export type PlayerCommonImageKind = z.infer<typeof playerCommonImageKindSchema>;

const PLAYER_ICON_KIND_PATTERN =
  /^(?:playstyle--?[A-Za-z0-9_]+(?:-l\d+)?|trait--?[A-Za-z0-9_]+)$/;

export const playerIconImageKindSchema = z
  .string()
  .regex(PLAYER_ICON_KIND_PATTERN, 'Invalid player icon image kind');

/** Card chrome LOOP sprite sheet; maxFrames encoded as `loop-f{n}`. */
const PLAYER_LOOP_KIND_PATTERN = /^loop-f(\d+)$/;

export const playerLoopImageKindSchema = z
  .string()
  .regex(PLAYER_LOOP_KIND_PATTERN, 'Invalid player loop image kind');

export type PlayerLoopImageKind = z.infer<typeof playerLoopImageKindSchema>;

export const playerImageKindSchema = z.union([
  playerCardImageKindSchema,
  playerCommonImageKindSchema,
  playerIconImageKindSchema,
  playerLoopImageKindSchema,
]);
export type PlayerImageKind = z.infer<typeof playerImageKindSchema>;

/** Card layers + optional LOOP kind stored on the player row (no URLs). */
export const availableImageKindSchema = z.union([
  playerCardImageKindSchema,
  playerLoopImageKindSchema,
]);
export type AvailableImageKind = z.infer<typeof availableImageKindSchema>;

export function isPlayerCardImageKind(
  kind: string,
): kind is PlayerCardImageKind {
  return playerCardImageKindSchema.safeParse(kind).success;
}

export function isPlayerCommonImageKind(
  kind: string,
): kind is PlayerCommonImageKind {
  return playerCommonImageKindSchema.safeParse(kind).success;
}

export function isPlayerIconImageKind(kind: string): kind is PlayerImageKind {
  return playerIconImageKindSchema.safeParse(kind).success;
}

/** Icon + common kinds share one cached blob across players. */
export function isSharedImageKind(kind: string): boolean {
  return isPlayerIconImageKind(kind) || isPlayerCommonImageKind(kind);
}

export function isPlayerLoopImageKind(
  kind: string,
): kind is PlayerLoopImageKind {
  return playerLoopImageKindSchema.safeParse(kind).success;
}

export function cardLoopImageKind(
  maxFrames: number,
): PlayerLoopImageKind | undefined {
  if (!Number.isFinite(maxFrames) || maxFrames < 1) {
    return undefined;
  }
  return `loop-f${Math.trunc(maxFrames)}`;
}

export function cardLoopMaxFramesFromKind(
  kind: string,
): number | undefined {
  const match = kind.match(PLAYER_LOOP_KIND_PATTERN);
  if (!match?.[1]) {
    return undefined;
  }
  const frames = Number(match[1]);
  return Number.isFinite(frames) && frames > 0 ? frames : undefined;
}

export function findCardLoopKind(
  kinds: readonly string[],
): PlayerLoopImageKind | undefined {
  for (const kind of kinds) {
    if (isPlayerLoopImageKind(kind)) {
      return kind;
    }
  }
  return undefined;
}

function sanitizeIconId(id: string): string | undefined {
  const compact = id.trim();
  if (!compact || !/^-?[A-Za-z0-9_]+$/.test(compact)) {
    return undefined;
  }
  return compact;
}

/** Playstyle icons differ by level (1 silver, 2 gold, …); kind must include level. */
export function playStyleImageKind(
  id: string,
  level?: number,
): PlayerImageKind | undefined {
  const safe = sanitizeIconId(id);
  if (!safe) {
    return undefined;
  }
  if (level !== undefined && Number.isFinite(level) && level > 0) {
    return `playstyle-${safe}-l${Math.trunc(level)}`;
  }
  return `playstyle-${safe}`;
}

export function playStyleLevelFromImageKind(
  kind: string,
): number | undefined {
  const match = kind.match(/^playstyle-.+-l(\d+)$/);
  if (!match?.[1]) {
    return undefined;
  }
  return Number(match[1]);
}

export function playStyleBaseImageKind(
  kind: string,
): PlayerImageKind | undefined {
  const match = kind.match(/^(playstyle--?[A-Za-z0-9_]+)-l\d+$/);
  if (!match?.[1]) {
    return undefined;
  }
  return playerIconImageKindSchema.safeParse(match[1]).success
    ? (match[1] as PlayerImageKind)
    : undefined;
}

export function playStyleLevelFromUpstreamUrl(
  url: string,
): number | undefined {
  const match = url.match(/_(\d+)(?:\?|$)/);
  if (!match?.[1]) {
    return undefined;
  }
  const level = Number(match[1]);
  return Number.isFinite(level) && level > 0 ? level : undefined;
}

export function traitImageKind(id: string): PlayerImageKind | undefined {
  const safe = sanitizeIconId(id);
  return safe ? `trait-${safe}` : undefined;
}

export const playerStatSchema = z.object({
  key: z.string().min(1),
  value: z.number(),
  label: z.string().min(1).optional(),
});
export type PlayerStat = z.infer<typeof playerStatSchema>;

export const playerTraitSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
});
export type PlayerTrait = z.infer<typeof playerTraitSchema>;

/** Listing/card overlay: ids + levels only, never image URLs. */
export const cardPlayStyleSchema = z.object({
  id: z.string().min(1),
  level: z.number().int().optional(),
});
export type CardPlayStyle = z.infer<typeof cardPlayStyleSchema>;

export const playStyleSchema = cardPlayStyleSchema.extend({
  key: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
});
export type PlayStyle = z.infer<typeof playStyleSchema>;

/** Higher playstyle levels first (gold above silver). Missing level sorts last. */
export function sortPlayStylesByLevelDesc<T extends { level?: number; id?: string }>(
  styles: T[],
): T[] {
  return [...styles].sort((a, b) => {
    const levelDiff = (b.level ?? -1) - (a.level ?? -1);
    if (levelDiff !== 0) {
      return levelDiff;
    }
    return String(a.id ?? "").localeCompare(String(b.id ?? ""));
  });
}

export const skillNodeSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  level: z.number().int().optional(),
});
export type SkillNode = z.infer<typeof skillNodeSchema>;

const playerIdentitySchema = z.object({
  id: playerIdSchema,
  slug: z.string(),
  name: z.string().min(1),
  rating: z.number().int(),
});

export const playerSummarySchema = playerIdentitySchema.extend({
  cardName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  commonName: z.string().min(1).optional(),
  position: z.string().min(1).optional(),
  programId: z.string().min(1).optional(),
  clubName: z.string().min(1).optional(),
  nationName: z.string().min(1).optional(),
  leagueName: z.string().min(1).optional(),
  auctionable: z.boolean().optional(),
  altPositions: z.array(z.string().min(1)).default([]),
  avgStats: z.array(playerStatSchema).default([]),
  playStyles: z.array(cardPlayStyleSchema).default([]),
  availableImageKinds: z.array(availableImageKindSchema),
  addedAt: z.number().int().optional(),
  fetchedAt: z.number().int(),
  parseVersion: z.number().int().nonnegative(),
});
export type PlayerSummary = z.infer<typeof playerSummarySchema>;

export const playerSchema = playerSummarySchema
  .omit({ avgStats: true })
  .extend({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    commonName: z.string().optional(),
    cardName: z.string().optional(),
    altPositions: z.array(z.string().min(1)),
    foot: z.string().optional(),
    weakFoot: z.string().optional(),
    skillMovesLevel: z.string().optional(),
    heightCm: z.number().optional(),
    weightKg: z.number().optional(),
    workRateAtt: z.string().optional(),
    workRateDef: z.string().optional(),
    programName: z.string().optional(),
    birthday: z.string().optional(),
    stats: z.array(playerStatSchema),
    totalStats: z.number().optional(),
    metaRating: z.number().optional(),
    traits: z.array(playerTraitSchema),
    playStyles: z.array(playStyleSchema),
    skills: z.array(skillNodeSchema),
    relatedCardIds: z.array(playerIdSchema),
    starSigningsBuy: z.number().int().nonnegative().optional(),
    starSigningsSell: z.number().int().nonnegative().optional(),
  });
export type Player = z.infer<typeof playerSchema>;

export const playerSeedSchema = playerIdentitySchema.extend({
  discoveredAt: z.number().int().optional(),
});
export type PlayerSeed = z.infer<typeof playerSeedSchema>;

export const playerAssetRowSchema = z.object({
  playerId: playerIdSchema,
  kind: playerImageKindSchema,
  upstreamUrl: z.string().url(),
  fetchedAt: z.number().int(),
});
export type PlayerAssetRow = z.infer<typeof playerAssetRowSchema>;

function nonEmptyName(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Short name printed on card art. Prefers RenderZ `cardName`, then
 * `commonName`, then `lastName`, then `name`. Never invents nicknames.
 */
export function cardDisplayName(player: {
  cardName?: string;
  commonName?: string;
  lastName?: string;
  name?: string;
}): string | undefined {
  return (
    nonEmptyName(player.commonName) ??
    nonEmptyName(player.cardName) ??
    nonEmptyName(player.lastName) ??
    nonEmptyName(player.name)
  );
}

export function toPlayerSummary(player: Player): PlayerSummary {
  return playerSummarySchema.parse({
    id: player.id,
    slug: player.slug,
    name: player.name,
    cardName: nonEmptyName(player.cardName),
    lastName: nonEmptyName(player.lastName),
    commonName: nonEmptyName(player.commonName),
    rating: player.rating,
    position: player.position,
    programId: player.programId,
    clubName: player.clubName,
    nationName: player.nationName,
    leagueName: player.leagueName,
    auctionable: player.auctionable,
    altPositions: player.altPositions,
    avgStats: groupStatsFromPlayerStats(player.stats),
    playStyles: sortPlayStylesByLevelDesc(
      player.playStyles.map((style) => ({
        id: style.id,
        level: style.level,
      })),
    ),
    availableImageKinds: player.availableImageKinds,
    addedAt: player.addedAt,
    fetchedAt: player.fetchedAt,
    parseVersion: player.parseVersion,
  });
}

export function createSeedPlayer(
  seed: PlayerSeed,
  now = Date.now(),
  parseVersion = 0,
): Player {
  const parsed = playerSeedSchema.parse(seed);
  return playerSchema.parse({
    ...parsed,
    altPositions: [],
    stats: [],
    traits: [],
    playStyles: [],
    skills: [],
    relatedCardIds: [],
    availableImageKinds: [],
    fetchedAt: now,
    parseVersion,
  });
}
