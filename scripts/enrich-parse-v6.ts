/**
 * Enqueue + run parse-version refreshes until the catalog is on CURRENT_PARSE_VERSION
 * (includes LOOP animation assets). Does not re-crawl the sitemap.
 *
 *   npx tsx scripts/enrich-parse-v6.ts
 *   npx tsx scripts/enrich-parse-v6.ts --limit 25
 *   npm run catalog:enrich-v6   # wraps with macOS caffeinate -dims (screen stays on)
 */
import { getPlayerCatalog } from '../src/lib/catalog/runtime';
import { runIngestBatch } from '../src/lib/ingest/runner';
import { enqueueStaleRefreshes } from '../src/lib/ingest/queue';
import { getRenderzSource } from '../src/lib/providers/renderz/renderz-source';
import { CURRENT_PARSE_VERSION } from '../src/lib/catalog/parse-version';

function argNumber(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index < 0) {
    return fallback;
  }
  const parsed = Number(process.argv[index + 1]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main() {
  const batchLimit = argNumber('--limit', 25);
  const catalog = getPlayerCatalog();
  const source = getRenderzSource();

  // ttlMs=0 so every row below CURRENT_PARSE_VERSION is queued regardless of fetchedAt.
  const queued = await enqueueStaleRefreshes(catalog, Date.now(), 0);
  console.log(
    `queued refreshJobs=${queued} targetParseVersion=${CURRENT_PARSE_VERSION}`,
  );

  const totals = {
    processed: 0,
    succeeded: 0,
    skipped: 0,
    retried: 0,
    failed: 0,
  };

  while (true) {
    const result = await runIngestBatch(catalog, source, {
      limit: batchLimit,
      consecutiveOldStop: 0,
      onProgress: (message) => console.log(message),
    });
    totals.processed += result.processed;
    totals.succeeded += result.succeeded;
    totals.skipped += result.skipped;
    totals.retried += result.retried;
    totals.failed += result.failed;
    console.log(
      `batch processed=${result.processed} succeeded=${result.succeeded} failed=${result.failed} totalSucceeded=${totals.succeeded}`,
    );
    if (result.processed === 0) {
      break;
    }
  }

  console.log(
    `done processed=${totals.processed} succeeded=${totals.succeeded} skipped=${totals.skipped} retried=${totals.retried} failed=${totals.failed}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
