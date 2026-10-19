/**
 * Discover new players into Aurora, then upload missing card art, LOOP sheets,
 * playstyles, and traits to S3.
 *
 *   npx tsx scripts/scheduled-catalog-sync.ts
 *
 * Requires AURORA_HOST and AWS credentials that can connect to Aurora and write
 * s3://$S3_BUCKET (default renderz-bucket). Adds missing cards from the selected
 * programs and new sitemap ids. Older cards stay. One run stops at
 * CATALOG_SYNC_BUDGET_MS so the next GitHub Actions schedule can continue.
 */
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { listThumbObjectKey } from "../src/lib/images";
import { backfillMissingListThumbs, ensureListThumb } from "./list-thumb-s3";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { auroraConfigFromEnv } from "../src/db/aurora-config";
import { getPostgresDb } from "../src/db/postgres";
import { ingestJobs, playerAssets, players } from "../src/db/postgres-schema";
import {
  BASE_CARD_SYNC_LIMIT,
  enqueueBaseCardDiscoveries,
} from "../src/lib/catalog/base-cards";
import { SYNC_KEEP_PROGRAM_IDS } from "../src/lib/catalog/sync-programs";
import { takeSitemapHead } from "../src/lib/ingest/sitemap-head";
import {
  planCatalogUploads,
  type CatalogUploadCandidate,
  type CatalogUploadJob,
} from "../src/lib/catalog/object-keys";
import { getPlayerCatalog } from "../src/lib/catalog/runtime";
import { runIngestBatch } from "../src/lib/ingest/runner";
import {
  listBaseCardEntries,
  listSourceCardEntries,
} from "../src/lib/providers/renderz/base-card-search";
import { RenderzClient } from "../src/lib/providers/renderz/client";
import { isExpiredImageError } from "../src/lib/providers/renderz/image-errors";
import { fetchAllowlistedImage } from "../src/lib/providers/renderz/image-proxy";
import { getRenderzSource } from "../src/lib/providers/renderz/renderz-source";

const IMAGE_CONCURRENCY = 4;
const CACHE_CONTROL = "public, max-age=31536000, immutable";
const DB_ATTEMPTS = 3;
const DEFAULT_SYNC_BUDGET_MS = 165 * 60 * 1000;
const INGEST_SLICE = 15;
const IMAGE_HEAL_MS = 3 * 24 * 60 * 60 * 1000;

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

function syncDeadline(startedAt: number): number {
  const raw = Number(process.env.CATALOG_SYNC_BUDGET_MS);
  const budget = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_SYNC_BUDGET_MS;
  return startedAt + budget;
}

async function ingestQueuedPlayers(
  deadline: number,
  label: string,
  afterSlice?: (since: number) => Promise<void>,
): Promise<{ succeeded: number; failed: number; idle: boolean }> {
  const catalog = getPlayerCatalog();
  const source = getRenderzSource();
  const totals = { succeeded: 0, failed: 0, idle: false };
  let processed = 0;
  let sliceStart = Date.now();
  while (Date.now() < deadline) {
    const batch = await runIngestBatch(catalog, source, {
      limit: 1,
      consecutiveOldStop: 0,
      kind: "discovery",
      onProgress: (message) => console.log(message),
    });
    if (batch.processed === 0) {
      totals.idle = true;
      break;
    }
    totals.succeeded += batch.succeeded;
    totals.failed += batch.failed;
    processed += 1;
    if (processed % INGEST_SLICE === 0) {
      console.log(
        `${label} ${processed} players=${totals.succeeded} failures=${totals.failed}`,
      );
      await afterSlice?.(sliceStart);
      sliceStart = Date.now();
    }
  }
  await afterSlice?.(sliceStart);
  console.log(
    `${label} done players=${totals.succeeded} failures=${totals.failed} idle=${totals.idle}`,
  );
  return totals;
}

async function discoverSelectedPrograms(
  startedAt: number,
  deadline: number,
  afterSlice?: (since: number) => Promise<void>,
): Promise<{ succeeded: number; failed: number; idle: boolean }> {
  const catalog = getPlayerCatalog();
  const client = new RenderzClient();
  return withDbRetry("selected programs", async () => {
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
    const existing = new Set(existingRows.map((row) => row.id));
    console.log(
      `known players=${existing.size} clearedPending=${cleared.rowCount ?? 0}`,
    );
    const pending: Array<{ id: string; slug: string }> = [];
    for (const programId of SYNC_KEEP_PROGRAM_IDS) {
      if (Date.now() >= deadline) {
        break;
      }
      const listed = await listSourceCardEntries(programId, client);
      const missing = listed.filter((entry) => !existing.has(entry.id));
      pending.push(...missing);
      console.log(
        `program ${programId} listed=${listed.length} missing=${missing.length}`,
      );
    }
    console.log(`selected programs pending=${pending.length}`);
    if (pending.length === 0) {
      return { succeeded: 0, failed: 0, idle: true };
    }
    await enqueueBaseCardDiscoveries(catalog, pending, startedAt);
    return ingestQueuedPlayers(deadline, "selected programs", afterSlice);
  });
}

