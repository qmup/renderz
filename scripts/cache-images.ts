import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readCachedImage, writeCachedImage } from "../src/lib/catalog/image-cache";
import { getPlayerCatalog } from "../src/lib/catalog/runtime";
import { fetchAllowlistedImage } from "../src/lib/providers/renderz/image-proxy";

const CONCURRENCY = 12;
const LISTING_KINDS = ["card", "background", "flag", "club"] as const;

export async function cacheListingImages(): Promise<{
  done: number;
  failed: number;
  skipped: number;
}> {
  const catalog = getPlayerCatalog();
  const index = await catalog.listPlayerIndex();
  const jobs: Array<{
    id: string;
    kind: (typeof LISTING_KINDS)[number];
  }> = [];
  for (const row of index) {
    for (const kind of LISTING_KINDS) {
      jobs.push({ id: row.id, kind });
    }
  }

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
      const existing = await catalog.getAsset(job.id, job.kind);
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
  console.log(`done cached=${done} failed=${failed} skipped=${skipped}`);
  return { done, failed, skipped };
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
