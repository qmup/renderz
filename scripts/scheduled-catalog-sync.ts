/**
 * Keep the Aurora catalog aligned with RenderZ, then upload card art to S3.
 *
 *   npx tsx scripts/scheduled-catalog-sync.ts
 *
 * Order, so a new event is not stuck behind the image heal or the base-card backlog:
 *   1. Sitemap head (brand-new ids, including a new event).
 *   2. Refresh promo cards added in the last 14 days (OVR, price, traits,
 *      playstyles, colors, art). Base gold/silver are not in this slice.
 *   3. Search every kept program, plus any new program id already stored.
 *   4. Missing base gold/silver, 1,500 per run.
 *   5. Upload images still missing for players fetched in the last 3 days.
 *
 * A Cloudflare 403 on the sitemap stops the run immediately. That block is
 * the plaintext body "Unauthorised", not an expired image signature.
 *
 * One run stops at CATALOG_SYNC_BUDGET_MS so the next schedule can continue.
 * Requires AURORA_HOST and AWS credentials that can write s3://$S3_BUCKET.
 */
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { and, eq, gte, inArray, isNull, lt, notInArray, or, sql } from "drizzle-orm";
import { auroraConfigFromEnv } from "../src/db/aurora-config";
import { ensurePlayerColorColumns } from "../src/db/player-columns";
import { getPostgresDb } from "../src/db/postgres";
import { ingestJobs, playerAssets, players } from "../src/db/postgres-schema";
import {
  BASE_CARD_SYNC_LIMIT,
  BASE_PROGRAM_GOLD,
  BASE_PROGRAM_SILVER,
  enqueueBaseCardDiscoveries,
} from "../src/lib/catalog/base-cards";
import {
  isPlayerCardImageKind,
  isPlayerLoopImageKind,
  playerImageKindSchema,
} from "../src/lib/domain/player";
import { enrichDiscoveredPlayer } from "../src/lib/catalog/enrichment";
import type { IngestJobKind } from "../src/lib/catalog/repository";
import {
  catalogProgramLogoSlugs,
  programLogoSlug,
  programLogoUpstreamUrl,
} from "../src/lib/catalog/programs";
import {
  programIdsToSync,
  RECENT_REFRESH_LIMIT,
  RECENT_REFRESH_MS,
  selectRecentRefreshIds,
} from "../src/lib/catalog/sync-plan";
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
import {
  isExpiredImageError,
  isUpstreamBlockedError,
} from "../src/lib/providers/renderz/image-errors";
import { fetchAllowlistedImage } from "../src/lib/providers/renderz/image-proxy";
import { getRenderzSource } from "../src/lib/providers/renderz/renderz-source";

const IMAGE_CONCURRENCY = 4;
const CACHE_CONTROL = "public, max-age=31536000, immutable";
const DB_ATTEMPTS = 3;
const DEFAULT_SYNC_BUDGET_MS = 165 * 60 * 1000;
const INGEST_SLICE = 15;
const IMAGE_HEAL_MS = 3 * 24 * 60 * 60 * 1000;
const PROGRAM_LOGO_LIMIT = 20;

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
  kind: IngestJobKind = "discovery",
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
      kind,
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

async function clearOpenJobs(kind: IngestJobKind): Promise<number> {
  const db = getPostgresDb();
  const cleared = await db
    .delete(ingestJobs)
    .where(
      and(
        eq(ingestJobs.kind, kind),
        inArray(ingestJobs.status, ["pending", "in_progress"]),
      ),
    );
  return cleared.rowCount ?? 0;
}

