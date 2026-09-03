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

const PLAYER_ICON_KIND_PATTERN = /^(playstyle|trait)--?[A-Za-z0-9_]+$/;

export const playerIconImageKindSchema = z
  .string()
  .regex(PLAYER_ICON_KIND_PATTERN, 'Invalid player icon image kind');

export const playerImageKindSchema = z.union([
  playerCardImageKindSchema,
  playerIconImageKindSchema,
]);
export type PlayerImageKind = z.infer<typeof playerImageKindSchema>;

export function isPlayerCardImageKind(
  kind: string,
): kind is PlayerCardImageKind {
  return playerCardImageKindSchema.safeParse(kind).success;
}

export function isPlayerIconImageKind(kind: string): kind is PlayerImageKind {
  return playerIconImageKindSchema.safeParse(kind).success;
}

function sanitizeIconId(id: string): string | undefined {
  const compact = id.trim();
  if (!compact || !/^-?[A-Za-z0-9_]+$/.test(compact)) {
    return undefined;
  }
  return compact;
}

export function playStyleImageKind(id: string): PlayerImageKind | undefined {
  const safe = sanitizeIconId(id);
  return safe ? `playstyle-${safe}` : undefined;
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
  availableImageKinds: z.array(playerCardImageKindSchema),
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
    playStyles: player.playStyles.map((style) => ({
      id: style.id,
      level: style.level,
    })),
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
