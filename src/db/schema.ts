import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type {
  PlayerImageKind,
  PlayerStat,
  PlayStyle,
  PlayerTrait,
  SkillNode,
} from "@/lib/domain/player";

export const ingestJobKinds = ["discovery", "refresh"] as const;
export type IngestJobKind = (typeof ingestJobKinds)[number];

export const ingestJobStatuses = [
  "pending",
  "in_progress",
  "succeeded",
  "failed",
  "skipped",
] as const;
export type IngestJobStatus = (typeof ingestJobStatuses)[number];

export const players = sqliteTable(
  "players",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().default(""),
    name: text("name").notNull(),
    rating: integer("rating").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    commonName: text("common_name"),
    position: text("position"),
    altPositions: text("alt_positions", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    programId: text("program_id"),
    programName: text("program_name"),
    clubName: text("club_name"),
    nationName: text("nation_name"),
    leagueName: text("league_name"),
    auctionable: integer("auctionable", { mode: "boolean" }),
    foot: text("foot"),
    weakFoot: text("weak_foot"),
    skillMovesLevel: text("skill_moves_level"),
    heightCm: integer("height_cm"),
    weightKg: integer("weight_kg"),
    workRateAtt: text("work_rate_att"),
    workRateDef: text("work_rate_def"),
    birthday: text("birthday"),
    stats: text("stats", { mode: "json" }).$type<PlayerStat[]>().notNull().default([]),
    totalStats: integer("total_stats"),
    metaRating: real("meta_rating"),
    traits: text("traits", { mode: "json" })
      .$type<PlayerTrait[]>()
      .notNull()
      .default([]),
    playStyles: text("play_styles", { mode: "json" })
      .$type<PlayStyle[]>()
      .notNull()
      .default([]),
    skills: text("skills", { mode: "json" })
      .$type<SkillNode[]>()
      .notNull()
      .default([]),
    relatedCardIds: text("related_card_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    availableImageKinds: text("available_image_kinds", { mode: "json" })
      .$type<PlayerImageKind[]>()
      .notNull()
      .default([]),
    addedAt: integer("added_at"),
    fetchedAt: integer("fetched_at").notNull(),
    parseVersion: integer("parse_version").notNull(),
    discoveredAt: integer("discovered_at").notNull(),
  },
  (table) => [
    index("idx_players_name").on(table.name),
    index("idx_players_slug").on(table.slug),
    index("idx_players_rating").on(table.rating),
    index("idx_players_position").on(table.position),
    index("idx_players_program_id").on(table.programId),
    index("idx_players_club_name").on(table.clubName),
    index("idx_players_nation_name").on(table.nationName),
    index("idx_players_league_name").on(table.leagueName),
    index("idx_players_auctionable").on(table.auctionable),
    index("idx_players_fetched_at").on(table.fetchedAt),
    index("idx_players_parse_version").on(table.parseVersion),
    index("idx_players_added_at").on(table.addedAt),
    index("idx_players_discovered_at").on(table.discoveredAt),
    index("idx_players_rating_name").on(table.rating, table.name),
  ],
);

export const playerAssets = sqliteTable(
  "player_assets",
  {
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    kind: text("kind").$type<PlayerImageKind>().notNull(),
    upstreamUrl: text("upstream_url").notNull(),
    fetchedAt: integer("fetched_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_player_assets_player_kind").on(table.playerId, table.kind),
    index("idx_player_assets_player_id").on(table.playerId),
  ],
);

export const ingestJobs = sqliteTable(
  "ingest_jobs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    playerId: text("player_id").notNull(),
    slug: text("slug"),
    kind: text("kind").$type<IngestJobKind>().notNull(),
    status: text("status").$type<IngestJobStatus>().notNull(),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    claimedAt: integer("claimed_at"),
    completedAt: integer("completed_at"),
    nextAttemptAt: integer("next_attempt_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("idx_ingest_jobs_claim").on(table.status, table.nextAttemptAt),
    index("idx_ingest_jobs_player_kind").on(table.playerId, table.kind),
    index("idx_ingest_jobs_status_kind").on(table.status, table.kind),
    index("idx_ingest_jobs_claimed_at").on(table.claimedAt),
  ],
);

export type PlayerRow = typeof players.$inferSelect;
export type NewPlayerRow = typeof players.$inferInsert;
export type PlayerAssetRowRecord = typeof playerAssets.$inferSelect;
export type IngestJobRow = typeof ingestJobs.$inferSelect;
