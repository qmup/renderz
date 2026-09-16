/**
 * Copy packed listing/detail image bytes from data/images.sqlite into
 * public/player-art so Next.js serves them as static CDN files.
 *
 *   npx tsx scripts/extract-player-art.ts
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { isSharedImageKind } from "../src/lib/domain/player";
import {
  imageCacheSqlitePath,
  isUsableImageCacheFile,
} from "../src/lib/catalog/image-cache";
import {
  playerArtPublicDir,
  playerArtPublicFileName,
  SHARED_PLAYER_ART_DIR,
} from "../src/lib/images";

export function extractPlayerArt(
  cwd = process.cwd(),
  options: { required?: boolean } = {},
): number {
  const sqlitePath = imageCacheSqlitePath(cwd);
  const outRoot = path.join(cwd, "public", "player-art");
  if (!isUsableImageCacheFile(sqlitePath)) {
    if (options.required) {
      throw new Error(
        `No usable image cache at ${sqlitePath}. Enable Git LFS on the Vercel project so data/images.sqlite is a real SQLite file at build.`,
      );
    }
    console.log(`No usable image cache at ${sqlitePath}; skipping extract`);
    return 0;
  }

  rmSync(outRoot, { recursive: true, force: true });
  const db = new Database(sqlitePath, { readonly: true });
  const rows = db
    .prepare("SELECT player_id, kind, bytes FROM images")
    .iterate() as Iterable<{ player_id: string; kind: string; bytes: Buffer }>;

  let packed = 0;
  const sharedRoot = path.join(outRoot, SHARED_PLAYER_ART_DIR);
  for (const row of rows) {
    const fileName = playerArtPublicFileName(row.kind);
    const dir = path.join(outRoot, playerArtPublicDir(row.player_id));
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, fileName), row.bytes);
    packed += 1;
    if (isSharedImageKind(row.kind)) {
      mkdirSync(sharedRoot, { recursive: true });
      writeFileSync(path.join(sharedRoot, fileName), row.bytes);
    }
  }
  db.close();
  console.log(`extracted ${packed} images into ${outRoot}`);
  if (options.required && packed === 0) {
    throw new Error(
      `extract-player-art wrote 0 files from ${sqlitePath}. The images table is empty.`,
    );
  }
  return packed;
}

async function main() {
  extractPlayerArt(process.cwd(), { required: Boolean(process.env.VERCEL) });
}

function isExecutedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  try {
    return fileURLToPath(import.meta.url) === path.resolve(entry);
  } catch {
    return entry.replaceAll("\\", "/").endsWith("extract-player-art.ts");
  }
}

if (isExecutedDirectly()) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
