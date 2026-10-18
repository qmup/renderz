import { sql } from "drizzle-orm";
import type { AuroraDatabase } from "@/db/postgres";

/**
 * Accent folds used by player_search_text. Keep this list aligned with the
 * SQLite catalog search in drizzle-repository.ts.
 */
const SEARCH_FOLDS: Array<[string, string]> = [
  ["à", "a"],
  ["á", "a"],
  ["â", "a"],
  ["ã", "a"],
  ["ä", "a"],
  ["å", "a"],
  ["è", "e"],
  ["é", "e"],
  ["ê", "e"],
  ["ë", "e"],
  ["ì", "i"],
  ["í", "i"],
  ["î", "i"],
  ["ï", "i"],
  ["ò", "o"],
  ["ó", "o"],
  ["ô", "o"],
  ["õ", "o"],
  ["ö", "o"],
  ["ù", "u"],
  ["ú", "u"],
  ["û", "u"],
  ["ü", "u"],
  ["ý", "y"],
  ["ÿ", "y"],
  ["ñ", "n"],
  ["ç", "c"],
];

const FOLD_FROM = SEARCH_FOLDS.map(([from]) => from).join("");
const FOLD_TO = SEARCH_FOLDS.map(([, to]) => to).join("");

const PLAYER_SEARCH_FUNCTION = `
CREATE OR REPLACE FUNCTION player_search_text(
  name text,
  slug text,
  first_name text,
  last_name text,
  common_name text,
  card_name text
) RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT translate(
    lower(concat_ws(
      chr(1),
      name,
      slug,
      coalesce(first_name, ''),
      coalesce(last_name, ''),
      coalesce(common_name, ''),
      coalesce(card_name, '')
    )),
    '${FOLD_FROM}',
    '${FOLD_TO}'
  );
$$
`;

const ADD_SEARCH_COLUMN = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'players'
      AND column_name = 'search_text'
  ) THEN
    ALTER TABLE players
      ADD COLUMN search_text text
      GENERATED ALWAYS AS (
        player_search_text(name, slug, first_name, last_name, common_name, card_name)
      ) STORED;
  END IF;
END $$
`;

let pending: Promise<void> | undefined;

/** Idempotent. The listing query reads search_text and its trigram index. */
export function ensurePlayerSearchIndex(db: AuroraDatabase): Promise<void> {
  if (!pending) {
    pending = applyPlayerSearchIndex(db).catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  }
  return pending;
}

async function applyPlayerSearchIndex(db: AuroraDatabase): Promise<void> {
  const existing = await db.execute(
    sql`select 1 as ok from pg_indexes where indexname = 'idx_players_search_trgm'`,
  );
  if (existing.rows.length > 0) {
    return;
  }
  await db.execute(sql.raw(`CREATE EXTENSION IF NOT EXISTS pg_trgm`));
  await db.execute(sql.raw(PLAYER_SEARCH_FUNCTION));
  await db.execute(sql.raw(ADD_SEARCH_COLUMN));
  await db.execute(
    sql.raw(
      `CREATE INDEX IF NOT EXISTS idx_players_search_trgm ON players USING gin (search_text gin_trgm_ops)`,
    ),
  );
}
