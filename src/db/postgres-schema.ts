import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
} from "drizzle-orm/pg-core";
import type {
  AvailableImageKind,
  PlayerImageKind,
  PlayerStat,
  PlayStyle,
  PlayerTrait,
  SkillNode,
} from "@/lib/domain/player";
import type { IngestJobKind, IngestJobStatus } from "@/db/schema";

export const players = pgTable(
  "players",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().default(""),
    name: text("name").notNull(),
    rating: integer("rating").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    commonName: text("common_name"),
    cardName: text("card_name"),
    position: text("position"),
    altPositions: jsonb("alt_positions").$type<string[]>().notNull().default([]),
    programId: text("program_id"),
    programName: text("program_name"),
    clubName: text("club_name"),
    nationName: text("nation_name"),
    leagueName: text("league_name"),
    auctionable: boolean("auctionable"),
    foot: text("foot"),
    weakFoot: text("weak_foot"),
    skillMovesLevel: text("skill_moves_level"),
    heightCm: integer("height_cm"),
    weightKg: integer("weight_kg"),
    workRateAtt: text("work_rate_att"),
    workRateDef: text("work_rate_def"),
    birthday: text("birthday"),
    stats: jsonb("stats").$type<PlayerStat[]>().notNull().default([]),
    totalStats: integer("total_stats"),
    metaRating: doublePrecision("meta_rating"),
    traits: jsonb("traits").$type<PlayerTrait[]>().notNull().default([]),
    playStyles: jsonb("play_styles").$type<PlayStyle[]>().notNull().default([]),
    skills: jsonb("skills").$type<SkillNode[]>().notNull().default([]),
    relatedCardIds: jsonb("related_card_ids").$type<string[]>().notNull().default([]),
    starSigningsBuy: integer("star_signings_buy"),
    starSigningsSell: integer("star_signings_sell"),
    availableImageKinds: jsonb("available_image_kinds")
      .$type<AvailableImageKind[]>()
      .notNull()
      .default([]),
    nameColor: text("name_color"),
    ratingColor: text("rating_color"),
    positionColor: text("position_color"),
    addedAt: bigint("added_at", { mode: "number" }),
    fetchedAt: bigint("fetched_at", { mode: "number" }).notNull(),
    parseVersion: integer("parse_version").notNull(),
    discoveredAt: bigint("discovered_at", { mode: "number" }).notNull(),
    // Folded name/slug/card fields. Maintained in Postgres; see player-search.ts.
    searchText: text("search_text").generatedAlwaysAs(
      sql`player_search_text("name", "slug", "first_name", "last_name", "common_name", "card_name")`,
    ),
  },
  (table) => [
    index("idx_players_name").on(table.name),
    index("idx_players_rating").on(table.rating),
    index("idx_players_position").on(table.position),
    index("idx_players_added_at").on(table.addedAt),
    index("idx_players_rating_name").on(table.rating, table.name),
    index("idx_players_search_trgm").using(
      "gin",
      sql`${table.searchText} gin_trgm_ops`,
    ),
  ],
);

export const playerAssets = pgTable(
  "player_assets",
  {
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    kind: text("kind").$type<PlayerImageKind>().notNull(),
    upstreamUrl: text("upstream_url").notNull(),
    fetchedAt: bigint("fetched_at", { mode: "number" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.playerId, table.kind] }),
    index("idx_player_assets_player_id").on(table.playerId),
  ],
);

export const ingestJobs = pgTable(
  "ingest_jobs",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    playerId: text("player_id").notNull(),
    slug: text("slug"),
    kind: text("kind").$type<IngestJobKind>().notNull(),
    status: text("status").$type<IngestJobStatus>().notNull(),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    claimedAt: bigint("claimed_at", { mode: "number" }),
    completedAt: bigint("completed_at", { mode: "number" }),
    nextAttemptAt: bigint("next_attempt_at", { mode: "number" }).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_ingest_jobs_claim").on(table.status, table.nextAttemptAt),
    index("idx_ingest_jobs_player_kind").on(table.playerId, table.kind),
  ],
);
