/**
 * Discover new players into Aurora, then upload missing card art, LOOP sheets,
 * playstyles, and traits to S3.
 *
 *   npx tsx scripts/scheduled-catalog-sync.ts
 *
 * Requires AURORA_HOST and AWS credentials that can connect to Aurora and write
 * s3://$S3_BUCKET (default renderz-bucket). Stops discovery after 3 consecutive
 * cards older than 3 months.
 */
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { auroraConfigFromEnv } from "../src/db/aurora-config";
import { getPostgresDb } from "../src/db/postgres";
import { ingestJobs, playerAssets, players } from "../src/db/postgres-schema";
import {
  planCatalogUploads,
  type CatalogUploadCandidate,
  type CatalogUploadJob,
} from "../src/lib/catalog/object-keys";
import { getPlayerCatalog } from "../src/lib/catalog/runtime";
import { runIngestBatch } from "../src/lib/ingest/runner";
import { isExpiredImageError } from "../src/lib/providers/renderz/image-errors";
import { fetchAllowlistedImage } from "../src/lib/providers/renderz/image-proxy";
import { getRenderzSource } from "../src/lib/providers/renderz/renderz-source";

const IMAGE_CONCURRENCY = 4;
const CACHE_CONTROL = "public, max-age=31536000, immutable";
const DB_ATTEMPTS = 3;

function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const cause = (error as { cause?: unknown }).cause;
  return cause instanceof Error ? `${error.message} (${cause.message})` : error.message;
}

async function withDbRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= DB_ATTEMPTS; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      console.error(`${label} attempt ${attempt} failed ${describeError(error)}`);
      if (attempt === DB_ATTEMPTS) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 20_000));
    }
  }
  throw last;
}

type AssetRow = {
  playerId: string;
  kind: string;
  upstreamUrl: string;
  fetchedAt: number;
};

async function discoverNewPlayers(startedAt: number): Promise<{
  succeeded: number;
  failed: number;
}> {
  const catalog = getPlayerCatalog();
  const source = getRenderzSource();
  console.log("reading sitemap");
  const entries = await source.listSitemapEntries();
  console.log(`sitemap=${entries.length}`);
  return withDbRetry("discovery", async () => {
    const db = getPostgresDb();
    const cleared = await db
      .delete(ingestJobs)
      .where(
        and(
          eq(ingestJobs.kind, "discovery"),
          inArray(ingestJobs.status, ["pending", "in_progress"]),
        ),
      );
    const existingRows = await db.select({ id: players.id }).from(players);
    const skippedRows = await db
      .select({ playerId: ingestJobs.playerId })
      .from(ingestJobs)
      .where(eq(ingestJobs.status, "skipped"));
    const existing = new Set(existingRows.map((row) => row.id));
    const skipped = new Set(skippedRows.map((row) => row.playerId));
    console.log(
      `known players=${existing.size} skipped=${skipped.size} clearedPending=${cleared.rowCount ?? 0}`,
    );

    const totals = { succeeded: 0, failed: 0 };
    let consecutiveOld = 0;
    let scanned = 0;
    for (const entry of entries) {
      scanned += 1;
      if (existing.has(entry.id)) {
        consecutiveOld = 0;
        if (scanned % 2000 === 0) {
          console.log(`scan ${scanned}/${entries.length} still in catalog`);
        }
        continue;
      }
      if (skipped.has(entry.id)) {
        consecutiveOld += 1;
        if (consecutiveOld >= 3) {
          console.log(`stopped after ${consecutiveOld} known-old cards at ${entry.id}`);
          break;
        }
        continue;
      }

      await catalog.enqueueDiscovery(entry.id, entry.slug, startedAt + scanned);
      let outcome: "new" | "old" | "other" = "other";
      const batch = await runIngestBatch(catalog, source, {
        limit: 1,
        consecutiveOldStop: 0,
        kind: "discovery",
        onProgress: (message) => {
          console.log(message);
          if (message.startsWith("skipped old")) outcome = "old";
          else if (message.startsWith("succeeded")) outcome = "new";
        },
      });
      totals.succeeded += batch.succeeded;
      totals.failed += batch.failed;
      if (outcome === "new") {
        existing.add(entry.id);
        consecutiveOld = 0;
      } else if (outcome === "old") {
        skipped.add(entry.id);
        consecutiveOld += 1;
        if (consecutiveOld >= 3) {
          console.log(`stopped after ${consecutiveOld} old cards at ${entry.id}`);
          break;
        }
      }
      if (scanned % 250 === 0) {
        console.log(`scan ${scanned}/${entries.length} consecutiveOld=${consecutiveOld}`);
      }
    }
    console.log(
      `discovery scanned=${scanned}/${entries.length} players=${totals.succeeded} failures=${totals.failed}`,
    );
    return totals;
  });
}

