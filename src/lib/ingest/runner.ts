import { isKnownOldPlayer, SKIP_REASON_TOO_OLD } from "@/lib/catalog/eligibility";
import { computeBackoffMs, loadUpstreamLimiterConfig } from "@/lib/http/upstream";
import {
  RateLimitedError,
  UpstreamHttpError,
  UpstreamTimeoutError,
} from "@/lib/http/errors";
import type { IngestJobKind, PlayerCatalog } from "@/lib/catalog/repository";
import type { PlayerDataSource } from "@/lib/providers/types";
import {
  enqueueSitemapDiscoveries,
  enqueueStaleRefreshes,
  INGEST_LEASE_MS,
} from "@/lib/ingest/queue";

export const DEFAULT_INGEST_BATCH = 10;
export const MAX_JOB_ATTEMPTS = 5;
export const DEFAULT_REFRESH_TTL_MS = 24 * 60 * 60 * 1000;
/** Sitemap is newest-first. After this many old discovery cards in a row, skip the rest. */
export const CONSECUTIVE_OLD_DISCOVERY_STOP = 3;

export type IngestSyncResult = {
  sitemapEntries: number;
  discovered: number;
  refreshes: number;
};

export type IngestRunResult = {
  processed: number;
  succeeded: number;
  failed: number;
  retried: number;
  skipped: number;
};

function isRetryable(error: unknown): boolean {
  return (
    error instanceof RateLimitedError ||
    error instanceof UpstreamTimeoutError ||
    (error instanceof UpstreamHttpError && error.upstreamStatus >= 500)
  );
}

async function upsertFromSource(
  catalog: PlayerCatalog,
  source: PlayerDataSource,
  id: string,
  slug?: string,
  now = Date.now(),
): Promise<"kept" | "skipped"> {
  const { player, assets } = await source.getPlayer(id, slug);
  if (isKnownOldPlayer(player, now)) {
    await catalog.deletePlayer(player.id);
    await catalog.recordSkipped(player.id, player.slug, SKIP_REASON_TOO_OLD, now);
    return "skipped";
  }
  await catalog.upsertPlayer(player, assets);
  return "kept";
}

export async function syncIngestQueue(
  catalog: PlayerCatalog,
  source: PlayerDataSource,
  options: { now?: number; ttlMs?: number } = {},
): Promise<IngestSyncResult> {
  const entries = await source.listSitemapEntries();
  const discovered = await enqueueSitemapDiscoveries(
    catalog,
    entries,
    options.now,
  );
  const refreshes = await enqueueStaleRefreshes(
    catalog,
    options.now ?? Date.now(),
    options.ttlMs ?? DEFAULT_REFRESH_TTL_MS,
  );
  return {
    sitemapEntries: entries.length,
    discovered,
    refreshes,
  };
}

export async function runIngestBatch(
  catalog: PlayerCatalog,
  source: PlayerDataSource,
  options: {
    limit?: number;
    now?: number;
    leaseMs?: number;
    consecutiveOldStop?: number;
    kind?: IngestJobKind;
    onProgress?: (message: string) => void;
  } = {},
): Promise<IngestRunResult> {
  const now = options.now ?? Date.now();
  const consecutiveOldStop =
    options.consecutiveOldStop ?? CONSECUTIVE_OLD_DISCOVERY_STOP;
  const jobs = await catalog.claimNext(
    options.limit ?? DEFAULT_INGEST_BATCH,
    now,
    options.leaseMs ?? INGEST_LEASE_MS,
    options.kind,
  );
  const config = loadUpstreamLimiterConfig();
  let succeeded = 0;
  let failed = 0;
  let retried = 0;
  let skipped = 0;
  let consecutiveOldDiscoveries = 0;
  let stopDiscoveries = false;

  for (const job of jobs) {
    if (stopDiscoveries && job.kind === "discovery") {
      await catalog.recordSkipped(
        job.playerId,
        job.slug,
        SKIP_REASON_TOO_OLD,
        now,
      );
      await catalog.markSucceeded(job.id, now);
      skipped += 1;
      options.onProgress?.(`skipped queued ${job.kind} ${job.playerId}`);
      continue;
    }
    try {
      const outcome = await upsertFromSource(
        catalog,
        source,
        job.playerId,
        job.slug,
        now,
      );
      if (outcome === "skipped") {
        await catalog.markSucceeded(job.id, now);
        skipped += 1;
        options.onProgress?.(`skipped old ${job.kind} ${job.playerId}`);
        if (job.kind === "discovery") {
          consecutiveOldDiscoveries += 1;
          if (
            consecutiveOldStop > 0 &&
            consecutiveOldDiscoveries >= consecutiveOldStop
          ) {
            stopDiscoveries = true;
            const drained = await catalog.skipOpenDiscoveryJobs(
              SKIP_REASON_TOO_OLD,
              job.createdAt,
              now,
            );
            skipped += drained;
            options.onProgress?.(
              `stopped discovery after ${consecutiveOldDiscoveries} consecutive old cards; skipped ${drained} queued jobs`,
            );
          }
        }
        continue;
      }
      if (job.kind === "discovery") {
        consecutiveOldDiscoveries = 0;
      }
      await catalog.markSucceeded(job.id, now);
      succeeded += 1;
      options.onProgress?.(`succeeded ${job.kind} ${job.playerId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        isRetryable(error) &&
        job.attempts < MAX_JOB_ATTEMPTS
      ) {
        const retryAfter =
          error instanceof RateLimitedError ? error.retryAfterMs : undefined;
        const delay = computeBackoffMs(job.attempts - 1, config, retryAfter);
        await catalog.markRetry(job.id, message, now + delay, now);
        retried += 1;
        options.onProgress?.(`retry ${job.playerId}: ${message}`);
        continue;
      }
      await catalog.markFailed(job.id, message, now, now);
      failed += 1;
      options.onProgress?.(`failed ${job.playerId}: ${message}`);
    }
  }

  return { processed: jobs.length, succeeded, failed, retried, skipped };
}