async function discoverSitemapHead(
  startedAt: number,
  deadline: number,
  afterSlice?: (since: number) => Promise<void>,
): Promise<{ succeeded: number; failed: number; idle: boolean }> {
  if (Date.now() >= deadline) {
    return { succeeded: 0, failed: 0, idle: false };
  }
  const catalog = getPlayerCatalog();
  const source = getRenderzSource();
  console.log("reading sitemap head");
  const entries = await source.listSitemapEntries();
  return withDbRetry("sitemap head", async () => {
    const db = getPostgresDb();
    const existingRows = await db.select({ id: players.id }).from(players);
    const skippedRows = await db
      .select({ playerId: ingestJobs.playerId })
      .from(ingestJobs)
      .where(eq(ingestJobs.status, "skipped"));
    const settled = new Set([
      ...existingRows.map((row) => row.id),
      ...skippedRows.map((row) => row.playerId),
    ]);
    const fresh = takeSitemapHead(entries, (id) => settled.has(id));
    console.log(`sitemap=${entries.length} head=${fresh.length}`);
    if (fresh.length === 0) {
      return { succeeded: 0, failed: 0, idle: true };
    }
    await enqueueBaseCardDiscoveries(catalog, fresh, startedAt);
    return ingestQueuedPlayers(deadline, "sitemap head", afterSlice);
  });
}

async function discoverBaseCards(
  startedAt: number,
  deadline: number,
  afterSlice?: (since: number) => Promise<void>,
): Promise<{ succeeded: number; failed: number; idle: boolean }> {
  const catalog = getPlayerCatalog();
  console.log("reading base gold and silver cards");
  const listed = await listBaseCardEntries();
  console.log(`base cards listed=${listed.length}`);
  return withDbRetry("base cards", async () => {
    const db = getPostgresDb();
    const existingRows = await db.select({ id: players.id }).from(players);
    const existing = new Set(existingRows.map((row) => row.id));
    const pending = listed
      .filter((entry) => !existing.has(entry.id))
      .slice(0, BASE_CARD_SYNC_LIMIT);
    console.log(`base cards pending=${pending.length} limit=${BASE_CARD_SYNC_LIMIT}`);
    if (pending.length === 0 || Date.now() >= deadline) {
      return { succeeded: 0, failed: 0, idle: pending.length === 0 };
    }
    await enqueueBaseCardDiscoveries(catalog, pending, startedAt);
    return ingestQueuedPlayers(deadline, "base cards", afterSlice);
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
        let pngBytes: Uint8Array | undefined;
        if (await objectExists(client, bucket, job.key)) {
          present += 1;
        } else {
          const image = await fetchAllowlistedImage(job.upstreamUrl);
          pngBytes = image.bytes;
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
        if (listThumbObjectKey(job.key)) {
          try {
            const thumb = await ensureListThumb(
              client,
              bucket,
              job.key,
              pngBytes,
            );
            if (thumb === "uploaded") {
              console.log(`uploaded ${listThumbObjectKey(job.key)}`);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`thumb failed ${job.key} ${message}`);
          }
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

async function uploadFetchedSince(
  since: number,
  bucket: string,
  region: string,
): Promise<{ uploaded: number; requiredFailed: number }> {
  const candidates = await loadUploadCandidates(since);
  const jobs = planCatalogUploads(candidates);
  console.log(`upload candidates=${candidates.length} objects=${jobs.length}`);
  if (jobs.length === 0) {
    return { uploaded: 0, requiredFailed: 0 };
  }
  const images = await uploadMissing(new S3Client({ region }), bucket, jobs);
  return { uploaded: images.uploaded, requiredFailed: images.requiredFailed };
}

async function main() {
  if (!auroraConfigFromEnv()) {
    throw new Error("AURORA_HOST is required");
  }
  const bucket = process.env.S3_BUCKET?.trim() || "renderz-bucket";
  const region = process.env.AWS_REGION?.trim() || "ap-southeast-1";
  const startedAt = Date.now();
  const deadline = syncDeadline(startedAt);
  console.log(`catalog sync start bucket=${bucket} budgetMs=${deadline - startedAt}`);

  try {
    const thumbs = await backfillMissingListThumbs(
      new S3Client({ region }),
      bucket,
    );
    console.log(
      `list thumb backfill uploaded=${thumbs.uploaded} present=${thumbs.present} failed=${thumbs.failed}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`list thumb backfill skipped ${message}`);
  }

  const uploadTotals = { uploaded: 0, requiredFailed: 0 };
  const uploadSlice = async (since: number) => {
    const images = await uploadFetchedSince(since, bucket, region);
    uploadTotals.uploaded += images.uploaded;
    uploadTotals.requiredFailed += images.requiredFailed;
  };

  const healed = await uploadFetchedSince(startedAt - IMAGE_HEAL_MS, bucket, region);
  uploadTotals.uploaded += healed.uploaded;
  uploadTotals.requiredFailed += healed.requiredFailed;

  const selected = await discoverSelectedPrograms(startedAt, deadline, uploadSlice);
  const head = selected.idle
    ? await discoverSitemapHead(startedAt, deadline, uploadSlice)
    : { succeeded: 0, failed: 0, idle: false };
  const baseCards =
    selected.idle && head.idle
      ? await discoverBaseCards(startedAt, deadline, uploadSlice)
      : { succeeded: 0, failed: 0, idle: false };

  const playersAdded = selected.succeeded + head.succeeded + baseCards.succeeded;
  const playerFailures = selected.failed + head.failed + baseCards.failed;
  console.log(
    `catalog sync done players=${playersAdded} playerFailures=${playerFailures} uploaded=${uploadTotals.uploaded} imageFailures=${uploadTotals.requiredFailed}`,
  );
  if ((playerFailures > 0 && playersAdded === 0) || uploadTotals.requiredFailed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(describeError(error));
  process.exit(1);
});