async function loadUploadCandidates(startedAt: number): Promise<CatalogUploadCandidate[]> {
  const db = getPostgresDb();
  const fresh = await db
    .select({
      playerId: playerAssets.playerId,
      kind: playerAssets.kind,
      upstreamUrl: playerAssets.upstreamUrl,
      fetchedAt: playerAssets.fetchedAt,
    })
    .from(playerAssets)
    .innerJoin(players, eq(players.id, playerAssets.playerId))
    .where(gte(players.fetchedAt, startedAt));

  const icons = await db.execute<AssetRow>(sql`
    SELECT DISTINCT ON (kind)
      player_id AS "playerId",
      kind,
      upstream_url AS "upstreamUrl",
      fetched_at AS "fetchedAt"
    FROM player_assets
    WHERE kind LIKE 'playstyle%'
       OR kind LIKE 'trait%'
       OR kind IN ('untradeable', 'star-shard')
    ORDER BY kind, fetched_at DESC
  `);

  return [
    ...fresh.map((row) => ({ ...row, required: true })),
    ...icons.rows.map((row) => ({
      playerId: row.playerId,
      kind: row.kind,
      upstreamUrl: row.upstreamUrl,
      fetchedAt: Number(row.fetchedAt),
      required: false,
    })),
  ];
}

async function objectExists(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    const name = error instanceof Error ? error.name : "";
    if (status === 404 || name === "NotFound" || name === "NoSuchKey") {
      return false;
    }
    throw error;
  }
}

async function uploadMissing(
  client: S3Client,
  bucket: string,
  jobs: CatalogUploadJob[],
): Promise<{ uploaded: number; present: number; failed: number; requiredFailed: number }> {
  let uploaded = 0;
  let present = 0;
  let failed = 0;
  let requiredFailed = 0;
  let cursor = 0;
  let done = 0;

  async function worker() {
    while (cursor < jobs.length) {
      const index = cursor;
      cursor += 1;
      const job = jobs[index];
      if (!job) {
        continue;
      }
      try {
        if (await objectExists(client, bucket, job.key)) {
          present += 1;
        } else {
          const image = await fetchAllowlistedImage(job.upstreamUrl);
          await client.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: job.key,
              Body: image.bytes,
              ContentType: image.contentType || "image/png",
              CacheControl: CACHE_CONTROL,
            }),
          );
          uploaded += 1;
          console.log(`uploaded ${job.key}`);
        }
      } catch (error) {
        failed += 1;
        if (job.required) {
          requiredFailed += 1;
        }
        const message = error instanceof Error ? error.message : String(error);
        const expired = isExpiredImageError(error) ? " expired-signature" : "";
        console.error(`image failed${expired} required=${job.required} ${job.key} ${message}`);
      }
      done += 1;
      if (done % 50 === 0 || done === jobs.length) {
        console.log(
          `images ${done}/${jobs.length} uploaded=${uploaded} present=${present} failed=${failed}`,
        );
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(IMAGE_CONCURRENCY, jobs.length) }, () => worker()),
  );
  return { uploaded, present, failed, requiredFailed };
}

async function main() {
  if (!auroraConfigFromEnv()) {
    throw new Error("AURORA_HOST is required");
  }
  const bucket = process.env.S3_BUCKET?.trim() || "renderz-bucket";
  const region = process.env.AWS_REGION?.trim() || "ap-southeast-1";
  const startedAt = Date.now();
  console.log(`catalog sync start bucket=${bucket}`);

  const discovery = await discoverNewPlayers(startedAt);
  const candidates = await loadUploadCandidates(startedAt);
  const jobs = planCatalogUploads(candidates);
  console.log(`upload candidates=${candidates.length} objects=${jobs.length}`);

  const images = await uploadMissing(new S3Client({ region }), bucket, jobs);
  console.log(
    `catalog sync done players=${discovery.succeeded} playerFailures=${discovery.failed} uploaded=${images.uploaded} present=${images.present} imageFailures=${images.failed}`,
  );
  if (
    (discovery.failed > 0 && discovery.succeeded === 0) ||
    images.requiredFailed > 0
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(describeError(error));
  process.exit(1);
});
