import { sql } from "drizzle-orm";
import type { AuroraDatabase } from "@/db/postgres";

/**
 * Indexes the listing sort and facet filters need. Idempotent.
 * CREATE INDEX CONCURRENTLY stays out of the request path; instrumentation
 * calls this once per server boot.
 */
const LIST_INDEXES: ReadonlyArray<{ name: string; ddl: string }> = [
  {
    name: "idx_players_added_utc_day",
    ddl: `create index concurrently if not exists idx_players_added_utc_day on players (((timezone('UTC', to_timestamp(added_at / 1000.0)))::date) desc nulls last, rating desc, name asc, id asc)`,
  },
  {
    name: "idx_players_program_id",
    ddl: `create index concurrently if not exists idx_players_program_id on players (program_id)`,
  },
  {
    name: "idx_players_club_name",
    ddl: `create index concurrently if not exists idx_players_club_name on players (club_name)`,
  },
  {
    name: "idx_players_nation_name",
    ddl: `create index concurrently if not exists idx_players_nation_name on players (nation_name)`,
  },
  {
    name: "idx_players_league_name",
    ddl: `create index concurrently if not exists idx_players_league_name on players (league_name)`,
  },
  {
    name: "idx_players_auctionable",
    ddl: `create index concurrently if not exists idx_players_auctionable on players (auctionable)`,
  },
  {
    name: "idx_players_fetched_at",
    ddl: `create index concurrently if not exists idx_players_fetched_at on players (fetched_at desc, rating desc, id asc)`,
  },
];

let pending: Promise<void> | undefined;

export function ensurePlayerListIndexes(db: AuroraDatabase): Promise<void> {
  if (!pending) {
    pending = applyPlayerListIndexes(db).catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  }
  return pending;
}

async function applyPlayerListIndexes(db: AuroraDatabase): Promise<void> {
  const existing = await db.execute<{ indexname: string }>(sql`
    select indexname
    from pg_indexes
    where schemaname = 'public'
      and indexname in (${sql.join(
        LIST_INDEXES.map((index) => sql`${index.name}`),
        sql`, `,
      )})
  `);
  const present = new Set(existing.rows.map((row) => row.indexname));
  for (const index of LIST_INDEXES) {
    if (present.has(index.name)) {
      continue;
    }
    await db.execute(sql.raw(index.ddl));
  }
}
