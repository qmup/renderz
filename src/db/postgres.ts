import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { databaseUrlFromEnv } from "@/db/database-config";
import * as schema from "@/db/postgres-schema";

export type PostgresDatabase = NodePgDatabase<typeof schema>;

pg.types.setTypeParser(20, (value) => Number(value));

const globalForPostgres = globalThis as typeof globalThis & {
  __postgresPool?: pg.Pool;
};

export function getPostgresDb(): PostgresDatabase {
  if (!globalForPostgres.__postgresPool) {
    const connectionString = databaseUrlFromEnv();
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    const pool = new pg.Pool({
      connectionString,
      // One connection per function instance; the Neon pooler multiplexes them.
      max: 1,
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 45_000,
      allowExitOnIdle: true,
    });
    pool.on("error", (error) => {
      console.error("Postgres pool error", error.message);
    });
    globalForPostgres.__postgresPool = pool;
  }
  return drizzle(globalForPostgres.__postgresPool, { schema });
}
