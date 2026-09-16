/**
 * Upload data/images.sqlite to the private Vercel Blob store.
 *
 *   npx tsx scripts/upload-image-cache.ts
 *
 * Loads .env.local (BLOB_READ_WRITE_TOKEN). GitHub Actions sets the token
 * from repository secrets instead.
 */
import { loadEnvConfig } from "@next/env";
import { imageCacheSqlitePath, isUsableImageCacheFile } from "../src/lib/catalog/image-cache";
import { uploadImageCacheToBlob } from "../src/lib/catalog/image-cache-blob";

loadEnvConfig(process.cwd());

export async function uploadPackedImageCache(
  filePath = imageCacheSqlitePath(),
): Promise<{ pathname: string; etag: string }> {
  if (!isUsableImageCacheFile(filePath)) {
    throw new Error(`Image cache is missing or not a SQLite file: ${filePath}`);
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    throw new Error(
      "Missing BLOB_READ_WRITE_TOKEN (or BLOB_STORE_ID + VERCEL_OIDC_TOKEN). Pull with `npx vercel env pull .env.local --yes` or set the GitHub secret.",
    );
  }
  const result = await uploadImageCacheToBlob(filePath);
  console.log(
    `Uploaded image cache to Blob pathname=${result.pathname} etag=${result.etag}`,
  );
  return result;
}

async function main() {
  await uploadPackedImageCache();
}

function isExecutedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return entry.replaceAll("\\", "/").endsWith("upload-image-cache.ts");
}

if (isExecutedDirectly()) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
