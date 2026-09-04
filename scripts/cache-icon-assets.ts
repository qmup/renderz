import { existsSync } from "node:fs";
import Database from "better-sqlite3";
import { writeCachedImage } from "../src/lib/catalog/image-cache";
import { fetchAllowlistedImage } from "../src/lib/providers/renderz/image-proxy";
import type { PlayerImageKind } from "../src/lib/domain/player";

async function main() {
  const catalogPath = existsSync("data/catalog.sqlite")
    ? "data/catalog.sqlite"
    : "data/catalog.snapshot.sqlite";
  const catalog = new Database(catalogPath, { readonly: true });
  const rows = catalog
    .prepare(
      `SELECT player_id AS playerId, kind, upstream_url AS url
       FROM player_assets
       WHERE kind LIKE 'playstyle%' OR kind LIKE 'trait%'
       GROUP BY kind`,
    )
    .all() as Array<{ playerId: string; kind: string; url: string }>;

  let ok = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const image = await fetchAllowlistedImage(row.url);
      writeCachedImage(row.playerId, row.kind as PlayerImageKind, image.bytes);
      ok += 1;
    } catch {
      failed += 1;
    }
  }
  catalog.close();
  console.log(`icons cached=${ok} failed=${failed} unique=${rows.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