async function storedProgramIds(): Promise<string[]> {
  const db = getPostgresDb();
  const rows = await db.execute<{ programId: string }>(sql`
    SELECT program_id AS "programId"
    FROM players
    WHERE program_id IS NOT NULL AND program_id <> ''
    GROUP BY program_id
    ORDER BY max(added_at) DESC NULLS LAST
  `);
  return rows.rows.map((row) => row.programId);
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
    const programIds = programIdsToSync(await storedProgramIds());
    const extras = programIds.length - programIdsToSync([]).length;
    console.log(`programs=${programIds.length} newEvents=${extras}`);
    const existingRows = await db.select({ id: players.id }).from(players);
    const existing = new Set(existingRows.map((row) => row.id));
    console.log(`known players=${existing.size}`);
    const pending: Array<{ id: string; slug: string }> = [];
    for (const programId of programIds) {
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

async function refreshRecentPlayers(
  startedAt: number,
  deadline: number,
  afterSlice?: (since: number) => Promise<void>,
): Promise<{ succeeded: number; failed: number; idle: boolean }> {
  if (Date.now() >= deadline) {
    return { succeeded: 0, failed: 0, idle: false };
  }
  const catalog = getPlayerCatalog();
  return withDbRetry("recent refresh", async () => {
    const db = getPostgresDb();
    const cutoff = startedAt - RECENT_REFRESH_MS;
    const rows = await db
      .select({
        id: players.id,
        slug: players.slug,
        addedAt: players.addedAt,
        fetchedAt: players.fetchedAt,
        programId: players.programId,
      })
      .from(players)
      .where(
        and(
          gte(players.addedAt, cutoff),
          lt(players.fetchedAt, startedAt),
          or(
            isNull(players.programId),
            notInArray(players.programId, [BASE_PROGRAM_GOLD, BASE_PROGRAM_SILVER]),
          ),
        ),
      );
    const pending = selectRecentRefreshIds(
      rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        addedAt: row.addedAt ?? undefined,
        fetchedAt: row.fetchedAt,
        programId: row.programId ?? undefined,
      })),
      startedAt,
    );
    console.log(
      `recent refresh candidates=${rows.length} queued=${pending.length} limit=${RECENT_REFRESH_LIMIT}`,
    );
    if (pending.length === 0) {
      return { succeeded: 0, failed: 0, idle: true };
    }
    const cleared = await clearOpenJobs("refresh");
    console.log(`recent refresh clearedPending=${cleared}`);
    for (const [index, entry] of pending.entries()) {
      await catalog.enqueueRefresh(entry.id, entry.slug, startedAt + index);
    }
    return ingestQueuedPlayers(deadline, "recent refresh", afterSlice, "refresh");
  });
}

function programLogoSlugsToUpload(programIds: readonly string[]): string[] {
  const slugs = new Set(catalogProgramLogoSlugs());
  for (const id of programIds) {
    const slug = programLogoSlug(id);
    if (slug) {
      slugs.add(slug);
    }
  }
  return [...slugs];
}

