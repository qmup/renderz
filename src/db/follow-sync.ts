import { eq, sql } from "drizzle-orm";
import type { AuroraDatabase } from "@/db/postgres";
import { followSyncs } from "@/db/postgres-schema";
import { generateSyncCode } from "@/lib/followed-players";

export type FollowSyncRecord = {
  code: string;
  ids: string[];
  updatedAt: number;
};

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS follow_syncs (
  code text PRIMARY KEY,
  player_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at bigint NOT NULL
)
`;

let pending: Promise<void> | undefined;

/** Idempotent. Created on first use so no separate migration step is needed. */
export function ensureFollowSyncTable(db: AuroraDatabase): Promise<void> {
  if (!pending) {
    pending = db
      .execute(sql.raw(CREATE_TABLE))
      .then(() => undefined)
      .catch((error: unknown) => {
        pending = undefined;
        throw error;
      });
  }
  return pending;
}

export async function createSync(
  db: AuroraDatabase,
  ids: string[],
  now = Date.now(),
): Promise<FollowSyncRecord> {
  await ensureFollowSyncTable(db);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateSyncCode();
    const inserted = await db
      .insert(followSyncs)
      .values({ code, playerIds: ids, updatedAt: now })
      .onConflictDoNothing()
      .returning({ code: followSyncs.code });
    if (inserted.length > 0) {
      return { code, ids, updatedAt: now };
    }
  }
  throw new Error("Could not allocate a sync code");
}

export async function readSync(
  db: AuroraDatabase,
  code: string,
): Promise<FollowSyncRecord | null> {
  await ensureFollowSyncTable(db);
  const rows = await db
    .select()
    .from(followSyncs)
    .where(eq(followSyncs.code, code))
    .limit(1);
  const row = rows[0];
  return row
    ? { code: row.code, ids: row.playerIds, updatedAt: row.updatedAt }
    : null;
}

/** Returns null when the code does not exist. */
export async function writeSync(
  db: AuroraDatabase,
  code: string,
  ids: string[],
  now = Date.now(),
): Promise<FollowSyncRecord | null> {
  await ensureFollowSyncTable(db);
  const updated = await db
    .update(followSyncs)
    .set({ playerIds: ids, updatedAt: now })
    .where(eq(followSyncs.code, code))
    .returning({ code: followSyncs.code });
  return updated.length > 0 ? { code, ids, updatedAt: now } : null;
}
