/**
 * Sitemap discovery + stale refresh. Enqueue does not fetch player pages.
 * `run` claims a bounded batch and fetches at the shared ~1 req/s limiter.
 *
 *   npx tsx scripts/ingest.ts sync
 *   npx tsx scripts/ingest.ts run --limit 10
 *   npx tsx scripts/ingest.ts apply-cutoff --from-id 24036792
 */
import { SKIP_REASON_TOO_OLD } from "../src/lib/catalog/eligibility";
import { getPlayerCatalog } from "../src/lib/catalog/runtime";
import { runIngestBatch, syncIngestQueue } from "../src/lib/ingest/runner";
import { getRenderzSource } from "../src/lib/providers/renderz/renderz-source";

function argValue(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) {
    return fallback;
  }
  return process.argv[index + 1] ?? fallback;
}

function argNumber(name: string, fallback: number): number {
  const raw = argValue(name);
  if (raw === undefined) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main() {
  const command = process.argv[2] ?? "help";
  const catalog = getPlayerCatalog();
  const source = getRenderzSource();

  if (command === "sync") {
    const result = await syncIngestQueue(catalog, source);
    console.log(
      `sitemap=${result.sitemapEntries} discoveryJobs=${result.discovered} refreshJobs=${result.refreshes}`,
    );
    console.log(
      "Public sitemaps cover 10k player URLs; RenderZ claims 30k+. Missing ids stay undiscovered until they appear in a sitemap.",
    );
    return;
  }

  if (command === "run") {
    const limit = argNumber("--limit", 10);
    const result = await runIngestBatch(catalog, source, {
      limit,
      onProgress: (message) => console.log(message),
    });
    console.log(
      `processed=${result.processed} succeeded=${result.succeeded} skipped=${result.skipped} retried=${result.retried} failed=${result.failed}`,
    );
    return;
  }

  if (command === "apply-cutoff") {
    const fromId = argValue("--from-id", "24036792");
    if (!fromId) {
      console.error("apply-cutoff requires --from-id");
      process.exit(1);
    }
    const limit = argNumber("--limit", 15);
    const entries = await source.listSitemapEntries();
    const cutIndex = entries.findIndex((entry) => entry.id === fromId);
    if (cutIndex < 0) {
      console.error(`Cutoff id ${fromId} is not in the current sitemap`);
      process.exit(1);
    }
    const keep = entries.slice(0, cutIndex);
    const cut = entries.slice(cutIndex);
    const now = Date.now();
    const skippedJobs = await catalog.skipDiscoveryJobsByPlayerIds(
      cut,
      SKIP_REASON_TOO_OLD,
      now,
    );
    console.log(
      `cutoff=${fromId} index=${cutIndex} keep=${keep.length} cut=${cut.length} skippedJobs=${skippedJobs}`,
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
        limit,
        consecutiveOldStop: 0,
        onProgress: (message) => console.log(message),
      });
      totals.processed += result.processed;
      totals.succeeded += result.succeeded;
      totals.skipped += result.skipped;
      totals.retried += result.retried;
      totals.failed += result.failed;
      if (result.processed === 0) {
        break;
      }
      console.log(
        `batch processed=${result.processed} succeeded=${result.succeeded} skipped=${result.skipped} failed=${result.failed} runningTotal succeeded=${totals.succeeded}`,
      );
    }
    console.log(
      `done processed=${totals.processed} succeeded=${totals.succeeded} skipped=${totals.skipped} retried=${totals.retried} failed=${totals.failed}`,
    );
    return;
  }

  console.error(
    "Usage: npx tsx scripts/ingest.ts <sync|run|apply-cutoff> [--limit N] [--from-id ID]",
  );
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