async function uploadMissingProgramLogos(
  programIds: readonly string[],
  bucket: string,
  region: string,
): Promise<void> {
  const slugs = programLogoSlugsToUpload(programIds);
  if (slugs.length === 0) {
    return;
  }
  const client = new S3Client({ region });
  let uploaded = 0;
  for (const slug of slugs) {
    if (uploaded >= PROGRAM_LOGO_LIMIT) {
      break;
    }
    const key = `program-logos/${slug}.png`;
    try {
      if (await objectExists(client, bucket, key)) {
        continue;
      }
      const image = await fetchAllowlistedImage(programLogoUpstreamUrl(slug));
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: image.bytes,
          ContentType: image.contentType || "image/png",
          CacheControl: CACHE_CONTROL,
        }),
      );
      uploaded += 1;
      console.log(`uploaded ${key}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`program logo failed ${key} ${message}`);
    }
  }
}

async function loadUploadCandidates(
  startedAt: number,
  replacePlayerArt: boolean,
): Promise<CatalogUploadCandidate[]> {
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
    ...fresh.map((row) => ({
      ...row,
      required: true,
      replace:
        replacePlayerArt &&
        (isPlayerCardImageKind(row.kind) || isPlayerLoopImageKind(row.kind)),
    })),
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

const refreshedPlayers = new Map<string, Promise<void>>();

function refreshPlayerAssets(playerId: string): Promise<void> {
  const existing = refreshedPlayers.get(playerId);
  if (existing) {
    return existing;
  }
  const pending = enrichDiscoveredPlayer(
    getPlayerCatalog(),
    getRenderzSource(),
    playerId,
  ).then(() => undefined);
  refreshedPlayers.set(playerId, pending);
  return pending;
}

async function fetchJobImage(
  job: CatalogUploadJob,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  try {
    return await fetchAllowlistedImage(job.upstreamUrl);
  } catch (error) {
    if (!isExpiredImageError(error)) {
      throw error;
    }
    const kind = playerImageKindSchema.safeParse(job.kind);
    if (!kind.success) {
      throw error;
    }
    try {
      await refreshPlayerAssets(job.playerId);
    } catch (refreshError) {
      console.error(
        `image refresh failed ${job.playerId} ${describeError(refreshError)}`,
      );
      throw error;
    }
    const asset = await getPlayerCatalog().getAsset(job.playerId, kind.data);
    if (!asset || asset.upstreamUrl === job.upstreamUrl) {
      throw error;
    }
    return fetchAllowlistedImage(asset.upstreamUrl);
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
  let blocked = 0;
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
        if (!job.replace && (await objectExists(client, bucket, job.key))) {
          present += 1;
        } else {
          const image = await fetchJobImage(job);
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
        const message = error instanceof Error ? error.message : String(error);
        if (isUpstreamBlockedError(error)) {
          blocked += 1;
          console.error(`image blocked required=${job.required} ${job.key} ${message}`);
        } else {
          failed += 1;
          if (job.required) {
            requiredFailed += 1;
          }
          const expired = isExpiredImageError(error) ? " expired-signature" : "";
          console.error(`image failed${expired} required=${job.required} ${job.key} ${message}`);
        }
      }
      done += 1;
      if (done % 50 === 0 || done === jobs.length) {
        console.log(
          `images ${done}/${jobs.length} uploaded=${uploaded} present=${present} failed=${failed} blocked=${blocked}`,
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
  replacePlayerArt = false,
): Promise<{ uploaded: number; requiredFailed: number }> {
  const candidates = await loadUploadCandidates(since, replacePlayerArt);
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
  await ensurePlayerColorColumns(getPostgresDb());
  const cleared = await clearOpenJobs("discovery");
  console.log(`clearedPendingDiscovery=${cleared}`);

  const uploadTotals = { uploaded: 0, requiredFailed: 0 };
  const uploadSlice = (replacePlayerArt: boolean) => async (since: number) => {
    const images = await uploadFetchedSince(since, bucket, region, replacePlayerArt);
    uploadTotals.uploaded += images.uploaded;
    uploadTotals.requiredFailed += images.requiredFailed;
  };

  const head = await discoverSitemapHead(startedAt, deadline, uploadSlice(false));
  const refreshed = head.idle
    ? await refreshRecentPlayers(startedAt, deadline, uploadSlice(true))
    : { succeeded: 0, failed: 0, idle: false };
  const selected =
    head.idle && refreshed.idle
      ? await discoverSelectedPrograms(startedAt, deadline, uploadSlice(false))
      : { succeeded: 0, failed: 0, idle: false };
  if (head.idle && refreshed.idle) {
    await uploadMissingProgramLogos(
      programIdsToSync(await storedProgramIds()),
      bucket,
      region,
    );
  }
  const baseCards =
    head.idle && refreshed.idle && selected.idle
      ? await discoverBaseCards(startedAt, deadline, uploadSlice(false))
      : { succeeded: 0, failed: 0, idle: false };

  if (Date.now() < deadline) {
    const healed = await uploadFetchedSince(startedAt - IMAGE_HEAL_MS, bucket, region);
    uploadTotals.uploaded += healed.uploaded;
    uploadTotals.requiredFailed += healed.requiredFailed;
  }

  const playersAdded = head.succeeded + refreshed.succeeded + selected.succeeded + baseCards.succeeded;
  const playerFailures = head.failed + refreshed.failed + selected.failed + baseCards.failed;
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
