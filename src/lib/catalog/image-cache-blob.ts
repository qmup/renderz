import {
  createWriteStream,
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { get, put } from '@vercel/blob';

/** Stable private pathname. Overwritten in place by the daily pack. */
export const IMAGE_CACHE_BLOB_PATHNAME = 'catalog/images.sqlite';

export const VERCEL_IMAGE_CACHE_PATH = '/tmp/images.sqlite';

export type ImageCacheBlobDownloadResult = 'updated' | 'unchanged' | 'missing';

export async function uploadImageCacheToBlob(
  filePath: string,
): Promise<{ pathname: string; etag: string }> {
  const blob = await put(IMAGE_CACHE_BLOB_PATHNAME, readFileSync(filePath), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    multipart: true,
    contentType: 'application/vnd.sqlite3',
    cacheControlMaxAge: 60,
  });
  return { pathname: blob.pathname, etag: blob.etag };
}

export async function downloadImageCacheFromBlob(
  destPath = VERCEL_IMAGE_CACHE_PATH,
): Promise<ImageCacheBlobDownloadResult> {
  const etagPath = `${destPath}.etag`;
  const previousEtag =
    existsSync(etagPath) && existsSync(destPath)
      ? readFileSync(etagPath, 'utf8').trim()
      : undefined;

  const result = await get(IMAGE_CACHE_BLOB_PATHNAME, {
    access: 'private',
    ifNoneMatch: previousEtag,
    useCache: false,
  });

  if (!result) {
    return 'missing';
  }
  if (result.statusCode === 304) {
    return existsSync(destPath) ? 'unchanged' : 'missing';
  }
  if (!result.stream) {
    return 'missing';
  }

  const tmpPath = `${destPath}.download`;
  await pipeline(
    Readable.fromWeb(
      result.stream as unknown as import('node:stream/web').ReadableStream,
    ),
    createWriteStream(tmpPath),
  );
  renameSync(tmpPath, destPath);
  writeFileSync(etagPath, result.blob.etag);
  return 'updated';
}
