import { Signer } from "@aws-sdk/rds-signer";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { auroraConfigFromEnv } from "@/db/aurora-config";
import * as schema from "@/db/postgres-schema";

export type AuroraDatabase = NodePgDatabase<typeof schema>;

pg.types.setTypeParser(20, (value) => Number(value));

const globalForAurora = globalThis as typeof globalThis & {
  __auroraPool?: pg.Pool;
};

export function getPostgresDb(): AuroraDatabase {
  const config = auroraConfigFromEnv();
  if (!config) {
    throw new Error("AURORA_HOST is not set");
  }
  if (!globalForAurora.__auroraPool) {
    const pool = new pg.Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      database: config.database,
      // One connection per function instance. Aurora at 1 ACU has a small
      // max_connections, and a frozen Vercel isolate will not run the pool
      // idle timer, so the session timeout below is what releases the slot.
      max: 1,
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 45_000,
      allowExitOnIdle: true,
      // Applied in the startup packet. A SET query on "connect" races the
      // first real query when the pool has a single client.
      options: "-c idle_session_timeout=15000",
      ssl: { rejectUnauthorized: false },
      password: async () => {
        const signer = new Signer({
          hostname: config.host,
          port: config.port,
          username: config.user,
          region: config.region,
        });
        return signer.getAuthToken();
      },
    });
    pool.on("error", (error) => {
      if (error.message.includes("idle-session timeout")) {
        return;
      }
      console.error("Aurora pool error", error.message);
    });
    globalForAurora.__auroraPool = pool;
  }
  return drizzle(globalForAurora.__auroraPool, { schema });
}
