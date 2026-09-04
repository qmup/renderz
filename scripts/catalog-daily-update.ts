/**
 * Daily production pack: discovery-only catalog update (same as Update catalog
 * button), then refresh listing + unique LOOP sprites into data/images.sqlite.
 *
 *   npx tsx scripts/catalog-daily-update.ts
 *   npx tsx scripts/catalog-daily-update.ts --skip-images
 */
import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { closeCatalogDb } from '../src/db/index';
import { cacheListingImages } from './cache-images';
import { runCatalogUpdate } from '../src/lib/catalog/update';
import { getPlayerCatalog } from '../src/lib/catalog/runtime';
import { getRenderzSource } from '../src/lib/providers/renderz/renderz-source';

const CATALOG_PATH = path.join(process.cwd(), 'data', 'catalog.sqlite');
const SNAPSHOT_PATH = path.join(
  process.cwd(),
  'data',
  'catalog.snapshot.sqlite',
);

async function main() {
  const skipImages = process.argv.includes('--skip-images');

  if (!existsSync(CATALOG_PATH)) {
    if (!existsSync(SNAPSHOT_PATH)) {
      throw new Error(
        'Missing data/catalog.sqlite and data/catalog.snapshot.sqlite',
      );
    }
    copyFileSync(SNAPSHOT_PATH, CATALOG_PATH);
    console.log('Seeded data/catalog.sqlite from catalog.snapshot.sqlite');
  }

  const catalog = getPlayerCatalog();
  const status = await runCatalogUpdate(catalog, getRenderzSource());
  console.log(
    `catalog update: phase=${status.phase} discovered=${status.discovered} succeeded=${status.succeeded} failed=${status.failed} message=${status.message ?? ''}`,
  );
  if (status.phase === 'error') {
    throw new Error(status.error ?? status.message ?? 'Catalog update failed');
  }

  closeCatalogDb();
  copyFileSync(CATALOG_PATH, SNAPSHOT_PATH);
  console.log('Wrote data/catalog.snapshot.sqlite');

  if (skipImages) {
    console.log('Skipped image cache (--skip-images)');
    return;
  }

  await cacheListingImages();
  closeCatalogDb();
  console.log('Updated data/images.sqlite');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
