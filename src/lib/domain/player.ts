import { z } from "zod";

export const PLAYER_ID_PATTERN = /^\d+$/;

export const playerIdSchema = z
  .string()
  .regex(PLAYER_ID_PATTERN, "Player id must be numeric")
  .brand<"PlayerId">();

export type PlayerId = z.infer<typeof playerIdSchema>;

export function parsePlayerId(value: string): PlayerId {
  return playerIdSchema.parse(value);
}

export const PLAYER_IMAGE_KINDS = [
  "card",
  "background",
  "flag",
  "club",
  "league",
] as const;

export const playerImageKindSchema = z.enum(PLAYER_IMAGE_KINDS);
export type PlayerImageKind = z.infer<typeof playerImageKindSchema>;

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

export const playStyleSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  level: z.number().int().optional(),
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
  position: z.string().min(1).optional(),
  programId: z.string().min(1).optional(),
  clubName: z.string().min(1).optional(),
  nationName: z.string().min(1).optional(),
  leagueName: z.string().min(1).optional(),
  auctionable: z.boolean().optional(),
  availableImageKinds: z.array(playerImageKindSchema),
  addedAt: z.number().int().optional(),
  fetchedAt: z.number().int(),
  parseVersion: z.number().int().nonnegative(),
});
export type PlayerSummary = z.infer<typeof playerSummarySchema>;

export const playerSchema = playerSummarySchema.extend({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  commonName: z.string().optional(),
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

export function toPlayerSummary(player: Player): PlayerSummary {
  return playerSummarySchema.parse({
    id: player.id,
    slug: player.slug,
    name: player.name,
    rating: player.rating,
    position: player.position,
    programId: player.programId,
    clubName: player.clubName,
    nationName: player.nationName,
    leagueName: player.leagueName,
    auctionable: player.auctionable,
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
