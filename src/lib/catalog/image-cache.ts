import { copyFileSync, existsSync, mkdirSync } from "node:fs";
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

export function imageCacheSqlitePath(cwd = process.cwd()): string {
  return path.join(cwd, "data", "images.sqlite");
}

function writableCachePath(cwd = process.cwd()): string {
  const bundled = imageCacheSqlitePath(cwd);
  if (!process.env.VERCEL) {
    return bundled;
  }
  const dest = "/tmp/images.sqlite";
  if (existsSync(bundled) && !existsSync(dest)) {
    copyFileSync(bundled, dest);
  }
  return existsSync(dest) ? dest : bundled;
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
