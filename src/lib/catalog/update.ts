import type { PlayerCatalog } from "@/lib/catalog/repository";
import {
  idleCatalogUpdateStatus,
  type CatalogUpdateStatus,
} from "@/lib/catalog/update-status";
import { enqueueSitemapDiscoveries } from "@/lib/ingest/queue";
import { runIngestBatch } from "@/lib/ingest/runner";
import type { PlayerDataSource } from "@/lib/providers/types";

export const CATALOG_UPDATE_BATCH = 10;

const globalForUpdate = globalThis as typeof globalThis & {
  __catalogUpdate?: {
    status: CatalogUpdateStatus;
    running: Promise<void> | null;
  };
};

function store() {
  if (!globalForUpdate.__catalogUpdate) {
    globalForUpdate.__catalogUpdate = {
      status: { ...idleCatalogUpdateStatus },
      running: null,
    };
  }
  return globalForUpdate.__catalogUpdate;
}

export function getCatalogUpdateStatus(): CatalogUpdateStatus {
  return { ...store().status };
}

function patch(partial: Partial<CatalogUpdateStatus>): void {
  const current = store();
  current.status = { ...current.status, ...partial };
}

async function countOpenDiscoveries(catalog: PlayerCatalog): Promise<number> {
  return catalog.countOpenIngestJobs("discovery");
}

export async function runCatalogUpdate(
  catalog: PlayerCatalog,
  source: PlayerDataSource,
  now = Date.now(),
): Promise<CatalogUpdateStatus> {
  patch({
    ...idleCatalogUpdateStatus,
    running: true,
    phase: "syncing",
    message: "Reading sitemap for new player ids",
    error: undefined,
  });

  const entries = await source.listSitemapEntries();
  const discovered = await enqueueSitemapDiscoveries(catalog, entries, now);
  const remaining = await countOpenDiscoveries(catalog);
  patch({
    discovered,
    remaining,
    total: remaining,
    phase: remaining > 0 ? "ingesting" : "done",
    running: remaining > 0,
    message:
      remaining > 0
        ? `Adding 0/${discovered}`
        : "No new players",
  });

  while (store().status.phase === "ingesting") {
    const batch = await runIngestBatch(catalog, source, {
      limit: CATALOG_UPDATE_BATCH,
      now: Date.now(),
      consecutiveOldStop: 0,
      kind: "discovery",
    });
    const open = await countOpenDiscoveries(catalog);
    const processed = store().status.processed + batch.processed;
    const succeeded = store().status.succeeded + batch.succeeded;
    const skipped = store().status.skipped + batch.skipped;
    const failed = store().status.failed + batch.failed;
    const retried = store().status.retried + batch.retried;
    const total = Math.max(store().status.total, processed + open);
    patch({
      processed,
      succeeded,
      skipped,
      failed,
      retried,
      remaining: open,
      total,
      message: open > 0 ? `Adding ${succeeded}/${total}` : undefined,
    });
    if (batch.processed === 0) {
      break;
    }
  }

  const open = await countOpenDiscoveries(catalog);
  const failed = store().status.failed;
  const succeeded = store().status.succeeded;
  const alreadyIdle = store().status.phase === "done";
  patch({
    running: false,
    remaining: open,
    phase: failed > 0 && succeeded === 0 ? "error" : "done",
    message: alreadyIdle
      ? store().status.message
      : failed > 0
        ? "Finished with some failed fetches"
        : succeeded > 0
          ? `Added ${succeeded} new player${succeeded === 1 ? "" : "s"}`
          : "No new players",
  });
  return getCatalogUpdateStatus();
}

export function startCatalogUpdate(
  catalog: PlayerCatalog,
  source: PlayerDataSource,
): boolean {
  const current = store();
  if (current.status.running || current.running) {
    return false;
  }
  patch({
    ...idleCatalogUpdateStatus,
    running: true,
    phase: "syncing",
    message: "Starting catalog update",
  });
  current.running = runCatalogUpdate(catalog, source)
    .then(() => undefined)
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      patch({
        running: false,
        phase: "error",
        error: message,
        message: "Catalog update failed",
      });
    })
    .finally(() => {
      store().running = null;
    });
  return true;
}

export function waitForCatalogUpdate(): Promise<void> {
  return store().running ?? Promise.resolve();
}

export function resetCatalogUpdateForTests(): void {
  store().status = { ...idleCatalogUpdateStatus };
  store().running = null;
}
