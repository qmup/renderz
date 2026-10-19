/**
 * Create missing list WebP thumbs for card.png and background.png already in S3.
 *
 *   npx tsx scripts/backfill-list-thumbs.ts
 *
 * Uses AWS_REGION (default ap-southeast-1) and S3_BUCKET (default renderz-bucket).
 * Existing PNG keys are left in place. Safe to re-run.
 */
import { S3Client } from "@aws-sdk/client-s3";
import { backfillMissingListThumbs } from "./list-thumb-s3";

async function main() {
  const bucket = process.env.S3_BUCKET?.trim() || "renderz-bucket";
  const region = process.env.AWS_REGION?.trim() || "ap-southeast-1";
  const client = new S3Client({ region });
  const result = await backfillMissingListThumbs(client, bucket);
  console.log(
    `list thumb backfill done uploaded=${result.uploaded} present=${result.present} failed=${result.failed}`,
  );
  if (result.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
