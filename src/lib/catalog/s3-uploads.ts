import { createHash } from "node:crypto";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { CatalogUploadJob } from "@/lib/catalog/object-keys";
import { isExpiredImageError } from "@/lib/providers/renderz/image-errors";
import { fetchAllowlistedImage } from "@/lib/providers/renderz/image-proxy";

const IMAGE_CONCURRENCY = 4;
export const CATALOG_OBJECT_CACHE_CONTROL = "public, max-age=31536000, immutable";

export type CatalogUploadResult = {
  uploaded: number;
  present: number;
  failed: number;
  requiredFailed: number;
};

/** Unquoted ETag, or undefined when the object is missing. */
async function objectETag(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<string | undefined> {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return head.ETag?.replaceAll('"', "") ?? "";
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    const name = error instanceof Error ? error.name : "";
    if (status === 404 || name === "NotFound" || name === "NoSuchKey") {
      return undefined;
    }
    throw error;
  }
}

export async function objectExists(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<boolean> {
  return (await objectETag(client, bucket, key)) !== undefined;
}

/** ETag of a single-part PUT with SSE-S3 is the MD5 of the body. */
function md5Hex(bytes: Uint8Array): string {
  return createHash("md5").update(bytes).digest("hex");
}

/**
 * Upload objects that are missing. A `replace` job is re-fetched and written
 * when its bytes differ from the stored object.
 */
export async function uploadCatalogObjects(
  client: S3Client,
  bucket: string,
  jobs: CatalogUploadJob[],
): Promise<CatalogUploadResult> {
  let uploaded = 0;
  let present = 0;
  let unchanged = 0;
  let failed = 0;
  let requiredFailed = 0;
  let cursor = 0;
  let done = 0;

  async function worker() {
    while (cursor < jobs.length) {
      const index = cursor;
      cursor += 1;
      const job = jobs[index];
      if (!job) {
        continue;
      }
      try {
        const etag = await objectETag(client, bucket, job.key);
        const image =
          etag !== undefined && !job.replace
            ? undefined
            : await fetchAllowlistedImage(job.upstreamUrl);
        if (!image) {
          present += 1;
        } else if (etag !== undefined && etag === md5Hex(image.bytes)) {
          unchanged += 1;
        } else {
          await client.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: job.key,
              Body: image.bytes,
              ContentType: image.contentType || "image/png",
              CacheControl: CATALOG_OBJECT_CACHE_CONTROL,
            }),
          );
          uploaded += 1;
          console.log(`uploaded ${job.key}`);
        }
      } catch (error) {
        failed += 1;
        if (job.required) {
          requiredFailed += 1;
        }
        const message = error instanceof Error ? error.message : String(error);
        const expired = isExpiredImageError(error) ? " expired-signature" : "";
        console.error(`image failed${expired} required=${job.required} ${job.key} ${message}`);
      }
      done += 1;
      if (done % 50 === 0 || done === jobs.length) {
        console.log(
          `images ${done}/${jobs.length} uploaded=${uploaded} present=${present} unchanged=${unchanged} failed=${failed}`,
        );
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(IMAGE_CONCURRENCY, jobs.length) }, () => worker()),
  );
  return { uploaded, present, failed, requiredFailed };
}
