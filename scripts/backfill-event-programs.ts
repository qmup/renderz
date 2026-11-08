/**
 * Recompute `event_program_id` so Program / Event filters include the Icon,
 * Hero and Classic cards released for each event. Run after editing event
 * `names` in src/lib/catalog/programs.ts.
 *
 *   npm run catalog:backfill-events
 */
import { sql } from "drizzle-orm";
import { ensurePlayerColorColumns } from "../src/db/player-columns";
import { ensurePlayerListIndexes } from "../src/db/player-list-indexes";
import { getPostgresDb } from "../src/db/postgres";
import { players } from "../src/db/postgres-schema";
import { eventProgramIdFor } from "../src/lib/catalog/programs";

const WRITE_SLICE = 500;

const db = getPostgresDb();

async function main() {
  await ensurePlayerColorColumns(db);
  await ensurePlayerListIndexes(db);
  const rows = await db
    .select({
      id: players.id,
      programId: players.programId,
      programName: players.programName,
      addedAt: players.addedAt,
      eventProgramId: players.eventProgramId,
    })
    .from(players);
  const changes = rows.flatMap((row) => {
    const next =
      eventProgramIdFor({
        programId: row.programId ?? undefined,
        programName: row.programName ?? undefined,
        addedAt: row.addedAt ?? undefined,
      }) ?? null;
    return next === row.eventProgramId ? [] : [{ id: row.id, eventProgramId: next }];
  });
  let updated = 0;
  for (let start = 0; start < changes.length; start += WRITE_SLICE) {
    const values = sql.join(
      changes
        .slice(start, start + WRITE_SLICE)
        .map((change) => sql`(${change.id}, ${change.eventProgramId}::text)`),
      sql`, `,
    );
    const result = await db.execute(sql`
      update players as p
      set event_program_id = v.event_program_id
      from (values ${values}) as v(id, event_program_id)
      where p.id = v.id
    `);
    updated += result.rowCount ?? 0;
  }
  console.log(`cards=${rows.length} changed=${changes.length} updated=${updated}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
