/**
 * Keep only players whose upstream `added` date is within 3 months.
 * Older rows (and rows with no addedAt) are removed.
 *
 *   npm run catalog:verify
 */
import { catalogIsVerifiedRecent, pruneOldPlayers } from "../src/lib/catalog/prune";
import { getPlayerCatalog } from "../src/lib/catalog/runtime";

async function main() {
  const catalog = getPlayerCatalog();
  const result = await pruneOldPlayers(catalog, {
    onProgress: (message) => console.log(message),
  });
  console.log(
    `kept=${result.kept} pruned=${result.pruned} remaining=${result.remaining} invalid=${result.invalid}`,
  );
  if (!catalogIsVerifiedRecent(result) || result.invalid > 0) {
    console.error(
      "Catalog still has players older than 3 months or missing addedAt.",
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
