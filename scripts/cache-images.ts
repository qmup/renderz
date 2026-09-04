import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  closeImageCache,
  readCachedImage,
  sharedLoopCacheId,
  writeCachedImage,
} from "../src/lib/catalog/image-cache";
import { getPlayerCatalog } from "../src/lib/catalog/runtime";
import { fetchAllowlistedImage } from "../src/lib/providers/renderz/image-proxy";
import type { PlayerCatalog } from "../src/lib/catalog/repository";
import type { PlayerImageKind } from "../src/lib/domain/player";

const CONCURRENCY = 12;
const LISTING_KINDS = ["card", "background", "flag", "club"] as const;

type CacheTotals = {
  done: number;
  failed: number;
  skipped: number;
};

async function runJobs(
  catalog: PlayerCatalog,
  jobs: Array<{ id: string; kind: PlayerImageKind; url?: string }>,
): Promise<CacheTotals> {
  let done = 0;
  let failed = 0;
  let skipped = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < jobs.length) {
      const index = cursor;
      cursor += 1;
      const job = jobs[index];
      if (!job) {
        continue;
      }
      if (readCachedImage(job.id, job.kind)) {
        skipped += 1;
        done += 1;
        continue;
      }
      const existing =
        job.url !== undefined
          ? { upstreamUrl: job.url }
          : await catalog.getAsset(job.id, job.kind);
      if (!existing) {
        skipped += 1;
        done += 1;
        continue;
      }
      try {
        const image = await fetchAllowlistedImage(existing.upstreamUrl);
        writeCachedImage(job.id, job.kind, image.bytes);
      } catch {
        failed += 1;
      }
      done += 1;
      if (done % 100 === 0 || done === jobs.length) {
        console.log(
          `cached ${done}/${jobs.length} failed=${failed} skipped=${skipped}`,
        );
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return { done, failed, skipped };
}

export async function cacheListingImages(): Promise<CacheTotals> {
  const catalog = getPlayerCatalog();
  const index = await catalog.listPlayerIndex();
  const listingJobs: Array<{
    id: string;
    kind: (typeof LISTING_KINDS)[number];
  }> = [];
  for (const row of index) {
    for (const kind of LISTING_KINDS) {
      listingJobs.push({ id: row.id, kind });
    }
  }
  const listing = await runJobs(catalog, listingJobs);

  const loopSeen = new Set<string>();
  const loopJobs: Array<{ id: string; kind: PlayerImageKind; url: string }> = [];
  for (const asset of await catalog.listLoopAssets()) {
    const sharedId = sharedLoopCacheId(asset.upstreamUrl);
    if (!sharedId || loopSeen.has(sharedId)) {
      continue;
    }
    loopSeen.add(sharedId);
    loopJobs.push({
      id: sharedId,
      kind: asset.kind,
      url: asset.upstreamUrl,
    });
  }
  const loops = await runJobs(catalog, loopJobs);
  closeImageCache();
  console.log(
    `done listing cached=${listing.done} failed=${listing.failed} skipped=${listing.skipped}; loops cached=${loops.done} failed=${loops.failed} skipped=${loops.skipped}`,
  );
  return {
    done: listing.done + loops.done,
    failed: listing.failed + loops.failed,
    skipped: listing.skipped + loops.skipped,
  };
}

async function main() {
  await cacheListingImages();
}

function isExecutedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  try {
    return fileURLToPath(import.meta.url) === resolve(entry);
  } catch {
    return entry.replaceAll("\\", "/").endsWith("cache-images.ts");
  }
}

if (isExecutedDirectly()) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
