CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text DEFAULT '' NOT NULL,
	`name` text NOT NULL,
	`rating` integer NOT NULL,
	`first_name` text,
	`last_name` text,
	`common_name` text,
	`position` text,
	`alt_positions` text DEFAULT '[]' NOT NULL,
	`program_id` text,
	`program_name` text,
	`club_name` text,
	`nation_name` text,
	`league_name` text,
	`auctionable` integer,
	`foot` text,
	`weak_foot` text,
	`skill_moves_level` text,
	`height_cm` integer,
	`weight_kg` integer,
	`work_rate_att` text,
	`work_rate_def` text,
	`birthday` text,
	`stats` text DEFAULT '[]' NOT NULL,
	`total_stats` integer,
	`meta_rating` real,
	`traits` text DEFAULT '[]' NOT NULL,
	`play_styles` text DEFAULT '[]' NOT NULL,
	`skills` text DEFAULT '[]' NOT NULL,
	`related_card_ids` text DEFAULT '[]' NOT NULL,
	`available_image_kinds` text DEFAULT '[]' NOT NULL,
	`added_at` integer,
	`fetched_at` integer NOT NULL,
	`parse_version` integer NOT NULL,
	`discovered_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_players_name` ON `players` (`name`);--> statement-breakpoint
CREATE INDEX `idx_players_slug` ON `players` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_players_rating` ON `players` (`rating`);--> statement-breakpoint
CREATE INDEX `idx_players_position` ON `players` (`position`);--> statement-breakpoint
CREATE INDEX `idx_players_program_id` ON `players` (`program_id`);--> statement-breakpoint
CREATE INDEX `idx_players_club_name` ON `players` (`club_name`);--> statement-breakpoint
CREATE INDEX `idx_players_nation_name` ON `players` (`nation_name`);--> statement-breakpoint
CREATE INDEX `idx_players_league_name` ON `players` (`league_name`);--> statement-breakpoint
CREATE INDEX `idx_players_auctionable` ON `players` (`auctionable`);--> statement-breakpoint
CREATE INDEX `idx_players_fetched_at` ON `players` (`fetched_at`);--> statement-breakpoint
CREATE INDEX `idx_players_parse_version` ON `players` (`parse_version`);--> statement-breakpoint
CREATE INDEX `idx_players_added_at` ON `players` (`added_at`);--> statement-breakpoint
CREATE INDEX `idx_players_discovered_at` ON `players` (`discovered_at`);--> statement-breakpoint
CREATE INDEX `idx_players_rating_name` ON `players` (`rating`,`name`);--> statement-breakpoint
CREATE TABLE `player_assets` (
	`player_id` text NOT NULL,
	`kind` text NOT NULL,
	`upstream_url` text NOT NULL,
	`fetched_at` integer NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_player_assets_player_kind` ON `player_assets` (`player_id`,`kind`);--> statement-breakpoint
CREATE INDEX `idx_player_assets_player_id` ON `player_assets` (`player_id`);--> statement-breakpoint
CREATE TABLE `ingest_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` text NOT NULL,
	`slug` text,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`claimed_at` integer,
	`completed_at` integer,
	`next_attempt_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ingest_jobs_claim` ON `ingest_jobs` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `idx_ingest_jobs_player_kind` ON `ingest_jobs` (`player_id`,`kind`);--> statement-breakpoint
CREATE INDEX `idx_ingest_jobs_status_kind` ON `ingest_jobs` (`status`,`kind`);--> statement-breakpoint
CREATE INDEX `idx_ingest_jobs_claimed_at` ON `ingest_jobs` (`claimed_at`);