/**
 * Fetch the public /players listing (50 rows) into SQLite, then enrich
 * those ids only. Respects RENDERZ_* limiter env vars (~1 req/s).
 */
import { getPlayerCatalog } from "../src/lib/catalog/runtime";
import { seedListingCatalog } from "../src/lib/catalog/seed";
import { getRenderzSource } from "../src/lib/providers/renderz/renderz-source";

async function main() {
  const summariesOnly = process.argv.includes("--summaries-only");
  const result = await seedListingCatalog(
    getPlayerCatalog(),
    getRenderzSource(),
    {
      enrich: !summariesOnly,
      onProgress: (message) => console.log(message),
    },
  );
  console.log(
    `done: discovered=${result.discovered} enriched=${result.enriched} skipped=${result.skipped} failed=${result.failed}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
