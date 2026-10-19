/**
 * Write card.thumb.webp and background.thumb.webp next to local player art.
 *
 *   npx tsx scripts/write-list-thumbs.ts
 *
 * Skips public/player-art/_shared. Re-encodes when the PNG is newer than the WebP.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { encodeListThumb } from "../src/lib/catalog/list-thumb";
import { SHARED_PLAYER_ART_DIR, listThumbFileName } from "../src/lib/images";

const LAYERS = ["background", "card"] as const;

async function main() {
  const root = path.join(process.cwd(), "public", "player-art");
  let written = 0;
  let skipped = 0;
  let dirs: string[] = [];
  try {
    dirs = readdirSync(root);
  } catch {
    console.log("list thumbs local root missing");
    return;
  }
  for (const dir of dirs) {
    if (dir === SHARED_PLAYER_ART_DIR) {
      continue;
    }
    const playerDir = path.join(root, dir);
    if (!statSync(playerDir).isDirectory()) {
      continue;
    }
    for (const kind of LAYERS) {
      const pngPath = path.join(playerDir, `${kind}.png`);
      const webpPath = path.join(playerDir, listThumbFileName(kind));
      let pngStat;
      try {
        pngStat = statSync(pngPath);
      } catch {
        continue;
      }
      try {
        const webpStat = statSync(webpPath);
        if (webpStat.mtimeMs >= pngStat.mtimeMs) {
          skipped += 1;
          continue;
        }
      } catch {
        // missing webp
      }
      const webp = await encodeListThumb(readFileSync(pngPath));
      writeFileSync(webpPath, webp);
      written += 1;
    }
  }
  console.log(`list thumbs local written=${written} skipped=${skipped}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
