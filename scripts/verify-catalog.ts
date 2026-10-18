/**
 * Report catalog size. Older players stay; this command does not delete them.
 *
 *   npm run catalog:verify
 */
import { catalogIsVerifiedRecent, pruneOldPlayers } from "../src/lib/catalog/prune";
import { getPlayerCatalog } from "../src/lib/catalog/runtime";

async function main() {
  const catalog = getPlayerCatalog();
  const result = await pruneOldPlayers(catalog);
  console.log(
    `kept=${result.kept} pruned=${result.pruned} remaining=${result.remaining} invalid=${result.invalid}`,
  );
  if (!catalogIsVerifiedRecent(result)) {
    console.error("Catalog verify failed.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
