/**
 * Re-enrich one player per missing LOOP sheet, then download into public/loops.
 *   npx tsx scripts/cache-missing-loops.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { closeCatalogDb } from '../src/db/index';
import { enrichDiscoveredPlayer } from '../src/lib/catalog/enrichment';
import {
  loopPublicFilePath,
  loopSheetFileName,
  sharedLoopCacheId,
} from '../src/lib/catalog/image-cache';
import { getPlayerCatalog } from '../src/lib/catalog/runtime';
import { fetchAllowlistedImage } from '../src/lib/providers/renderz/image-proxy';
import { looksLikeImage } from '../src/lib/providers/renderz/image-policy';
import { getRenderzSource } from '../src/lib/providers/renderz/renderz-source';
import { isExpiredImageError } from '../src/lib/providers/renderz/image-errors';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const catalog = getPlayerCatalog();
  const source = getRenderzSource();
  mkdirSync('public/loops', { recursive: true });

  const bySheet = new Map<
    string,
    { playerId: string; upstreamUrl: string; dest: string }
  >();

  for (const asset of await catalog.listLoopAssets()) {
    const dest = loopPublicFilePath(asset.upstreamUrl);
    const sheet = loopSheetFileName(asset.upstreamUrl);
    const sharedId = sharedLoopCacheId(asset.upstreamUrl);
    if (!dest || !sheet || !sharedId) {
      continue;
    }
    if (existsSync(dest) && looksLikeImage(new Uint8Array(readFileSync(dest)))) {
      continue;
    }
    if (!bySheet.has(sharedId)) {
      bySheet.set(sharedId, {
        playerId: asset.playerId,
        upstreamUrl: asset.upstreamUrl,
        dest,
      });
    }
  }

  console.log(`missing sheets: ${bySheet.size}`);
  let done = 0;
  let failed = 0;

  for (const [sharedId, job] of bySheet) {
    try {
      console.log(`enrich ${job.playerId} for ${sharedId}`);
      await enrichDiscoveredPlayer(catalog, source, job.playerId);
      await sleep(1100);
      const fresh = (await catalog.listLoopAssets()).find(
        (asset) => sharedLoopCacheId(asset.upstreamUrl) === sharedId,
      );
      const url = fresh?.upstreamUrl ?? job.upstreamUrl;
      console.log(`fetching ${sharedId}`);
      const image = await fetchAllowlistedImage(url);
      writeFileSync(job.dest, Buffer.from(image.bytes));
      console.log(`wrote ${job.dest} (${image.bytes.byteLength} bytes)`);
      done += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `failed ${sharedId}:`,
        message,
        isExpiredImageError(error) ? '(expired)' : '',
      );
      await sleep(1100);
    }
  }

  closeCatalogDb();
  console.log(`done fetched=${done} failed=${failed}`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
