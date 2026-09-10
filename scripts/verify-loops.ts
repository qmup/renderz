/**
 * Fail when the catalog references LOOP sheets that are not in public/loops.
 *
 *   npm run catalog:verify-loops
 *
 * Used by Vercel build and CI so new card designs cannot ship without animation sprites.
 */
import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { closeCatalogDb } from '../src/db/index';
import { assertLoopSheetsPresent } from '../src/lib/catalog/loop-sheets';
import { getPlayerCatalog } from '../src/lib/catalog/runtime';

const CATALOG_PATH = path.join(process.cwd(), 'data', 'catalog.sqlite');
const SNAPSHOT_PATH = path.join(
  process.cwd(),
  'data',
  'catalog.snapshot.sqlite',
);

async function main() {
  if (!existsSync(CATALOG_PATH)) {
    if (!existsSync(SNAPSHOT_PATH)) {
      throw new Error(
        'Missing data/catalog.sqlite and data/catalog.snapshot.sqlite',
      );
    }
    copyFileSync(SNAPSHOT_PATH, CATALOG_PATH);
  }

  const catalog = getPlayerCatalog();
  const report = await assertLoopSheetsPresent(catalog);
  closeCatalogDb();
  console.log(
    `LOOP sheets ok: ${report.present}/${report.total} present in public/loops`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
