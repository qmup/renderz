import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  closeImageCache,
  loopPublicFilePath,
  readCachedImage,
  sharedLoopCacheId,
  writeCachedImage,
} from '../src/lib/catalog/image-cache';
import { getPlayerCatalog } from '../src/lib/catalog/runtime';
import { fetchAllowlistedImage } from '../src/lib/providers/renderz/image-proxy';
import { looksLikeImage } from '../src/lib/providers/renderz/image-policy';
import type { PlayerCatalog } from '../src/lib/catalog/repository';
import type { PlayerImageKind } from '../src/lib/domain/player';

const CONCURRENCY = 12;
const LISTING_KINDS = ['card', 'background', 'flag', 'club'] as const;

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

  mkdirSync(resolve('public/loops'), { recursive: true });
  const loopSeen = new Set<string>();
  let loopDone = 0;
  let loopFailed = 0;
  let loopSkipped = 0;
  const loopJobs: Array<{ url: string; dest: string }> = [];
  for (const asset of await catalog.listLoopAssets()) {
    const dest = loopPublicFilePath(asset.upstreamUrl);
    const sharedId = sharedLoopCacheId(asset.upstreamUrl);
    if (!dest || !sharedId || loopSeen.has(sharedId)) {
      continue;
    }
    loopSeen.add(sharedId);
    loopJobs.push({ url: asset.upstreamUrl, dest });
  }
  let loopCursor = 0;
  async function loopWorker() {
    while (loopCursor < loopJobs.length) {
      const index = loopCursor;
      loopCursor += 1;
      const job = loopJobs[index];
      if (!job) {
        continue;
      }
      if (
        existsSync(job.dest) &&
        looksLikeImage(new Uint8Array(readFileSync(job.dest)))
      ) {
        loopSkipped += 1;
        loopDone += 1;
        continue;
      }
      try {
        const image = await fetchAllowlistedImage(job.url);
        mkdirSync(resolve('public/loops'), { recursive: true });
        writeFileSync(job.dest, Buffer.from(image.bytes));
      } catch {
        loopFailed += 1;
      }
      loopDone += 1;
      if (loopDone % 20 === 0 || loopDone === loopJobs.length) {
        console.log(
          `loops ${loopDone}/${loopJobs.length} failed=${loopFailed} skipped=${loopSkipped}`,
        );
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => loopWorker()));
  closeImageCache();
  console.log(
    `done listing cached=${listing.done} failed=${listing.failed} skipped=${listing.skipped}; loops cached=${loopDone} failed=${loopFailed} skipped=${loopSkipped}`,
  );
  return {
    done: listing.done + loopDone,
    failed: listing.failed + loopFailed,
    skipped: listing.skipped + loopSkipped,
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
    return entry.replaceAll('\\', '/').endsWith('cache-images.ts');
  }
}

if (isExecutedDirectly()) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
