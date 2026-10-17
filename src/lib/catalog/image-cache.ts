import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { isSharedImageKind, type PlayerImageKind } from '@/lib/domain/player';
import { withImageCdn } from '@/lib/images';
import {
  looksLikeImage,
  sniffImageContentType,
} from '@/lib/providers/renderz/image-policy';

/** Cache key for a LOOP sprite shared across players with the same sheet. */
export function sharedLoopCacheId(upstreamUrl: string): string | undefined {
  try {
    const parsed = new URL(upstreamUrl);
    const name = parsed.pathname.replace(/^\//, '');
    return name ? `loop:${name}` : undefined;
  } catch {
    return undefined;
  }
}

export function loopSheetFileName(upstreamUrl: string): string | undefined {
  const sharedId = sharedLoopCacheId(upstreamUrl);
  if (!sharedId?.startsWith('loop:')) {
    return undefined;
  }
  return `${sharedId.slice('loop:'.length)}.png`;
}

/** Same-origin static path served by the CDN (not the serverless image cache). */
export function loopPublicSrc(upstreamUrl: string): string | undefined {
  const name = loopSheetFileName(upstreamUrl);
  return name ? withImageCdn(`/loops/${name}`) : undefined;
}

export function loopPublicFilePath(
  upstreamUrl: string,
  cwd = process.cwd(),
): string | undefined {
  const name = loopSheetFileName(upstreamUrl);
  return name ? path.join(cwd, 'public', 'loops', name) : undefined;
}

export function readLoopPublicFile(
  upstreamUrl: string,
  cwd = process.cwd(),
): { bytes: Uint8Array; contentType: string } | null {
  try {
    const filePath = loopPublicFilePath(upstreamUrl, cwd);
    if (!filePath || !existsSync(filePath)) {
      return null;
    }
    const bytes = new Uint8Array(readFileSync(filePath));
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

function cacheRoot(cwd?: string): string {
  if (cwd) {
    return path.join(cwd, 'data', 'image-cache');
  }
  if (process.env.VERCEL) {
    return '/tmp/image-cache';
  }
  return path.join(process.cwd(), 'data', 'image-cache');
}

function cacheFile(root: string, playerId: string, kind: string): string {
  return path.join(
    root,
    encodeURIComponent(playerId),
    `${encodeURIComponent(kind)}.png`,
  );
}

function readImageFile(
  filePath: string,
): { bytes: Uint8Array; contentType: string } | null {
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    const bytes = new Uint8Array(readFileSync(filePath));
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

function writeImageFile(filePath: string, bytes: Uint8Array): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, bytes);
}

export function readCachedImage(
  playerId: string,
  kind: PlayerImageKind,
  cwd?: string,
): { bytes: Uint8Array; contentType: string } | null {
  const root = cacheRoot(cwd);
  const own = readImageFile(cacheFile(root, playerId, kind));
  if (own) {
    return own;
  }
  if (!isSharedImageKind(kind)) {
    return null;
  }
  return readImageFile(cacheFile(root, '_shared', kind));
}

export function writeCachedImage(
  playerId: string,
  kind: PlayerImageKind,
  bytes: Uint8Array,
  cwd?: string,
): void {
  try {
    const root = cacheRoot(cwd);
    writeImageFile(cacheFile(root, playerId, kind), bytes);
    if (isSharedImageKind(kind)) {
      writeImageFile(cacheFile(root, '_shared', kind), bytes);
    }
  } catch {
    // Read-only deploy filesystem.
  }
}
