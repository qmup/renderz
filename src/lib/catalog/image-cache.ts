import {
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readSync,
  closeSync,
  statSync,
} from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { isSharedImageKind, type PlayerImageKind } from "@/lib/domain/player";
import { looksLikeImage, sniffImageContentType } from "@/lib/providers/renderz/image-policy";

const CREATE_SQL = `CREATE TABLE IF NOT EXISTS images (
  player_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  bytes BLOB NOT NULL,
  PRIMARY KEY (player_id, kind)
)`;

const SQLITE_MAGIC = Buffer.from("SQLite format 3\0");
const LFS_POINTER_PREFIX = Buffer.from("version https://git-lfs.github.com/spec/v1");

/** Cache key for a LOOP sprite shared across players with the same sheet. */
export function sharedLoopCacheId(upstreamUrl: string): string | undefined {
  try {
    const parsed = new URL(upstreamUrl);
    const name = parsed.pathname.replace(/^\//, "");
    return name ? `loop:${name}` : undefined;
  } catch {
    return undefined;
  }
}

export function imageCacheSqlitePath(cwd = process.cwd()): string {
  return path.join(cwd, "data", "images.sqlite");
}

/** True when the file is a real SQLite DB (not a Git LFS pointer or missing). */
export function isUsableImageCacheFile(filePath: string): boolean {
  try {
    if (!existsSync(filePath)) {
      return false;
    }
    const fd = openSync(filePath, "r");
    try {
      const header = Buffer.alloc(64);
      const n = readSync(fd, header, 0, header.length, 0);
      if (n < SQLITE_MAGIC.length) {
        return false;
      }
      if (header.subarray(0, LFS_POINTER_PREFIX.length).equals(LFS_POINTER_PREFIX)) {
        return false;
      }
      return header.subarray(0, SQLITE_MAGIC.length).equals(SQLITE_MAGIC);
    } finally {
      closeSync(fd);
    }
  } catch {
    return false;
  }
}

function fileSize(filePath: string): number {
  try {
    return existsSync(filePath) ? statSync(filePath).size : 0;
  } catch {
    return 0;
  }
}

function writableCachePath(cwd = process.cwd()): string {
  const bundled = imageCacheSqlitePath(cwd);
  if (!process.env.VERCEL) {
    return bundled;
  }
  const dest = "/tmp/images.sqlite";
  // Prefer the bundled LFS DB when it is usable and larger than a stale
  // /tmp copy (e.g. empty schema created before Git LFS was enabled).
  if (
    isUsableImageCacheFile(bundled) &&
    (!isUsableImageCacheFile(dest) || fileSize(bundled) > fileSize(dest))
  ) {
    copyFileSync(bundled, dest);
  }
  return isUsableImageCacheFile(dest) ? dest : bundled;
}

const cacheDbs = new Map<string, Database.Database>();

function getCacheDb(cwd?: string): Database.Database {
  const filePath = writableCachePath(cwd);
  const existing = cacheDbs.get(filePath);
  if (existing) {
    return existing;
  }
  mkdirSync(path.dirname(filePath), { recursive: true });
  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(CREATE_SQL);
  cacheDbs.set(filePath, sqlite);
  return sqlite;
}

export function readCachedImage(
  playerId: string,
  kind: PlayerImageKind,
  cwd?: string,
): { bytes: Uint8Array; contentType: string } | null {
  try {
    const row = getCacheDb(cwd)
      .prepare("SELECT bytes FROM images WHERE player_id = ? AND kind = ?")
      .get(playerId, kind) as { bytes: Buffer } | undefined;
    if (row?.bytes) {
      const bytes = new Uint8Array(row.bytes);
      if (!looksLikeImage(bytes)) {
        return null;
      }
      return {
        bytes,
        contentType: sniffImageContentType(null, bytes),
      };
    }
    if (!isSharedImageKind(kind)) {
      return null;
    }
    const shared = getCacheDb(cwd)
      .prepare("SELECT bytes FROM images WHERE kind = ? LIMIT 1")
      .get(kind) as { bytes: Buffer } | undefined;
    if (!shared?.bytes) {
      return null;
    }
    const bytes = new Uint8Array(shared.bytes);
    if (!looksLikeImage(bytes)) {
      return null;
    }
    return {
      bytes,
      contentType: sniffImageContentType(null, bytes),
    };
  } catch {
    return null;
  }
}

export function writeCachedImage(
  playerId: string,
  kind: PlayerImageKind,
  bytes: Uint8Array,
  cwd?: string,
): void {
  try {
    getCacheDb(cwd)
      .prepare(
        "INSERT OR REPLACE INTO images (player_id, kind, bytes) VALUES (?, ?, ?)",
      )
      .run(playerId, kind, Buffer.from(bytes));
  } catch {
    // Read-only deploy filesystem.
  }
}

export function closeImageCache(): void {
  for (const [filePath, sqlite] of cacheDbs) {
    try {
      sqlite.pragma("wal_checkpoint(TRUNCATE)");
      sqlite.close();
    } catch {
      // Ignore close errors during shutdown.
    }
    cacheDbs.delete(filePath);
  }
}
