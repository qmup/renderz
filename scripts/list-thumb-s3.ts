import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import {
  LIST_THUMB_CACHE_CONTROL,
  LIST_THUMB_CONTENT_TYPE,
  encodeListThumb,
} from "../src/lib/catalog/list-thumb";
import { listThumbObjectKey } from "../src/lib/images";

const THUMB_CONCURRENCY = 6;

export async function objectExists(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    const name = error instanceof Error ? error.name : "";
    if (status === 404 || name === "NotFound" || name === "NoSuchKey") {
      return false;
    }
    throw error;
  }
}

async function readObject(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<Uint8Array> {
  const output = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (!output.Body) {
    throw new Error(`empty object ${key}`);
  }
  return output.Body.transformToByteArray();
}

/**
 * Upload the list WebP next to an existing card/background PNG.
 * Returns "skipped" when the key is not a list layer.
 */
export async function ensureListThumb(
  client: S3Client,
  bucket: string,
  pngKey: string,
  pngBytes?: Uint8Array,
): Promise<"uploaded" | "present" | "skipped"> {
  const thumbKey = listThumbObjectKey(pngKey);
  if (!thumbKey) {
    return "skipped";
  }
  if (await objectExists(client, bucket, thumbKey)) {
    return "present";
  }
  const source = pngBytes ?? (await readObject(client, bucket, pngKey));
  const webp = await encodeListThumb(source);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: thumbKey,
      Body: webp,
      ContentType: LIST_THUMB_CONTENT_TYPE,
      CacheControl: LIST_THUMB_CACHE_CONTROL,
    }),
  );
  return "uploaded";
}

export async function backfillMissingListThumbs(
  client: S3Client,
  bucket: string,
): Promise<{ uploaded: number; present: number; failed: number }> {
  const keys = new Set<string>();
  let token: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: "player-art/",
        ContinuationToken: token,
      }),
    );
    for (const item of page.Contents ?? []) {
      if (item.Key) {
        keys.add(item.Key);
      }
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);

  const missing: string[] = [];
  let sources = 0;
  for (const key of keys) {
    const thumbKey = listThumbObjectKey(key);
    if (!thumbKey) {
      continue;
    }
    sources += 1;
    if (!keys.has(thumbKey)) {
      missing.push(key);
    }
  }
  console.log(
    `list thumbs bucket=${bucket} sources=${sources} missing=${missing.length}`,
  );

  let uploaded = 0;
  let present = 0;
  let failed = 0;
  let cursor = 0;
  let done = 0;

  async function worker() {
    while (cursor < missing.length) {
      const index = cursor;
      cursor += 1;
      const key = missing[index];
      if (!key) {
        continue;
      }
      try {
        const outcome = await ensureListThumb(client, bucket, key);
        if (outcome === "uploaded") {
          uploaded += 1;
          console.log(`uploaded ${listThumbObjectKey(key)}`);
        } else if (outcome === "present") {
          present += 1;
        }
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`thumb failed ${key} ${message}`);
      }
      done += 1;
      if (done % 50 === 0 || done === missing.length) {
        console.log(
          `thumbs ${done}/${missing.length} uploaded=${uploaded} present=${present} failed=${failed}`,
        );
      }
    }
  }

  if (missing.length > 0) {
    await Promise.all(
      Array.from({ length: Math.min(THUMB_CONCURRENCY, missing.length) }, () =>
        worker(),
      ),
    );
  }
  return { uploaded, present, failed };
}
