import { sql } from "drizzle-orm";
import type { PostgresDatabase } from "@/db/postgres";

const ADD_COLOR_COLUMNS = `
ALTER TABLE players ADD COLUMN IF NOT EXISTS name_color text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS rating_color text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS position_color text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS event_program_id text;
`;

let pending: Promise<void> | undefined;

/** Idempotent. Sync and the web app both read these columns. */
export function ensurePlayerColorColumns(db: PostgresDatabase): Promise<void> {
  if (!pending) {
    pending = db
      .execute(sql.raw(ADD_COLOR_COLUMNS))
      .then(() => undefined)
      .catch((error: unknown) => {
        pending = undefined;
        throw error;
      });
  }
  return pending;
}
