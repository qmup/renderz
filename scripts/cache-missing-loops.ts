/**
 * Re-enrich one player per missing LOOP sheet, then download into public/loops.
 *
 *   npm run catalog:cache-missing-loops
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { closeCatalogDb } from '../src/db/index';
import { enrichDiscoveredPlayer } from '../src/lib/catalog/enrichment';
import {
  loopPublicFilePath,
  sharedLoopCacheId,
} from '../src/lib/catalog/image-cache';
import {
  assertLoopSheetsPresent,
  reportLoopSheets,
} from '../src/lib/catalog/loop-sheets';
import { getPlayerCatalog } from '../src/lib/catalog/runtime';
import { isExpiredImageError } from '../src/lib/providers/renderz/image-errors';
import { fetchAllowlistedImage } from '../src/lib/providers/renderz/image-proxy';
import { getRenderzSource } from '../src/lib/providers/renderz/renderz-source';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const catalog = getPlayerCatalog();
  const source = getRenderzSource();
  mkdirSync('public/loops', { recursive: true });

  const report = await reportLoopSheets(catalog);
  console.log(
    `LOOP sheets: ${report.present}/${report.total} present; missing=${report.missing.length}`,
  );

  let done = 0;
  let failed = 0;

  for (const sheet of report.missing) {
    const dest =
      loopPublicFilePath(sheet.upstreamUrl) ??
      `public/loops/${sheet.fileName}`;
    try {
      console.log(`enrich ${sheet.samplePlayerId} for ${sheet.sharedId}`);
      await enrichDiscoveredPlayer(catalog, source, sheet.samplePlayerId);
      await sleep(1100);
      const fresh = (await catalog.listLoopAssets()).find(
        (asset) => sharedLoopCacheId(asset.upstreamUrl) === sheet.sharedId,
      );
      const url = fresh?.upstreamUrl ?? sheet.upstreamUrl;
      console.log(`fetching ${sheet.sharedId}`);
      const image = await fetchAllowlistedImage(url);
      writeFileSync(dest, Buffer.from(image.bytes));
      console.log(`wrote ${dest} (${image.bytes.byteLength} bytes)`);
      done += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `failed ${sheet.sharedId}:`,
        message,
        isExpiredImageError(error) ? '(expired)' : '',
      );
      await sleep(1100);
    }
  }

  closeCatalogDb();
  console.log(`done fetched=${done} failed=${failed}`);

  const check = getPlayerCatalog();
  await assertLoopSheetsPresent(check);
  closeCatalogDb();
  console.log('All LOOP sheets present');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
